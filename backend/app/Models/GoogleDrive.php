<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

/**
 * Eloquent model for the google_drives table.
 *
 * Represents a Google Drive storage account used by ALPHIX
 * to store academic documents.
 */
class GoogleDrive extends Model
{
    /**
     * The table associated with the model.
     *
     * @var string
     */
    protected $table = 'google_drives';

    /**
     * The attributes that are mass assignable.
     *
     * @var list<string>
     */
    protected $fillable = [
        'uuid',
        'name',
        'code',
        'folder_id',
        'email',
        'type',
        'credentials_path',
        'storage_limit',
        'used_storage',
        'available_storage',
        'priority',
        'health_status',
        'upload_count',
        'last_sync_at',
        'is_default',
        'status',
        'notes',
    ];

    /**
     * The attributes that should be cast.
     *
     * @var array<string, string>
     */
    protected $casts = [
        'storage_limit' => 'integer',
        'used_storage' => 'integer',
        'available_storage' => 'integer',
        'priority' => 'integer',
        'upload_count' => 'integer',
        'last_sync_at' => 'datetime',
        'is_default' => 'boolean',
        'status' => 'boolean',
    ];

    /**
     * Faculties linked to this Google Drive account.
     */
    public function faculties(): HasMany
    {
        return $this->hasMany(Faculty::class, 'drive_id');
    }

    /**
     * Departments linked to this Google Drive account.
     */
    public function departments(): HasMany
    {
        return $this->hasMany(Department::class, 'drive_id');
    }

    /**
     * Courses linked to this Google Drive account.
     */
    public function courses(): HasMany
    {
        return $this->hasMany(Course::class, 'drive_id');
    }

    /**
     * Documents stored on this Google Drive account.
     */
    public function documents(): HasMany
    {
        return $this->hasMany(Document::class, 'google_drive_id');
    }
}
