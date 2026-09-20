<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Department;
use Illuminate\Auth\Access\HandlesAuthorization;

class DepartmentPolicy
{
    use HandlesAuthorization;

    /**
     * Determine whether the user can view any models.
     */
    public function viewAny(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can view the model.
     */
    public function view(User $user, Department $department): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     * Lecture pour tous, ecriture reservee aux administrateurs.
     */
    public function create(User $user): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Department $department): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Department $department): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Department $department): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Department $department): bool
    {
        return $this->isAdmin($user);
    }

    /**
     * Roles d'administration (alignes sur frontend ADMIN_ROLES).
     */
    private function isAdmin(User $user): bool
    {
        return in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true);
    }
}
