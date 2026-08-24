<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\Relations\HasOne;

/**
 * Eloquent model for the documents table.
 *
 * Represents the central educational resource of ALPHIX.
 * Physical files are stored on Google Drive; this model holds metadata.
 */
class Document extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'documents';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'course_id',
        'user_id',
        'google_drive_id',
        'title',
        'original_name',
        'slug',
        'description',
        'doc_type',
        'academic_year',
        'language',
        'mime_type',
        'pages',
        'file_size',
        'file_hash',
        'drive_file_id',
        'drive_web_view_link',
        'drive_download_link',
        'version',
        'visibility',
        'status',
        'approved_by',
        'is_featured',
        'downloads_count',
        'views_count',
        'ocr_status',
        'metadata',
        'published_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'pages' => 'integer',
        'file_size' => 'integer',
        'is_featured' => 'boolean',
        'downloads_count' => 'integer',
        'views_count' => 'integer',
        'metadata' => 'array',
        'published_at' => 'datetime',
    ];

    /**
     * Course associated with this document.
     */
    public function course(): BelongsTo
    {
        return $this->belongsTo(Course::class);
    }

    /**
     * User who uploaded this document.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * User who approved this document.
     */
    public function approver(): BelongsTo
    {
        return $this->belongsTo(User::class, 'approved_by');
    }

    /**
     * Google Drive account storing this document.
     */
    public function googleDrive(): BelongsTo
    {
        return $this->belongsTo(GoogleDrive::class, 'google_drive_id');
    }

    /**
     * Download events for this document.
     */
    public function documentDownloads(): HasMany
    {
        return $this->hasMany(DocumentDownload::class);
    }

    /**
     * View events for this document.
     */
    public function documentViews(): HasMany
    {
        return $this->hasMany(DocumentView::class);
    }

    /**
     * Favorite assignments for this document.
     */
    public function documentFavorites(): HasMany
    {
        return $this->hasMany(DocumentFavorite::class);
    }

    /**
     * Users who favorited this document.
     */
    public function favoritedByUsers(): BelongsToMany
    {
        return $this->belongsToMany(User::class, 'document_favorites')
            ->withTimestamps();
    }

    /**
     * Tag assignments for this document.
     */
    public function tagAssignments(): HasMany
    {
        return $this->hasMany(DocumentTagAssignment::class);
    }

    /**
     * Tags associated with this document.
     */
    public function tags(): BelongsToMany
    {
        return $this->belongsToMany(
            DocumentTag::class,
            'document_tag_assignments',
            'document_id',
            'tag_id'
        )->withPivot('created_at');
    }

    /**
     * Search index entry for this document.
     */
    public function documentSearchIndex(): HasOne
    {
        return $this->hasOne(DocumentSearchIndex::class);
    }

    /**
     * Precomputed statistics for this document.
     */
    public function documentStatistic(): HasOne
    {
        return $this->hasOne(DocumentStatistic::class);
    }
}
