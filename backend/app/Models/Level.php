<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the levels table.
 *
 * Represents an academic level (e.g. Bac 1, Bac 2, Bac 3).
 */
class Level extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'levels';

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
     * Courses associated with this level.
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class);
    }

    /**
     * Users enrolled at this level.
     */
    public function users(): HasMany
    {
        return $this->hasMany(User::class);
    }
}
