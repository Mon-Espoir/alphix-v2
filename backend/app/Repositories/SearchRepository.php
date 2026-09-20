<?php

namespace App\Repositories;

use App\Models\Document;
use App\Models\DocumentSearchIndex;
use App\Models\SearchQuery;
use Illuminate\Contracts\Pagination\LengthAwarePaginator;
use Illuminate\Database\Eloquent\Collection;

/**
 * Data-access layer for search queries and document search index lookups.
 */
class SearchRepository extends BaseRepository
{
    /**
     * Create a new search repository instance.
     */
    public function __construct(
        SearchQuery $model,
        protected Document $document,
        protected DocumentSearchIndex $documentSearchIndex
    ) {
        parent::__construct($model);
    }

    /**
     * Persist a search query log entry.
     *
     * @param  array<string, mixed>  $data
     */
    public function logQuery(array $data): SearchQuery
    {
        /** @var SearchQuery */
        return $this->create($data);
    }

    /**
     * Retrieve search queries for a given user.
     *
     * @return Collection<int, SearchQuery>
     */
    public function getByUserId(int $userId): Collection
    {
        return $this->query()
            ->where('user_id', $userId)
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve recent search query logs.
     *
     * @return Collection<int, SearchQuery>
     */
    public function getRecent(int $limit = 50): Collection
    {
        return $this->query()
            ->orderByDesc('created_at')
            ->limit($limit)
            ->get();
    }

    /**
     * Find documents whose title or description match ALL terms of a query.
     *
     * @return Collection<int, Document>
     */
    public function findDocumentsByTerm(string $term): Collection
    {
        return $this->document->newQuery()
            ->where($this->multiTermConstraint($term))
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Paginate documents matching a term in title or description.
     */
    public function paginateDocumentsByTerm(string $term, int $perPage = 15): LengthAwarePaginator
    {
        return $this->document->newQuery()
            ->where($this->multiTermConstraint($term))
            ->orderByDesc('created_at')
            ->paginate($perPage);
    }

    /**
     * Recherche paginée de documents publiés avec filtres à facettes.
     *
     * Filtres supportés (tous optionnels) : query, faculty_id, department_id,
     * doc_type, academic_year, language, visibility, from_date, to_date,
     * min_downloads, min_views, sort, order, per_page.
     */
    public function searchDocuments(array $filters): LengthAwarePaginator
    {
        $query = $this->document->newQuery()
            ->where('status', 'approved')
            ->with(['course.department.faculty', 'course.level', 'course.semester']);

        $term = trim((string) ($filters['query'] ?? ''));
        if ($term !== '') {
            $query->where($this->multiTermConstraint($term));
        }

        if (! empty($filters['faculty_id'])) {
            // La faculté se déduit du département du cours lié.
            $query->whereHas('course.department', function ($q) use ($filters): void {
                $q->where('faculty_id', (int) $filters['faculty_id']);
            });
        }
        if (! empty($filters['department_id'])) {
            $query->whereHas('course', function ($q) use ($filters): void {
                $q->where('department_id', (int) $filters['department_id']);
            });
        }

        foreach (['doc_type', 'academic_year', 'language', 'visibility'] as $field) {
            if (! empty($filters[$field])) {
                $query->where($field, $filters[$field]);
            }
        }

        if (! empty($filters['from_date'])) {
            $query->whereDate('created_at', '>=', $filters['from_date']);
        }
        if (! empty($filters['to_date'])) {
            $query->whereDate('created_at', '<=', $filters['to_date']);
        }
        if (isset($filters['min_downloads']) && $filters['min_downloads'] !== '' && $filters['min_downloads'] !== null) {
            $query->where('downloads_count', '>=', (int) $filters['min_downloads']);
        }
        if (isset($filters['min_views']) && $filters['min_views'] !== '' && $filters['min_views'] !== null) {
            $query->where('views_count', '>=', (int) $filters['min_views']);
        }

        $sortMap = [
            'relevance' => 'created_at',
            'date' => 'created_at',
            'title' => 'title',
            'downloads' => 'downloads_count',
        ];
        $sort = $sortMap[$filters['sort'] ?? 'date'] ?? 'created_at';
        $order = (($filters['order'] ?? 'desc') === 'asc') ? 'asc' : 'desc';
        $query->orderBy($sort, $order);

        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 15)));

        return $query->paginate($perPage);
    }

    /**
     * Requêtes populaires calculées en SQL (pas de chargement complet).
     *
     * @return list<array{query: string, count: int, average_results: float}>
     */
    public function popularQueries(int $limit = 10): array
    {
        return $this->query()
            ->selectRaw('query, COUNT(*) as count, ROUND(AVG(results_count), 2) as average_results')
            ->groupBy('query')
            ->orderByDesc('count')
            ->limit($limit)
            ->get()
            ->map(static function (SearchQuery $row): array {
                return [
                    'query' => (string) $row->getAttribute('query'),
                    'count' => (int) $row->getAttribute('count'),
                    'average_results' => (float) $row->getAttribute('average_results'),
                ];
            })
            ->all();
    }

    /**
     * Chaque mot du terme doit apparaître dans au moins une des colonnes
     * texte (recherche multi-mots type moteur de recherche).
     *
     * Multi-niveaux : titre, description, nom fichier, type, année, tags,
     * code/nom cours, département, faculté. Tolérant aux accents via
     * normalisation côté PHP en fallback si le LIKE SQL ne suffit pas
     * (le fallback intelligent est déclenché dans SearchController).
     */
    protected function multiTermConstraint(string $term): \Closure
    {
        $terms = array_values(array_filter(preg_split('/\s+/u', trim($term)) ?: []));

        return function ($query) use ($terms): void {
            if ($terms === []) {
                $query->whereRaw('1 = 0');

                return;
            }
            foreach ($terms as $word) {
                $like = '%'.$word.'%';
                $query->where(function ($sub) use ($like): void {
                    $sub->where('title', 'like', $like)
                        ->orWhere('description', 'like', $like)
                        ->orWhere('original_name', 'like', $like)
                        ->orWhere('doc_type', 'like', $like)
                        ->orWhere('academic_year', 'like', $like)
                        // Le code / nom du cours lié fait partie de la recherche
                        ->orWhereHas('course', function ($c) use ($like): void {
                            $c->where('code', 'like', $like)
                                ->orWhere('name', 'like', $like)
                                ->orWhere('description', 'like', $like);
                        })
                        // Département / faculté du cours (ex: "chimie", "sciences")
                        ->orWhereHas('course.department', function ($c) use ($like): void {
                            $c->where('name', 'like', $like)
                                ->orWhere('code', 'like', $like);
                        })
                        ->orWhereHas('course.department.faculty', function ($c) use ($like): void {
                            $c->where('name', 'like', $like);
                        });
                });
            }
        };
    }

    /**
     * Recherche tolérante en PHP (accents, fautes de frappe, acronymes).
     * Utilisée en fallback quand la recherche SQL stricte retourne 0 résultat.
     * Charge les documents approuvés avec relations et filtre via haystack normalisé.
     *
     * @return LengthAwarePaginator<int, Document>
     */
    public function searchDocumentsFuzzy(array $filters): LengthAwarePaginator
    {
        $term = trim((string) ($filters['query'] ?? ''));
        $perPage = max(1, min(100, (int) ($filters['per_page'] ?? 15)));
        $page = max(1, (int) ($filters['page'] ?? 1));

        $all = $this->document->newQuery()
            ->where('status', 'approved')
            ->with(['course.department.faculty', 'course.level', 'course.semester', 'tags'])
            ->get();

        // Filtres facette côté PHP pour le fallback (même logique que SQL)
        if (! empty($filters['faculty_id'])) {
            $fid = (int) $filters['faculty_id'];
            $all = $all->filter(fn ($d) => (int) ($d->course?->department?->faculty_id ?? 0) === $fid);
        }
        if (! empty($filters['department_id'])) {
            $did = (int) $filters['department_id'];
            $all = $all->filter(fn ($d) => (int) ($d->course?->department_id ?? 0) === $did);
        }
        foreach (['doc_type', 'academic_year', 'language', 'visibility'] as $field) {
            if (! empty($filters[$field])) {
                $val = mb_strtolower((string) $filters[$field]);
                $all = $all->filter(fn ($d) => mb_strtolower((string) ($d->$field ?? '')) === $val);
            }
        }

        if ($term !== '') {
            $all = $all->filter(fn ($d) => $this->matchesFuzzy($d, $term));
            // Tri par pertinence : nombre de mots du terme présents + popularité
            $all = $all->sortByDesc(function ($d) use ($term) {
                $score = $this->fuzzyScore($d, $term);
                return $score * 1000 + (int) ($d->downloads_count ?? 0) + (int) ($d->views_count ?? 0);
            })->values();
        }

        $total = $all->count();
        $items = $all->slice(($page - 1) * $perPage, $perPage)->values();

        return new \Illuminate\Pagination\LengthAwarePaginator(
            $items,
            $total,
            $perPage,
            $page,
            ['path' => request()->url(), 'query' => request()->query()]
        );
    }

    private function matchesFuzzy(Document $doc, string $term): bool
    {
        $haystack = self::buildHaystack($doc);
        $words = array_values(array_filter(preg_split('/\s+/u', self::normalizeText($term)) ?: []));
        if ($words === []) return false;
        foreach ($words as $w) {
            if (! $this->wordMatchesHaystack($w, $haystack)) return false;
        }
        return true;
    }

    private function fuzzyScore(Document $doc, string $term): int
    {
        $haystack = self::buildHaystack($doc);
        $words = array_values(array_filter(preg_split('/\s+/u', self::normalizeText($term)) ?: []));
        $score = 0;
        foreach ($words as $w) {
            if (str_contains($haystack, $w)) $score += 10;
            elseif ($this->wordMatchesHaystack($w, $haystack)) $score += 5;
        }
        return $score;
    }

    private function wordMatchesHaystack(string $word, string $haystack): bool
    {
        // Direct substring (acronymes : "chim org" -> "chimie organique", "hetero" -> "heterocyclique")
        if (str_contains($haystack, $word)) return true;
        // Compact (sans espaces) pour "chi3509" == "chi 3509"
        if (str_contains(str_replace(' ', '', $haystack), str_replace(' ', '', $word))) return true;

        // Tolérance fautes de frappe : seuil 1 si un des mots < 5 lettres (évite
        // "les"→"lewis"), 2 sinon ; même préfixe 2 lettres exigé (évite
        // "etudes"→"eudes" : 652 faux positifs). Mots < 3 lettres ignorés.
        $hayWords = preg_split('/\s+/u', $haystack) ?: [];
        foreach ($hayWords as $hw) {
            if (mb_strlen($hw) < 3 || mb_strlen($word) < 3) continue;
            $threshold = (mb_strlen($hw) >= 5 && mb_strlen($word) >= 5) ? 2 : 1;
            if (abs(mb_strlen($hw) - mb_strlen($word)) > $threshold) continue;
            if (mb_substr($hw, 0, 2) !== mb_substr($word, 0, 2)) continue;
            if (levenshtein($hw, $word) <= $threshold) return true;
            // Préfixe long : "pharmacog" (9) proche de "pharmacognosie" (13) -> distance 4 mais préfixe 8/9
            if (mb_strlen($word) >= 4 && str_starts_with($hw, mb_substr($word, 0, -1))) return true;
            if (mb_strlen($hw) >= 4 && str_starts_with($word, mb_substr($hw, 0, -1))) return true;
        }
        return false;
    }

    public static function normalizeText(string $value): string
    {
        $lower = mb_strtolower(trim($value), 'UTF-8');
        $ascii = iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $lower);
        $flat = $ascii === false ? $lower : strtolower($ascii);
        // Alias courants
        $flat = strtr($flat, [
            'chimie organique' => 'chimie organique',
        ]);
        // "chim org" reste deux mots, pas besoin d'alias ; on le garde tel quel
        return trim((string) preg_replace('/\s+/u', ' ', $flat));
    }

    private static function buildHaystack(Document $doc): string
    {
        $parts = array_filter([
            $doc->title,
            $doc->description,
            $doc->original_name,
            $doc->doc_type,
            $doc->academic_year,
            $doc->course?->code,
            $doc->course?->name,
            $doc->course?->description,
            $doc->course?->department?->name,
            $doc->course?->department?->code,
            $doc->course?->department?->faculty?->name,
            $doc->course?->level?->name,
            $doc->course?->semester?->name,
            $doc->tags?->pluck('name')->implode(' '),
        ]);
        return self::normalizeText(implode(' ', $parts));
    }

    /**
     * Find documents whose indexed extracted text contains a term.
     *
     * @return Collection<int, Document>
     */
    public function findDocumentsByIndexedText(string $term): Collection
    {
        $like = '%' . $term . '%';

        return $this->document->newQuery()
            ->whereHas('searchIndex', function ($query) use ($like): void {
                $query->where('extracted_text', 'like', $like)
                    ->where('status', 'completed');
            })
            ->orderByDesc('created_at')
            ->get();
    }

    /**
     * Retrieve a search index row by document id.
     */
    public function findSearchIndexByDocumentId(int $documentId): ?DocumentSearchIndex
    {
        /** @var DocumentSearchIndex|null */
        return $this->documentSearchIndex->newQuery()
            ->where('document_id', $documentId)
            ->first();
    }
}
