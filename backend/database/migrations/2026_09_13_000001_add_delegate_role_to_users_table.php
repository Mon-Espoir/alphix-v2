<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Role delegue (RBAC 3 niveaux)
 * ---------------------------------------------------------------------------
 * Ajoute 'delegate' a la contrainte CHECK du role users (SQLite : rebuild
 * de table, donnees preservees, index recrees). Sans doctrine/dbal.
 */
return new class extends Migration
{
    private const BASE_ROLES = ['student', 'teacher', 'contributor', 'moderator', 'administrator', 'super_admin'];

    private const WITH_DELEGATE = ['student', 'teacher', 'contributor', 'moderator', 'administrator', 'super_admin', 'delegate'];

    public function up(): void
    {
        $this->rebuild(self::WITH_DELEGATE);
    }

    public function down(): void
    {
        // Securite : aucun delegue restant avant de retirer la valeur.
        DB::table('users')->where('role', 'delegate')->update(['role' => 'student']);
        $this->rebuild(self::BASE_ROLES);
    }

    /**
     * Reconstruit users avec la liste de roles donnee (ordre colonnes inchange).
     * SQLite : rebuild de table (le CHECK est inline dans le DDL).
     * PostgreSQL : le CHECK est une contrainte nommée -> DROP + ADD.
     */
    private function rebuild(array $roles): void
    {
        if (DB::getDriverName() === 'pgsql') {
            $this->rebuildPgsql($roles);
            return;
        }

        $this->rebuildSqlite($roles);
    }

    /**
     * PostgreSQL : remplace toute contrainte CHECK portant sur "role".
     */
    private function rebuildPgsql(array $roles): void
    {
        $quoted = implode(', ', array_map(fn ($r) => "'{$r}'", $roles));

        $existing = DB::select(
            "SELECT conname FROM pg_constraint
             WHERE conrelid = 'users'::regclass AND contype = 'c'
             AND pg_get_constraintdef(oid) ILIKE '%role%'"
        );
        foreach ($existing as $row) {
            DB::statement("ALTER TABLE users DROP CONSTRAINT IF EXISTS \"{$row->conname}\"");
        }

        DB::statement("ALTER TABLE users ADD CONSTRAINT users_role_check CHECK (\"role\" in ({$quoted}))");
    }

    /**
     * SQLite : rebuild de table (le CHECK est inline dans le DDL).
     * Code d'origine inchangé (dev local).
     */
    private function rebuildSqlite(array $roles): void
    {
        $quoted = implode(', ', array_map(fn ($r) => "'{$r}'", $roles));

        Schema::disableForeignKeyConstraints();

        try {
            $create = DB::selectOne("SELECT sql FROM sqlite_master WHERE name = 'users'")->sql;

            $pattern = '/"role" in \([^)]*\)/';
            $replacement = "\"role\" in ({$quoted})";

            if (! preg_match($pattern, $create)) {
                throw new RuntimeException('Contrainte CHECK du role introuvable dans users.');
            }

            $newSql = preg_replace($pattern, $replacement, $create, 1);
            $newSql = preg_replace('/^CREATE TABLE "users"/', 'CREATE TABLE "users_new"', $newSql, 1);

            DB::statement($newSql);
            DB::statement('INSERT INTO "users_new" SELECT * FROM "users"');
            DB::statement('DROP TABLE "users"');
            DB::statement('ALTER TABLE "users_new" RENAME TO "users"');

            // Index explicites (uniques email/uuid + activite).
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_email_unique" ON "users" ("email")');
            DB::statement('CREATE UNIQUE INDEX IF NOT EXISTS "users_uuid_unique" ON "users" ("uuid")');
            DB::statement('CREATE INDEX IF NOT EXISTS "users_last_activity_at_index" ON "users" ("last_activity_at")');
        } finally {
            Schema::enableForeignKeyConstraints();
        }
    }
};
