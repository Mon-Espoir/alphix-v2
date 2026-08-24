<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the document_search_index table.
 *
 * Stores OCR / extracted text used for full-text search of documents.
 */
class DocumentSearchIndex extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_search_index';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'document_id',
        'extracted_text',
        'language',
        'status',
    ];

    /**
     * Document indexed by this entry.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
