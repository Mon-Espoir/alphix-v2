<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the courses table.
 *
 * Represents an academic course linked to a department, level and semester.
 */
class Course extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'courses';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'department_id',
        'level_id',
        'semester_id',
        'name',
        'code',
        'slug',
        'description',
        'credits',
        'coefficient',
        'hours',
        'teacher',
        'color',
        'icon',
        'drive_id',
        'total_documents',
        'total_downloads',
        'total_views',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'credits' => 'integer',
        'coefficient' => 'decimal:2',
        'hours' => 'integer',
        'total_documents' => 'integer',
        'total_downloads' => 'integer',
        'total_views' => 'integer',
        'status' => 'boolean',
    ];

    /**
     * Department that owns this course.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Academic level of this course.
     */
    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    /**
     * Academic semester of this course.
     */
    public function semester(): BelongsTo
    {
        return $this->belongsTo(Semester::class);
    }

    /**
     * Google Drive account associated with this course.
     */
    public function googleDrive(): BelongsTo
    {
        return $this->belongsTo(GoogleDrive::class, 'drive_id');
    }

    /**
     * Documents belonging to this course.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }
}
