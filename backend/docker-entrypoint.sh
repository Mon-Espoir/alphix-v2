#!/bin/bash
# Entrypoint Docker pour Render - ALPHIX V2 Backend
# Gère : migrations, cache, key generate, storage link, fallback SQLite

set -e

# ──────────────────────────────────────────────
# S'assurer que le fichier .env existe
# ──────────────────────────────────────────────
if [ ! -f .env ]; then
    echo "📝 .env introuvable, copie de .env.example..."
    cp .env.example .env
fi

echo "🚀 ALPHIX V2 Backend - Starting..."

# ──────────────────────────────────────────────
# Connexion Google Drive (rclone) — 100% additive.
# Si RCLONE_CONFIG_CONTENT est fourni (variable Render, jamais Git),
# on l'écrit dans un fichier éphémère et on pointe RCLONE_CONFIG dessus
# AVANT tout artisan/config:cache. Sinon : comportement inchangé
# (l'upload garde son fallback local actuel).
# ──────────────────────────────────────────────
if [ -n "${RCLONE_CONFIG_CONTENT:-}" ] && [ -z "${RCLONE_CONFIG:-}" ]; then
    echo "🔌 Rclone config detected — wiring Google Drive..."
    mkdir -p /tmp/rclone
    printf '%s' "$RCLONE_CONFIG_CONTENT" > /tmp/rclone/rclone.conf
    chmod 600 /tmp/rclone/rclone.conf
    export RCLONE_CONFIG=/tmp/rclone/rclone.conf
    if command -v rclone >/dev/null 2>&1 && rclone lsd "${RCLONE_REMOTE:-mon_drive}:" --config "$RCLONE_CONFIG" >/dev/null 2>&1; then
        echo "✅ Google Drive reachable"
    else
        echo "⚠️ Google Drive unreachable (uploads will use local fallback)"
    fi
fi

# ──────────────────────────────────────────────
# Génération de la clé APP_KEY si absente
# ──────────────────────────────────────────────
if [ -z "$APP_KEY" ] || [ "$APP_KEY" = "" ]; then
    echo "🔑 Generating APP_KEY..."
    php artisan key:generate --force --no-interaction
fi

# ──────────────────────────────────────────────
# Détection base de données : PostgreSQL (prod) ou SQLite (fallback)
# ──────────────────────────────────────────────
if [ -n "$DB_HOST" ] && [ -n "$DB_DATABASE" ] && [ -n "$DB_USERNAME" ]; then
    echo "🐘 PostgreSQL detected (DB_HOST=$DB_HOST) - waiting for readiness..."
    
    # Attente base PostgreSQL (max 60s)
    for i in {1..30}; do
        if php -r "
            try {
                \$pdo = new PDO('pgsql:host=' . getenv('DB_HOST') . ';port=' . getenv('DB_PORT') . ';dbname=' . getenv('DB_DATABASE'), getenv('DB_USERNAME'), getenv('DB_PASSWORD'));
                exit(0);
            } catch (Exception \$e) {
                exit(1);
            }
        "; then
            echo "✅ PostgreSQL ready"
            break
        fi
        echo "   Waiting for PostgreSQL... ($i/30)"
        sleep 2
    done
    
    DB_CONNECTION=pgsql
else
    echo "📦 No PostgreSQL env vars - using SQLite fallback"
    DB_CONNECTION=sqlite
    # Assurer que le fichier SQLite existe
    touch database/database.sqlite
    chmod 664 database/database.sqlite
fi

# Export pour les commandes artisan
export DB_CONNECTION

# ──────────────────────────────────────────────
# Package discovery (doit tourner après le COPY du code)
# ──────────────────────────────────────────────
echo "🔍 Discovering packages..."
php artisan package:discover --no-interaction

# ──────────────────────────────────────────────
# Migrations (force = pas de confirmation)
# ──────────────────────────────────────────────
echo "📊 Running migrations..."
php artisan migrate --force --no-interaction

# ──────────────────────────────────────────────
# Seed automatique SI la base est vide (ex. Postgres recréé).
# Tous les seeders sont idempotents (updateOrCreate/firstOrCreate) :
# relancer sur une base pleine ne duplique rien.
# En cas de doute (compte illisible), on NE seed PAS et on démarre.
# ──────────────────────────────────────────────
echo "🌱 Checking if database needs seeding..."
FACULTY_COUNT=$(php artisan tinker --execute="echo App\\Models\\Faculty::query()->count();" 2>/dev/null | grep -E '^[0-9]+' | tail -1 || true)
if [ "$FACULTY_COUNT" = "0" ]; then
    echo "🌱 Empty database detected — seeding catalog + admin account..."
    php artisan db:seed --force --no-interaction
    echo "✅ Seeding done"
else
    echo "✅ Database already populated (faculties: ${FACULTY_COUNT:-?}) — skipping seed"
fi

# ──────────────────────────────────────────────
# Storage link (pour fichiers publics)
# ──────────────────────────────────────────────
if [ ! -L public/storage ]; then
    echo "🔗 Creating storage link..."
    php artisan storage:link --no-interaction
fi

# ──────────────────────────────────────────────
# Optimisation caches production
# ──────────────────────────────────────────────
echo "⚡ Caching config, routes, views..."
php artisan config:cache --no-interaction
php artisan route:cache --no-interaction
php artisan view:cache --no-interaction

# ──────────────────────────────────────────────
# Permissions finales
# ──────────────────────────────────────────────
chown -R appuser:appgroup storage bootstrap/cache 2>/dev/null || true
chmod -R 775 storage bootstrap/cache 2>/dev/null || true

echo "✅ Backend ready - starting server on port ${PORT:-8000}"

# ──────────────────────────────────────────────
# Exécution de la commande passée (startCommand render.yaml)
# Render injecte $PORT (souvent ≠ 8000) : on l'applique au serveur
# Laravel sans toucher aux autres arguments.
# ──────────────────────────────────────────────
if [ -n "${PORT:-}" ]; then
  ARGS=()
  for arg in "$@"; do
    if [ "$arg" = "--port=8000" ]; then
      arg="--port=${PORT}"
    fi
    ARGS+=("$arg")
  done
  set -- "${ARGS[@]}"
fi
exec "$@"