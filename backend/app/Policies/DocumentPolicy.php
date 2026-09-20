<?php

namespace App\Policies;

use App\Models\User;
use App\Models\Document;
use Illuminate\Auth\Access\HandlesAuthorization;

class DocumentPolicy
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
    public function view(User $user, Document $document): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create models.
     * Autorisation totale : tout etudiant connecte peut deposer (PDF, Word...).
     * La validation (pending -> approved) reste reservee aux admins/delegues.
     */
    public function create(User $user): bool
    {
        return true;
    }

    /**
     * Determine whether the user can create a document for the given course.
     * Depot libre & guide : cours null ou hors perimetre autorise, le document
     * part en attente de validation. Detection IA propose le bon cours/type.
     */
    public function createForCourse(User $user, ?int $courseId): bool
    {
        return true;
    }

    /**
     * Determine whether the user can update the model.
     */
    public function update(User $user, Document $document): bool
    {
        return $this->canWrite($user, $document);
    }

    /**
     * Determine whether the user can delete the model.
     */
    public function delete(User $user, Document $document): bool
    {
        return $this->canWrite($user, $document);
    }

    /**
     * Determine whether the user can restore the model.
     */
    public function restore(User $user, Document $document): bool
    {
        return $this->canWrite($user, $document);
    }

    /**
     * Determine whether the user can permanently delete the model.
     */
    public function forceDelete(User $user, Document $document): bool
    {
        return $this->canWrite($user, $document);
    }

    /**
     * Ecriture : admin partout, delegue limite aux documents de son
     * departement et de sa classe (via le cours) ou a ses propres
     * documents sans cours.
     */
    private function canWrite(User $user, Document $document): bool
    {
        if ($this->isAdmin($user)) {
            return true;
        }

        if (! $this->isDelegate($user) || $user->department_id === null) {
            return false;
        }

        $course = $document->course;

        if ($course === null) {
            return (int) $document->user_id === (int) $user->id;
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
