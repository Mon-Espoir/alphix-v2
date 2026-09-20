<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Course;
use Illuminate\Auth\Access\HandlesAuthorization;

class CoursePolicy
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
    public function view(User $user, Course $course): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     * Admins partout, delegues dans leur departement (scope verifie en controleur).
     */
    public function create(User $user): bool
    {
        return $this->isAdmin($user) || $this->isDelegate($user);
    }

    /**
     * Determine whether the user can create a course in the given
     * department + level. Delegue sans classe => perimetre departement.
     */
    public function createInDepartment(User $user, int $departmentId, ?int $levelId = null): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if (! $this->isDelegate($user) || $user->department_id === null) {
            return false;
        }

        if ((int) $user->department_id !== $departmentId) {
            return false;
        }

        return $user->level_id === null || $levelId === null || (int) $user->level_id === $levelId;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Course $course): bool
    {
        return $this->canWrite($user, $course);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Course $course): bool
    {
        return $this->canWrite($user, $course);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Course $course): bool
    {
        return $this->canWrite($user, $course);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Course $course): bool
    {
        return $this->canWrite($user, $course);
    }

    /**
     * Ecriture : admin partout, delegue limite a son departement et,
     * s'il a une classe, aux cours de cette classe.
     */
    private function canWrite(User $user, Course $course): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if (! $this->isDelegate($user) || $user->department_id === null) {
            return false;
        }

        if ((int) $course->department_id !== (int) $user->department_id) {
            return false;
        }

        return $user->level_id === null || (int) $course->level_id === (int) $user->level_id;
    }

    /**
     * Roles d'administration (alignes sur frontend ADMIN_ROLES).
     */
    private function isAdmin(User $user): bool
    {
        return in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true);
    }

    /**
     * Role delegue (Espace Delegue, perimetre departement).
     */
    private function isDelegate(User $user): bool
    {
        return strtolower((string) $user->role) === 'delegate';
    }
}
