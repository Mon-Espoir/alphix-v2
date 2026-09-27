<?php

namespace App\Policies;

use App\Models\User;
use Illuminate\Auth\Access\HandlesAuthorization;

class UserPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     * Admins uniquement : la liste des utilisateurs est sensible
     * (anti-énumération). Les stats publiques ne doivent pas passer par ici.
     */
    public function viewAny(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $currentUser, User $modelUser): bool
    {
        return $this->isAdmin($currentUser);
    }

    /**
     * Determine whether the user can create models.
     * L'inscription publique passe par /register : ici, admins uniquement.
     */
    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can update the model.
     * Admins uniquement (statut, role, rattachements).
     */
    public function update(User $currentUser, User $modelUser): bool
    {
        return $this->isAdmin($currentUser);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $currentUser, User $modelUser): bool
    {
        return $this->isAdmin($currentUser);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $currentUser, User $modelUser): bool
    {
        return $this->isAdmin($currentUser);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $currentUser, User $modelUser): bool
    {
        return $this->isAdmin($currentUser);
    }

    /**
     * Roles d'administration (alignes sur frontend ADMIN_ROLES).
     */
    private function isAdmin(User $user): bool
    {
        return in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true);
    }
}
