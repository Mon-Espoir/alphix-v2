<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('courses', function (Blueprint $table) {
            $table->id();
            $table->foreignId('department_id')->constrained('departments')->cascadeOnDelete();
            $table->foreignId('level_id')->constrained('levels')->cascadeOnDelete();
            $table->foreignId('semester_id')->constrained('semesters')->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 50)->unique();
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->smallInteger('credits')->nullable();
            $table->decimal('coefficient', 4, 2)->nullable();
            $table->smallInteger('hours')->nullable();
            $table->string('teacher')->nullable();
            $table->string('color', 30)->nullable();
            $table->string('icon', 100)->nullable();
            $table->foreignId('drive_id')->nullable()->constrained('google_drives')->nullOnDelete();
            $table->integer('total_documents')->default(0);
            $table->integer('total_downloads')->default(0);
            $table->integer('total_views')->default(0);
            $table->boolean('status')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('courses');
    }
};
