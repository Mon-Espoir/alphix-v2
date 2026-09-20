<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Schema;
use Illuminate\Support\Str;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Nom d'utilisateur strict et unique
 * ---------------------------------------------------------------------------
 * Ajoute une colonne `username` (unique) sur users et alimente les comptes
 * existants : impossible de creer deux comptes avec le meme nom d'utilisateur.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('username', 50)->nullable()->after('email');
        });

        // Peuplement des comptes existants avec un nom d'utilisateur unique.
        $rows = DB::table('users')->select('id', 'name', 'uuid')->orderBy('id')->get();

        foreach ($rows as $row) {
            $base = Str::lower((string) preg_replace('/[^a-z0-9._-]/', '', Str::slug($row->name ?? 'user', '_')));
            $base = $base !== '' ? substr($base, 0, 30) : 'user';

            $candidate = $base;
            $counter = 1;
            while (DB::table('users')->where('username', $candidate)->exists()) {
                $suffix = substr((string) $row->uuid, 0, 8);
                $candidate = $counter === 1 && $suffix !== ''
                    ? substr($base, 0, 21).'_'.$suffix
                    : substr($base, 0, 30 - strlen((string) $counter)).$counter;
                $counter++;
            }

            DB::table('users')->where('id', $row->id)->update(['username' => $candidate]);
        }

        Schema::table('users', function (Blueprint $table) {
            $table->unique('username');
        });
    }

    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique('users_username_unique');
            $table->dropColumn('username');
        });
    }
};
