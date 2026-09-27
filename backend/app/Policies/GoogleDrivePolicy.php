<?php

namespace App\Policies;

use App\Models\User;
use App\Models\GoogleDrive;
use Illuminate\Auth\Access\HandlesAuthorization;

class GoogleDrivePolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     * Lecture ouverte : le centre d'upload (tous les connectés) a besoin
     * du drive actif par priorité.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, GoogleDrive $googleDrive): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     * Écriture réservée aux admins (les pages d'écriture sont AdminRoute).
     */
    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, GoogleDrive $googleDrive): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, GoogleDrive $googleDrive): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, GoogleDrive $googleDrive): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, GoogleDrive $googleDrive): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Roles d'administration (alignes sur UserPolicy / frontend ADMIN_ROLES).
     */
    private function isAdmin(User $user): bool
    {
        return in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true);
    }
}
