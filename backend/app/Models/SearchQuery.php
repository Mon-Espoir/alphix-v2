<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

/**
 * Eloquent model for the search_queries table.
 *
 * Stores search queries performed on the platform for analytics.
 */
class SearchQuery extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'search_queries';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'user_id',
        'faculty_id',
        'department_id',
        'query',
        'results_count',
        'ip_address',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'results_count' => 'integer',
    ];

    /**
     * User who performed the search.
     */
    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class);
    }

    /**
     * Faculty filter applied to the search.
     */
    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    /**
     * Department filter applied to the search.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }
}
