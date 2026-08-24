<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the semesters table.
 *
 * Represents an academic semester within the curriculum.
 */
class Semester extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'semesters';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'name',
        'code',
        'slug',
        'position',
        'status',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'position' => 'integer',
        'status' => 'boolean',
    ];

    /**
     * Courses associated with this semester.
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }
}
