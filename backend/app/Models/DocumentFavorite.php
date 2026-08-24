<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the document_favorites table.
 *
 * Represents a user's favorite assignment for a document.
 */
class DocumentFavorite extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_favorites';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'document_id',
    ];

    /**
     * User who favorited the document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Document that was favorited.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
