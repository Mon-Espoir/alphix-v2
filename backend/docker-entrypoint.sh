#!/bin/bash
# Entrypoint Docker pour Render - ALPHIX V2 Backend
# Gère : migrations, cache, key generate, storage link, fallback SQLite

set -e

echo "🚀 ALPHIX V2 Backend - Starting..."

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
# Migrations (force = pas de confirmation)
# ──────────────────────────────────────────────
echo "📊 Running migrations..."
php artisan migrate --force --no-interaction

# ──────────────────────────────────────────────
# Storage link (pour fichiers publics)
# ──────────────────────────────────────────────
if [ ! -L public/storage ]; then
    echo "🔗 Creating storage link..."
    php artisan storage:link --no-interaction
fi

# ──────────────────────────────────────────────
# Package discovery (doit tourner après le COPY du code)
# ──────────────────────────────────────────────
echo "🔍 Discovering packages..."
php artisan package:discover --no-interaction

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
# ──────────────────────────────────────────────
exec "$@"