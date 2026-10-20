<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * La verification stricte de doublon (file_hash unique) bloquait les
 * envois étudiants : deux étudiants partageant le meme cours ne pouvaient
 * pas televerser le meme fichier. On garde un index pour la performance
 * mais on autorise les doublons.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropUnique(['file_hash']);
            $table->index('file_hash');
        });
    }

    public function down(): void
    {
        Schema::table('documents', function (Blueprint $table) {
            $table->dropIndex(['file_hash']);
            $table->unique('file_hash');
        });
    }
};
