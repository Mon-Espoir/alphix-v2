<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the document_views table.
 *
 * Tracks each view event performed on a document.
 */
class DocumentView extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_views';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'document_id',
        'user_id',
        'ip_address',
        'user_agent',
        'platform',
        'app_version',
        'viewed_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'viewed_at' => 'datetime',
    ];

    /**
     * Document that was viewed.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * User who viewed the document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
