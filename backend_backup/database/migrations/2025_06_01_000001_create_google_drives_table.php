<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('google_drives', function (Blueprint $table) {
            $table->id();
            $table->char('uuid', 36)->unique();
            $table->string('name')->index();
            $table->string('code', 50)->unique();
            $table->string('folder_id')->unique();
            $table->string('email')->nullable()->index();
            $table->enum('type', ['personal', 'shared_drive', 'service_account'])->default('shared_drive');
            $table->string('credentials_path')->nullable();
            $table->unsignedBigInteger('storage_limit')->nullable();
            $table->unsignedBigInteger('used_storage')->default(0);
            $table->unsignedBigInteger('available_storage')->default(0);
            $table->unsignedSmallInteger('priority')->default(1);
            $table->enum('health_status', ['healthy', 'warning', 'critical'])->default('healthy');
            $table->unsignedBigInteger('upload_count')->default(0);
            $table->timestamp('last_sync_at')->nullable();
            $table->boolean('is_default')->default(false);
            $table->boolean('status')->default(true);
            $table->text('notes')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('google_drives');
    }
};
