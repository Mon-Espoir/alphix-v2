<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the document_tags table.
 *
 * Represents a reusable tag that can be assigned to documents.
 */
class DocumentTag extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'document_tags';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'slug',
        'description',
        'color',
    ];

    /**
     * Tag assignments linking this tag to documents.
     */
    public function tagAssignments(): HasMany
    {
        return $this->hasMany(DocumentTagAssignment::class, 'tag_id');
    }

    /**
     * Documents associated with this tag.
     */
    public function documents(): BelongsToMany
    {
        return $this->belongsToMany(
            Document::class,
            'document_tag_assignments',
            'tag_id',
            'document_id'
        )->withPivot('created_at');
    }
}
