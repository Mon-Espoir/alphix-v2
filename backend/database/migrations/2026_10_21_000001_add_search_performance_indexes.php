<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Index de performance pour la recherche et les filtres.
 *
 * Constat d'audit : PostgreSQL ne cree PAS d'index automatiquement sur les
 * cles etrangeres, et les colonnes de filtrage (status, course_id, dates)
 * etaient totalement non indexees. Chaque endpoint de listing/recherche
 * declenchait donc un seq-scan complet de `documents` (N lignes), et
 * `/explorer` executait une sous-requete correlee O(cours x documents).
 *
 * Ce lot ajoute les index manquants. La migration est idempotente : chaque
 * index n'est cree que s'il n'existe pas deja (rejeu sans erreur possible).
 */
return new class extends Migration
{
    public function up(): void
    {
        // --- documents : filtres de listing et de recherche ---
        Schema::table('documents', function (Blueprint $table) {
            if (! Schema::hasIndex('documents', 'documents_status_published_at_index')) {
                $table->index(['status', 'published_at'], 'documents_status_published_at_index');
            }
            // Tri dominant du listing et de la recherche : (status, created_at)
            // couvre le filtre ET l'ORDER BY (evite le TEMP B-TREE de tri).
            if (! Schema::hasIndex('documents', 'documents_status_created_at_index')) {
                $table->index(['status', 'created_at'], 'documents_status_created_at_index');
            }
            if (! Schema::hasIndex('documents', 'documents_is_featured_published_at_index')) {
                $table->index(['is_featured', 'published_at'], 'documents_is_featured_published_at_index');
            }
            if (! Schema::hasIndex('documents', 'documents_status_course_id_index')) {
                $table->index(['status', 'course_id'], 'documents_status_course_id_index');
            }
            if (! Schema::hasIndex('documents', 'documents_course_id_index')) {
                $table->index('course_id', 'documents_course_id_index');
            }
            if (! Schema::hasIndex('documents', 'documents_user_id_index')) {
                $table->index('user_id', 'documents_user_id_index');
            }
            if (! Schema::hasIndex('documents', 'documents_created_at_index')) {
                $table->index('created_at', 'documents_created_at_index');
            }
        });

        // --- courses : filtre par departement et jointures de comptage ---
        Schema::table('courses', function (Blueprint $table) {
            if (! Schema::hasIndex('courses', 'courses_department_id_index')) {
                $table->index('department_id', 'courses_department_id_index');
            }
            if (! Schema::hasIndex('courses', 'courses_level_id_index')) {
                $table->index('level_id', 'courses_level_id_index');
            }
            if (! Schema::hasIndex('courses', 'courses_semester_id_index')) {
                $table->index('semester_id', 'courses_semester_id_index');
            }
        });

        // --- departments : filtre par faculte ---
        Schema::table('departments', function (Blueprint $table) {
            if (! Schema::hasIndex('departments', 'departments_faculty_id_index')) {
                $table->index('faculty_id', 'departments_faculty_id_index');
            }
        });

        // --- document_downloads : historique utilisateur ---
        Schema::table('document_downloads', function (Blueprint $table) {
            if (! Schema::hasIndex('document_downloads', 'document_downloads_user_id_index')) {
                $table->index('user_id', 'document_downloads_user_id_index');
            }
        });

        // --- document_tag_assignments : filtre par tag ---
        // La PK composite (document_id, tag_id) couvre document_id mais pas
        // tag_id (filtre "documents par tag" => seq-scan de la table pivot).
        Schema::table('document_tag_assignments', function (Blueprint $table) {
            if (! Schema::hasIndex('document_tag_assignments', 'document_tag_assignments_tag_id_index')) {
                $table->index('tag_id', 'document_tag_assignments_tag_id_index');
            }
        });
    }

    public function down(): void
    {
        // Suppression tolerante : un index absent (migration modifiee apres
        // execution, base restauree...) ne doit pas bloquer le rollback.
        $drop = function (string $table, string $index): void {
            if (Schema::hasIndex($table, $index)) {
                Schema::table($table, function (Blueprint $t) use ($index) {
                    $t->dropIndex($index);
                });
            }
        };

        foreach ([
            'documents_status_published_at_index',
            'documents_status_created_at_index',
            'documents_is_featured_published_at_index',
            'documents_status_course_id_index',
            'documents_course_id_index',
            'documents_user_id_index',
            'documents_created_at_index',
        ] as $index) {
            $drop('documents', $index);
        }

        foreach ([
            'courses_department_id_index',
            'courses_level_id_index',
            'courses_semester_id_index',
        ] as $index) {
            $drop('courses', $index);
        }

        $drop('departments', 'departments_faculty_id_index');
        $drop('document_downloads', 'document_downloads_user_id_index');
        $drop('document_tag_assignments', 'document_tag_assignments_tag_id_index');
    }
};
