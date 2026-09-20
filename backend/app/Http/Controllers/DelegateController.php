<?php

namespace App\Http\Controllers;

use App\Models\Course;
use App\Models\Department;
use App\Models\Document;
use App\Models\Level;
use App\Models\User;
use App\Services\NotificationService;
use App\Services\SystemLogService;
use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Espace Delegue (RBAC 3 niveaux)
 * ---------------------------------------------------------------------------
 * Stats scopees au departement du delegue, passation autonome par email et
 * revocation super admin. Aucune migration supplementaire requise.
 */
class DelegateController extends Controller
{
    public function __construct(
        protected NotificationService $notifications,
        protected SystemLogService $systemLogs
    ) {}

    /**
     * Stats scopees : cours du departement du delegue + ses propres depots.
     */
    public function stats(Request $request): JsonResponse
    {
        $me = $this->requireDelegate($request);
        $departmentId = (int) $me->department_id;

        $courses = Course::query()
            ->where('department_id', $departmentId)
            ->orderBy('name')
            ->get(['id', 'code', 'name', 'status']);

        $courseIds = $courses->pluck('id');

        $documents = $courseIds->isEmpty()
            ? collect([])
            : Document::query()
                ->whereIn('course_id', $courseIds)
                ->get(['id', 'course_id', 'user_id', 'views_count', 'downloads_count', 'status']);

        $byCourse = [];
        foreach ($courses as $course) {
            $related = $documents->where('course_id', $course->id);
            $byCourse[] = [
                'id' => $course->id,
                'code' => $course->code,
                'name' => $course->name,
                'status' => $course->status,
                'documents_count' => $related->count(),
                'views' => (int) $related->sum('views_count'),
                'downloads' => (int) $related->sum('downloads_count'),
                'pending' => $related->whereIn('status', ['pending', 'processing'])->count(),
            ];
        }

        $level = $me->level_id !== null
            ? Level::query()->find((int) $me->level_id)
            : null;

        return response()->json([
            'data' => [
                'department_id' => $departmentId,
                'level' => $level ? ['id' => $level->id, 'name' => $level->name, 'code' => $level->code] : null,
                'totals' => [
                    'courses' => $courses->count(),
                    'documents' => $documents->count(),
                    'views' => (int) $documents->sum('views_count'),
                    'downloads' => (int) $documents->sum('downloads_count'),
                    'pending' => $documents->whereIn('status', ['pending', 'processing'])->count(),
                    'my_uploads' => Document::query()->where('user_id', $me->id)->count(),
                ],
                'courses' => $byCourse,
            ],
        ]);
    }

    /**
     * Passation autonome : le delegue actif promeut son successeur par email
     * (meme departement) et redevient lui-meme etudiant.
     */
    public function handover(Request $request): JsonResponse
    {
        $me = $this->requireDelegate($request);

        $validated = $request->validate([
            'email' => ['required', 'email', 'max:255'],
        ]);

        $target = User::query()->where('email', $validated['email'])->first();

        if ($target === null) {
            return response()->json(['message' => 'Aucun compte avec cet email.'], 422);
        }

        if ((int) $target->id === (int) $me->id) {
            return response()->json(['message' => 'Vous ne pouvez pas vous designer vous-meme.'], 422);
        }

        if (! in_array(strtolower((string) $target->role), ['student', 'teacher'], true)) {
            return response()->json(['message' => 'Ce compte ne peut pas devenir delegue (role incompatible).'], 422);
        }

        if ($target->department_id !== null && (int) $target->department_id !== (int) $me->department_id) {
            return response()->json(['message' => 'Le successeur doit appartenir au meme departement.'], 422);
        }

        if ($me->level_id !== null
            && $target->level_id !== null
            && (int) $target->level_id !== (int) $me->level_id) {
            return response()->json(['message' => 'Le successeur doit etre de la meme classe (niveau).'], 422);
        }

        DB::transaction(function () use ($me, $target): void {
            $target->update(array_filter([
                'role' => 'delegate',
                'department_id' => $me->department_id,
                'faculty_id' => $target->faculty_id ?? $me->faculty_id,
                'level_id' => $target->level_id ?? $me->level_id,
            ], fn ($v) => $v !== null));
            $me->update(['role' => 'student']);
        });

        try {
            $this->systemLogs->log($request, [
                'event_type' => 'delegate.handover',
                'module' => 'delegate',
                'action' => 'handover',
                'level' => 'info',
                'status' => 'success',
                'message' => "Passation delegue : {$me->email} -> {$target->email} (departement #{$me->department_id})",
                'user_id' => $me->id,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            $this->notifications->notifyApproval((int) $target->id, [
                'title' => 'Vous etes designe delegue',
                'data' => [
                    'type' => 'delegate.handover',
                    'department_id' => $me->department_id,
                    'previous_delegate' => $me->email,
                ],
            ]);
        } catch (\Throwable) {
            // La passation reste valide meme si la notification echoue.
        }

        return response()->json([
            'message' => 'Passation effectuee. Votre role est redevenu etudiant.',
            'data' => [
                'new_delegate' => $target->email,
                'department_id' => $me->department_id,
            ],
        ]);
    }

    /**
     * Nomination super admin : promeut un compte (email ou user_id) au role
     * delegue. Le departement peut etre impose (sinon celui du compte, requis).
     */
    public function promote(Request $request): JsonResponse
    {
        $me = $request->user();

        if ($me === null || ! $this->isAdmin($me)) {
            abort(403, 'Action reservee au super administrateur.');
        }

        $validated = $request->validate([
            'user_id' => ['sometimes', 'integer', 'exists:users,id'],
            'email' => ['sometimes', 'email', 'max:255'],
            'department_id' => ['sometimes', 'integer', 'exists:departments,id'],
            'level_id' => ['sometimes', 'nullable', 'integer', 'exists:levels,id'],
        ]);

        /** @var User|null $target */
        $target = null;

        if (! empty($validated['user_id'])) {
            $target = User::query()->find($validated['user_id']);
        } elseif (! empty($validated['email'])) {
            $target = User::query()->where('email', $validated['email'])->first();
        }

        if ($target === null) {
            return response()->json(['message' => 'Compte introuvable (user_id ou email requis).'], 422);
        }

        if ((int) $target->id === (int) $me->id) {
            return response()->json(['message' => 'Vous ne pouvez pas vous nommer vous-meme.'], 422);
        }

        if (! in_array(strtolower((string) $target->role), ['student', 'teacher'], true)) {
            return response()->json(['message' => 'Ce compte ne peut pas devenir delegue (role incompatible).'], 422);
        }

        $departmentId = $validated['department_id'] ?? $target->department_id;

        if ($departmentId === null) {
            return response()->json(['message' => 'Attribuez un departement a ce compte avant de le nommer delegue.'], 422);
        }

        $department = Department::query()->find((int) $departmentId);

        $target->update(array_filter([
            'role' => 'delegate',
            'department_id' => (int) $departmentId,
            'faculty_id' => $target->faculty_id ?? $department?->faculty_id,
            'level_id' => $validated['level_id'] ?? $target->level_id,
        ], fn ($v) => $v !== null));

        try {
            $this->systemLogs->log($request, [
                'event_type' => 'delegate.promote',
                'module' => 'delegate',
                'action' => 'promote',
                'level' => 'info',
                'status' => 'success',
                'message' => "Delegue nomme : {$target->email} (departement #{$departmentId}) par {$me->email}",
                'user_id' => $me->id,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        try {
            $this->notifications->notifyApproval((int) $target->id, [
                'title' => 'Vous etes nomme delegue',
                'data' => [
                    'type' => 'delegate.promote',
                    'department_id' => (int) $departmentId,
                    'level_id' => $target->fresh()?->level_id,
                ],
            ]);
        } catch (\Throwable) {
            // La nomination reste valide meme si la notification echoue.
        }

        return response()->json([
            'message' => 'Delegue nomme.',
            'data' => [
                'email' => $target->email,
                'department_id' => (int) $departmentId,
                'level_id' => $target->fresh()?->level_id,
            ],
        ]);
    }

    /**
     * Revocation super admin : retire le role delegue (retour etudiant).
     */
    public function revoke(Request $request): JsonResponse
    {
        $me = $request->user();

        if ($me === null || ! $this->isAdmin($me)) {
            abort(403, 'Action reservee au super administrateur.');
        }

        $validated = $request->validate([
            'user_id' => ['required', 'integer', 'exists:users,id'],
        ]);

        /** @var User $target */
        $target = User::query()->findOrFail($validated['user_id']);

        if (strtolower((string) $target->role) !== 'delegate') {
            return response()->json(['message' => 'Ce compte n\'est pas delegue.'], 422);
        }

        $target->update(['role' => 'student']);

        try {
            $this->systemLogs->log($request, [
                'event_type' => 'delegate.revoke',
                'module' => 'delegate',
                'action' => 'revoke',
                'level' => 'warning',
                'status' => 'success',
                'message' => "Delegue revoque : {$target->email} par {$me->email}",
                'user_id' => $me->id,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => 'Delegue revoque.',
            'data' => ['email' => $target->email],
        ]);
    }

    /**
     * Etudiants de la promotion/classe du delegue (reservation de mot de passe).
     */
    public function students(Request $request): JsonResponse
    {
        $me = $this->requireDelegate($request);
        $departmentId = (int) $me->department_id;

        $query = User::query()
            ->where('role', 'student')
            ->where('department_id', $departmentId)
            ->orderBy('name');

        if ($me->level_id !== null) {
            $query->where('level_id', (int) $me->level_id);
        }

        $students = $query->get(['id', 'name', 'username', 'email', 'level_id']);

        return response()->json([
            'data' => $students,
        ]);
    }

    /**
     * Reinitialisation du mot de passe d'un etudiant de la meme classe.
     */
    public function resetPassword(Request $request, int $id): JsonResponse
    {
        $me = $this->requireDelegate($request);

        $validated = $request->validate([
            'password' => ['nullable', 'string', 'min:8'],
        ]);

        $target = User::query()->find($id);

        if ($target === null) {
            return response()->json(['message' => 'Etudiant introuvable.'], 404);
        }

        if (strtolower((string) $target->role) !== 'student') {
            return response()->json(['message' => 'Seuls les comptes etudiants peuvent etre reinitialises.'], 422);
        }

        if ((int) $target->department_id !== (int) $me->department_id) {
            return response()->json(['message' => 'Cet etudiant n\'appartient pas a votre departement.'], 422);
        }

        if ($me->level_id === null || (int) $target->level_id !== (int) $me->level_id) {
            return response()->json(['message' => 'Cet etudiant n\'appartient pas a votre classe (promotion).'], 422);
        }

        $password = isset($validated['password']) && $validated['password'] !== null
            ? $validated['password']
            : Str::password(12);

        $target->update(['password' => Hash::make($password)]);

        $target->tokens()->delete();

        try {
            $this->systemLogs->log($request, [
                'event_type' => 'delegate.password_reset',
                'module' => 'delegate',
                'action' => 'password_reset',
                'level' => 'info',
                'status' => 'success',
                'message' => "Mot de passe reinitialise : {$target->email} (departement #{$me->department_id}) par delegue {$me->email}",
                'user_id' => $me->id,
            ]);
        } catch (\Throwable $e) {
            report($e);
        }

        return response()->json([
            'message' => 'Mot de passe reinitialise.',
            'data' => [
                'email' => $target->email,
                'username' => $target->username,
                'temporary_password' => isset($validated['password']) && $validated['password'] !== null ? null : $password,
            ],
        ]);
    }

    /**
     * Delegue actif avec departement rattache, sinon 403/422.
     */
    private function requireDelegate(Request $request): User
    {
        $user = $request->user();

        if ($user === null || strtolower((string) $user->role) !== 'delegate') {
            abort(403, 'Espace reserve aux delegues.');
        }

        if ($user->department_id === null) {
            abort(422, 'Delegue sans departement rattache.');
        }

        return $user;
    }

    /**
     * Roles d'administration (alignes sur frontend ADMIN_ROLES).
     */
    private function isAdmin(User $user): bool
    {
        return in_array(strtolower((string) $user->role), ['administrator', 'admin', 'super_admin', 'superadmin'], true);
    }
}
