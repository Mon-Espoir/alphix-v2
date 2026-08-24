<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('departments', function (Blueprint $table) {
            $table->id();
            $table->foreignId('faculty_id')->constrained('faculties')->cascadeOnDelete();
            $table->string('name');
            $table->string('code', 30)->unique();
            $table->string('slug')->unique();
            $table->string('short_name', 100)->nullable();
            $table->text('description')->nullable();
            $table->string('logo')->nullable();
            $table->string('banner')->nullable();
            $table->string('color', 30)->nullable();
            $table->string('icon', 100)->nullable();
            $table->foreignId('drive_id')->nullable()->constrained('google_drives')->nullOnDelete();
            $table->integer('total_courses')->default(0);
            $table->integer('total_documents')->default(0);
            $table->integer('total_students')->default(0);
            $table->boolean('is_public')->default(true);
            $table->boolean('status')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('departments');
    }
};
