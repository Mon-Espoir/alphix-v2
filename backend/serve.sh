#!/usr/bin/env bash
# ---------------------------------------------------------------------------
# ALPHIX V2 - Lancement du serveur de dev avec les limites d'upload (50 Mo)
# ---------------------------------------------------------------------------
# Usage : ./serve.sh [--host=127.0.0.1] [--port=8000]
#
# Pourquoi ce script ? Le serveur integre `php artisan serve` lit le php.ini
# CLI du systeme (post_max_size=8M / upload_max_filesize=2M par defaut) et
# IGNORE backend/public/.user.ini (lu uniquement par CGI/FastCGI). Sans ce
# script, tout televersement > 8 Mo echoue avec « The POST data is too large ».
#
# Le script regenere une ferme de liens vers les .ini systeme + l'override
# ALPHIX, puis lance le serveur avec PHP_INI_SCAN_DIR (transmis au processus
# enfant grace a --no-reload).
set -euo pipefail

cd "$(dirname "$0")"

HOST="127.0.0.1"
PORT="8000"
for arg in "$@"; do
  case "$arg" in
  --host=*) HOST="${arg#--host=}" ;;
  --port=*) PORT="${arg#--port=}" ;;
  esac
done

FARM_DIR="storage/app/php-ini-farm"
SCAN_SRC="$(php -r 'echo PHP_CONFIG_FILE_SCAN_DIR;')"
mkdir -p "$FARM_DIR"

# Regenere la ferme : liens systeme + override ALPHIX en dernier (99-*).
find "$FARM_DIR" -mindepth 1 -delete 2>/dev/null || true
for f in "$SCAN_SRC"/*.ini; do
  ln -sf "$f" "$FARM_DIR/$(basename "$f")"
done
cp php-ini/99-alphix-uploads.ini "$FARM_DIR/"

FARM_ABS="$(cd "$FARM_DIR" && pwd)"
export PHP_INI_SCAN_DIR="$FARM_ABS"

echo "Limites PHP effectives : $(PHP_INI_SCAN_DIR="$FARM_ABS" php -r 'echo ini_get("upload_max_filesize")," / ",ini_get("post_max_size");')"
echo "Demarrage sur http://${HOST}:${PORT} (logs : storage/logs/serve.log)"

mkdir -p storage/logs
nohup php artisan serve --host="$HOST" --port="$PORT" --no-reload \
  > storage/logs/serve.log 2>&1 &
echo "PID $!"
