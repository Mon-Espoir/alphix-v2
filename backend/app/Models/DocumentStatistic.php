<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the document_statistics table.
 *
 * Stores precomputed statistics for each document.
 */
class DocumentStatistic extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_statistics';

    /**
     * The primary key associated with the table.
     *
     * @var string
     */
    protected $primaryKey = 'document_id';

    /**
     * Indicates if the model's ID is auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The name of the "created at" column.
     * This table only stores updated_at.
     *
     * @var string|null
     */
    const CREATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'document_id',
        'total_views',
        'total_downloads',
        'weekly_views',
        'monthly_views',
        'popularity_score',
        'last_view_at',
        'last_download_at',
        'updated_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'total_views' => 'integer',
        'total_downloads' => 'integer',
        'weekly_views' => 'integer',
        'monthly_views' => 'integer',
        'popularity_score' => 'decimal:2',
        'last_view_at' => 'datetime',
        'last_download_at' => 'datetime',
        'updated_at' => 'datetime',
    ];

    /**
     * Document associated with these statistics.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }
}
