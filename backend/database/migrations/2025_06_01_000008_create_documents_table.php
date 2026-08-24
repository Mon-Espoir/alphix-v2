<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('documents', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->foreignId('course_id')->nullable()->constrained('courses')->nullOnDelete();
            $table->foreignId('user_id')->nullable()->constrained('users')->nullOnDelete();
            $table->foreignId('google_drive_id')->nullable()->constrained('google_drives')->nullOnDelete();
            $table->string('title')->index();
            $table->string('original_name');
            $table->string('slug')->unique();
            $table->text('description')->nullable();
            $table->enum('doc_type', [
                'course', 'tp', 'td', 'exam', 'correction', 'syllabus',
                'summary', 'book', 'thesis', 'report', 'presentation',
                'video', 'external_link', 'other',
            ])->index();
            $table->string('academic_year', 20)->nullable()->index();
            $table->string('language', 20)->nullable()->default('fr');
            $table->string('mime_type', 100)->default('application/pdf');
            $table->unsignedSmallInteger('pages')->nullable();
            $table->unsignedBigInteger('file_size')->default(0);
            $table->char('file_hash', 64)->unique();
            $table->string('drive_file_id')->nullable()->index();
            $table->text('drive_web_view_link')->nullable();
            $table->text('drive_download_link')->nullable();
            $table->string('version', 30)->default('1.0');
            $table->enum('visibility', ['public', 'faculty', 'department', 'private'])->default('public');
            $table->enum('status', ['pending', 'processing', 'approved', 'rejected', 'archived'])->default('pending');
            $table->foreignId('approved_by')->nullable()->constrained('users')->nullOnDelete();
            $table->boolean('is_featured')->default(false);
            $table->unsignedInteger('downloads_count')->default(0);
            $table->unsignedInteger('views_count')->default(0);
            $table->enum('ocr_status', ['pending', 'processing', 'completed', 'failed'])->default('pending');
            $table->json('metadata')->nullable();
            $table->timestamp('published_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('documents');
    }
};
