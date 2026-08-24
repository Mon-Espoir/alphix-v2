<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\BelongsToMany;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;

/**
 * Eloquent model for the users table.
 *
 * Represents every ALPHIX platform user (student, teacher, contributor,
 * moderator, administrator or super administrator).
 */
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasFactory, Notifiable;

    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'users';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'name',
        'email',
        'phone',
        'email_verified_at',
        'password',
        'role',
        'faculty_id',
        'department_id',
        'level_id',
        'avatar',
        'language',
        'theme',
        'notification_enabled',
        'device_type',
        'app_version',
        'download_path',
        'last_login_at',
        'last_activity_at',
        'status',
    ];

    /**
     * The attributes that should be hidden for serialization.
     *
     * @var list<string>
     */
    protected $hidden = [
        'password',
        'remember_token',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'email_verified_at' => 'datetime',
        'password' => 'hashed',
        'notification_enabled' => 'boolean',
        'last_login_at' => 'datetime',
        'last_activity_at' => 'datetime',
        'status' => 'boolean',
    ];

    /**
     * Faculty associated with this user.
     */
    public function faculty(): BelongsTo
    {
        return $this->belongsTo(Faculty::class);
    }

    /**
     * Department associated with this user.
     */
    public function department(): BelongsTo
    {
        return $this->belongsTo(Department::class);
    }

    /**
     * Academic level associated with this user.
     */
    public function level(): BelongsTo
    {
        return $this->belongsTo(Level::class);
    }

    /**
     * Documents uploaded by this user.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class);
    }

    /**
     * Documents approved by this user.
     */
    public function approvedDocuments(): HasMany
    {
        return $this->hasMany(Document::class, 'approved_by');
    }

    /**
     * Document download events for this user.
     */
    public function documentDownloads(): HasMany
    {
        return $this->hasMany(DocumentDownload::class);
    }

    /**
     * Document view events for this user.
     */
    public function documentViews(): HasMany
    {
        return $this->hasMany(DocumentView::class);
    }

    /**
     * Favorite assignments created by this user.
     */
    public function documentFavorites(): HasMany
    {
        return $this->hasMany(DocumentFavorite::class);
    }

    /**
     * Documents favorited by this user.
     */
    public function favoriteDocuments(): BelongsToMany
    {
        return $this->belongsToMany(Document::class, 'document_favorites')
            ->withTimestamps();
    }

    /**
     * Search queries performed by this user.
     */
    public function searchQueries(): HasMany
    {
        return $this->hasMany(SearchQuery::class);
    }

    /**
     * ALPHIX notifications sent to this user.
     *
     * Named distinctly from Laravel Notifiable's morphMany notifications().
     */
    public function userNotifications(): HasMany
    {
        return $this->hasMany(Notification::class);
    }

    /**
     * System logs related to this user.
     */
    public function systemLogs(): HasMany
    {
        return $this->hasMany(SystemLog::class);
    }
}
