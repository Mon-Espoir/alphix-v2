<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('users', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('name');
            $table->string('email')->unique();
            $table->string('phone', 30)->nullable();
            $table->timestamp('email_verified_at')->nullable();
            $table->string('password');
            $table->enum('role', ['student', 'teacher', 'contributor', 'moderator', 'administrator', 'super_admin'])->default('student');
            $table->foreignId('faculty_id')->nullable()->constrained('faculties')->nullOnDelete();
            $table->foreignId('department_id')->nullable()->constrained('departments')->nullOnDelete();
            $table->foreignId('level_id')->nullable()->constrained('levels')->nullOnDelete();
            $table->string('avatar')->nullable();
            $table->string('language', 20)->default('fr');
            $table->enum('theme', ['light', 'dark', 'system'])->default('system');
            $table->boolean('notification_enabled')->default(true);
            $table->string('device_type', 50)->nullable();
            $table->string('app_version', 30)->nullable();
            $table->string('download_path')->nullable();
            $table->timestamp('last_login_at')->nullable();
            $table->timestamp('last_activity_at')->nullable()->index();
            $table->boolean('status')->default(true);
            $table->rememberToken();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('users');
    }
};
