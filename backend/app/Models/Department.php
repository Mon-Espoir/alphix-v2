<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the departments table.
 *
 * Represents an academic department belonging to a faculty.
 */
class Department extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'departments';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'faculty_id',
        'name',
        'code',
        'slug',
        'short_name',
        'description',
        'logo',
        'banner',
        'color',
        'icon',
        'drive_id',
        'total_courses',
        'total_documents',
        'total_students',
        'is_public',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'total_courses' => 'integer',
        'total_documents' => 'integer',
        'total_students' => 'integer',
        'is_public' => 'boolean',
        'status' => 'boolean',
    ];

    /**
     * Faculty that owns this department.
     */
    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    /**
     * Google Drive account associated with this department.
     */
    public function googleDrive(): BelongsTo
    {
        return $this->belongsTo(GoogleDrive::class, 'drive_id');
    }

    /**
     * Courses belonging to this department.
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /**
     * Users belonging to this department.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Search queries filtered by this department.
     */
    public function searchQueries(): HasMany
    {
        return $this->hasMany(SearchQuery::class);
    }
}
