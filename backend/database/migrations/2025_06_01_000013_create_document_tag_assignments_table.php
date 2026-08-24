<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('document_tag_assignments', function (Blueprint $table) {
            $table->foreignId('document_id')->constrained('documents')->cascadeOnDelete();
            $table->foreignId('tag_id')->constrained('document_tags')->cascadeOnDelete();
            $table->timestamp('created_at')->nullable()->useCurrent();

            $table->primary(['document_id', 'tag_id']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('document_tag_assignments');
    }
};
