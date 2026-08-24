<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the document_tag_assignments pivot table.
 *
 * Implements the many-to-many relationship between documents and tags.
 */
class DocumentTagAssignment extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_tag_assignments';

    /**
     * Indicates if the model's ID is auto-incrementing.
     *
     * @var bool
     */
    public $incrementing = false;

    /**
     * The primary key associated with the table.
     * Composite primary key: (document_id, tag_id).
     *
     * @var string|null
     */
    protected $primaryKey = null;

    /**
     * The name of the "updated at" column.
     * This pivot table only stores created_at.
     *
     * @var string|null
     */
    const UPDATED_AT = null;

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'document_id',
        'tag_id',
        'created_at',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'created_at' => 'datetime',
    ];

    /**
     * Document linked by this assignment.
     */
    public function document(): BelongsTo
    {
        return $this->belongsTo(Document::class);
    }

    /**
     * Document tag linked by this assignment.
     */
    public function documentTag(): BelongsTo
    {
        return $this->belongsTo(DocumentTag::class, 'tag_id');
    }
}
