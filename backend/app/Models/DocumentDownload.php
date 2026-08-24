<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the document_downloads table.
 *
 * Tracks each download event performed on a document.
 */
class DocumentDownload extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_downloads';

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
        'downloaded_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'downloaded_at' => 'datetime',
    ];

    /**
     * Document that was downloaded.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * User who downloaded the document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }
}
