#!/usr/bin/env python3
"""
ALPHIX V2 — Scraping annuaire enseignants UB (autonome, poli, rejouable).

Parcourt https://www.ub.edu.bi/Publication/index :
  index -> cartes facultés (.faculty-card a.faculty-link)
  affichage/{id}[?page=N] -> cartes enseignants (.author-card : .author-name + .author-btn)
  syllabus_article/{id} -> faculté, email, syllabus (📘), articles (📄)

Sortie : backend/database/data/teachers_scraped.json
  [{name, profile_url, faculty, faculty_url, email, courses[], articles[]}]

Usage :
  python3 automation/scrape_ub_teachers.py [--faculty-ids 2] [--max-teachers 0]
      [--delay 0.6] [--timeout 25] [--output backend/database/data/teachers_scraped.json]

Robustesse : retries exponentiels, timeouts, deduplication par profile_url,
sauvegarde incrémentale (reprendre après coupure), user-agent identifié.
"""

import argparse
import html
import json
import re
import sys
import time
import unicodedata
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup

BASE = "https://www.ub.edu.bi"
INDEX_URL = f"{BASE}/Publication/index"
HEADERS = {
    "User-Agent": "ALPHIX Univ-Burundi academic indexer (contact: info@alphix.bi)",
    "Accept": "text/html,application/xhtml+xml",
    "Accept-Language": "fr-FR,fr;q=0.9",
}


def clean(text: str) -> str:
    text = html.unescape(text or "")
    text = unicodedata.normalize("NFC", text)
    text = re.sub(r"\s+", " ", text).strip()
    return text


def get(session: requests.Session, url: str, timeout: int, tries: int = 3):
    last = None
    for attempt in range(tries):
        try:
            resp = session.get(url, timeout=timeout)
            if resp.status_code == 200 and resp.text:
                # Fait confiance au charset déclaré (UTF-8) ; apparent_encoding
                # devine souvent faux (ex. MacRoman -> mojibake).
                enc = (resp.encoding or "").lower()
                if not enc or enc in ("iso-8859-1", "latin-1", "ascii"):
                    resp.encoding = "utf-8"
                return resp.text
            last = f"HTTP {resp.status_code}"
        except requests.RequestException as exc:  # réseau / timeout
            last = str(exc)
        time.sleep(min(2 ** attempt, 8))
    print(f"  ! échec {url} ({last})", file=sys.stderr)
    return None


def scrape_faculties(session, timeout) -> list:
    page = get(session, INDEX_URL, timeout)
    if not page:
        return []
    soup = BeautifulSoup(page, "html.parser")
    out = []
    for a in soup.select(".faculty-card a.faculty-link"):
        name = clean(a.get_text())
        href = urljoin(BASE, a.get("href", ""))
        if name and href:
            out.append({"name": name, "url": href})
    return out


def scrape_faculty_teachers(session, faculty: dict, timeout, delay,
                            max_teachers: int) -> list:
    """Toutes les pages ?page=N d'une faculté (arrêt si page sans cartes)."""
    teachers, seen, page_num = [], set(), 1
    while True:
        url = faculty["url"] if page_num == 1 else f"{faculty['url']}?page={page_num}"
        page = get(session, url, timeout)
        if not page:
            break
        soup = BeautifulSoup(page, "html.parser")
        cards = soup.select(".author-card")
        if not cards:
            break
        for card in cards:
            name_el = card.select_one(".author-name")
            link_el = card.select_one("a.author-btn")
            name = clean(name_el.get_text()) if name_el else ""
            href = urljoin(BASE, link_el.get("href", "")) if link_el else ""
            if not name or not href or href in seen:
                continue
            seen.add(href)
            teachers.append({"name": name, "profile_url": href,
                             "faculty": faculty["name"], "faculty_url": faculty["url"]})
            if 0 < max_teachers <= len(teachers):
                return teachers
        # pagination : lien "Suivant" présent ?
        nxt = soup.select_one(".pagination_controls")
        has_next = nxt and re.search(r"Suivant|page=%d" % (page_num + 1),
                                     nxt.decode_contents() or "")
        page_num += 1
        if not has_next:
            # prudence : une page vide suivante confirmera la fin
            extra = get(session, f"{faculty['url']}?page={page_num}", timeout)
            if not extra or not BeautifulSoup(extra, "html.parser").select(".author-card"):
                break
        time.sleep(delay)
    return teachers


def scrape_profile(session, teacher: dict, timeout) -> dict:
    page = get(session, teacher["profile_url"], timeout)
    data = {"email": None, "profile_faculty": None, "courses": [], "articles": []}
    if not page:
        return data
    soup = BeautifulSoup(page, "html.parser")
    main = soup.select_one("#tm-content") or soup
    lines = [clean(x) for x in main.get_text("\n").split("\n")]
    lines = [x for x in lines if x]

    def value_after(label: str):
        for i, line in enumerate(lines):
            if re.fullmatch(label + r"\s*:", line):
                for nxt in lines[i + 1:]:
                    if nxt and not re.fullmatch(r"[^\w\s]+", nxt):
                        return nxt
        return None

    fac = value_after("Faculté")
    if fac and "universit" not in fac.lower():
        data["profile_faculty"] = fac
    mail = value_after("Email")
    if mail and "@" in mail and "info@" not in mail:
        data["email"] = mail

    # Onglet syllabus : liens directs vers les PDF (titre + url).
    for a in soup.select('#syllabus a[href*="/PDF/"]'):
        title = clean(a.get_text())
        title = re.sub(r"^[📘\s]*", "", title)
        title = re.sub(r"^Syllabus\s+", "", title, flags=re.I)
        title = re.sub(r"📅.*$", "", title).strip()
        pdf = urljoin(BASE, a.get("href", ""))
        if title and not any(c["title"] == title for c in data["courses"]):
            data["courses"].append({"title": title, "pdf_url": pdf})

    # Onglet articles : liens DOI ou texte seul.
    for a in soup.select("#articles a"):
        href = clean(a.get("href", ""))
        title = clean(a.get_text())
        title = re.sub(r"^[📄\s]*", "", title)
        title = re.sub(r"📅.*$", "", title).strip()
        if len(title) < 12:
            continue
        entry = {"title": title[:300]}
        if href and href != "#":
            entry["url"] = href
        if not any(x["title"] == entry["title"] for x in data["articles"]):
            data["articles"].append(entry)
    return data


def main() -> int:
    ap = argparse.ArgumentParser(description="Scrape annuaire enseignants UB.")
    ap.add_argument("--faculty-ids", default="",
                    help="IDs affichage à traiter (ex. '2,5'), vide = toutes")
    ap.add_argument("--max-teachers", type=int, default=0,
                    help="Plafond d'enseignants par faculté (0 = tous)")
    ap.add_argument("--delay", type=float, default=0.6, help="Pause entre requêtes (s)")
    ap.add_argument("--timeout", type=int, default=25)
    ap.add_argument("--output",
                    default="backend/database/data/teachers_scraped.json")
    args = ap.parse_args()

    out_path = Path(args.output)
    if not out_path.is_absolute():
        out_path = Path(__file__).resolve().parent.parent / out_path
    out_path.parent.mkdir(parents=True, exist_ok=True)

    session = requests.Session()
    session.headers.update(HEADERS)

    faculties = scrape_faculties(session, args.timeout)
    print(f"Facultés détectées : {len(faculties)}")
    wanted = {f.strip() for f in args.faculty_ids.split(",") if f.strip()}
    if wanted:
        faculties = [f for f in faculties
                     if re.search(r"/(\d+)(?:\?.*)?$", f["url"])
                     and re.search(r"/(\d+)(?:\?.*)?$", f["url"]).group(1) in wanted]
        print(f"Facultés filtrées : {len(faculties)}")

    results, total_profiles = [], 0
    try:
        for fac in faculties:
            print(f"[{fac['name']}] {fac['url']}")
            teachers = scrape_faculty_teachers(session, fac, args.timeout,
                                               args.delay, args.max_teachers)
            print(f"  -> {len(teachers)} enseignant(s)")
            for t in teachers:
                detail = scrape_profile(session, t, args.timeout)
                t.update(detail)
                results.append(t)
                total_profiles += 1
                time.sleep(args.delay)
            # sauvegarde incrémentale après chaque faculté
            out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2),
                                encoding="utf-8")
    except KeyboardInterrupt:
        print("\nInterruption : sauvegarde partielle conservée.", file=sys.stderr)
    out_path.write_text(json.dumps(results, ensure_ascii=False, indent=2),
                        encoding="utf-8")
    print(f"OK : {len(results)} enseignants ({total_profiles} profils) -> {out_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
