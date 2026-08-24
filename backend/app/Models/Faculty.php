<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the faculties table.
 *
 * Represents an academic faculty within the ALPHIX platform.
 */
class Faculty extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'faculties';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'slug',
        'description',
        'logo',
        'color',
        'icon',
        'drive_id',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'status' => 'boolean',
    ];

    /**
     * Google Drive account associated with this faculty.
     */
    public function googleDrive(): BelongsTo
    {
        return $this->belongsTo(GoogleDrive::class, 'drive_id');
    }

    /**
     * Departments belonging to this faculty.
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class);
    }

    /**
     * Users belonging to this faculty.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }

    /**
     * Search queries filtered by this faculty.
     */
    public function searchQueries(): HasMany
    {
        return $this->hasMany(SearchQuery::class);
    }
}
