<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_statistics', function (Blueprint $table) {
            $table->foreignId('document_id')->primary()->constrained('documents')->cascadeOnDelete();
            $table->unsignedInteger('total_views')->default(0);
            $table->unsignedInteger('total_downloads')->default(0);
            $table->unsignedInteger('weekly_views')->default(0);
            $table->unsignedInteger('monthly_views')->default(0);
            $table->decimal('popularity_score', 10, 2)->default(0.00);
            $table->timestamp('last_view_at')->nullable();
            $table->timestamp('last_download_at')->nullable();
            $table->timestamp('updated_at')->nullable();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_statistics');
    }
};
