<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\AutomationController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DelegateController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentFavoriteController;
use App\Http\Controllers\DocumentTagController;
use App\Http\Controllers\DownloadsController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\GoogleDriveController;
use App\Http\Controllers\LevelController;
use App\Http\Controllers\MaintenanceController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SecondaryAIController;
use App\Http\Controllers\SemesterController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\SystemLogController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

Route::prefix('v1')->group(function () {
    // Auth routes
    Route::post('register', [AuthController::class, 'register'])->name('auth.register');
    Route::post('login', [AuthController::class, 'login'])->name('auth.login');

    // Public routes — Explorer (cours comme source principale, LEFT JOIN documents)
    Route::get('faculties', [FacultyController::class, 'index'])->name('faculties.index.public');
    Route::get('faculties/{faculty}', [FacultyController::class, 'show'])->name('faculties.show.public');
    Route::get('faculties/{faculty}/departments', [DepartmentController::class, 'byFaculty'])->name('faculties.departments.public');
    Route::get('departments', [DepartmentController::class, 'index'])->name('departments.index.public');
    Route::get('departments/{department}', [DepartmentController::class, 'show'])->name('departments.show.public');
    Route::get('departments/{department}/courses', [CourseController::class, 'byDepartment'])->name('departments.courses.public');
    Route::get('levels', [LevelController::class, 'index'])->name('levels.index.public');
    Route::get('levels/{level}', [LevelController::class, 'show'])->name('levels.show.public');
    Route::get('levels/active-ordered', [LevelController::class, 'activeOrdered'])->name('levels.activeOrdered.public');
    Route::get('semesters', [SemesterController::class, 'index'])->name('semesters.index.public');
    Route::get('semesters/{semester}', [SemesterController::class, 'show'])->name('semesters.show.public');
    Route::get('semesters/active-ordered', [SemesterController::class, 'activeOrdered'])->name('semesters.activeOrdered.public');
    Route::get('courses', [CourseController::class, 'index'])->name('courses.index.public');
    Route::get('courses/search', [CourseController::class, 'search'])->name('courses.search.public');
    Route::get('courses/{course}', [CourseController::class, 'show'])->name('courses.show.public');
    Route::get('semesters/{semester}/courses', [CourseController::class, 'bySemester'])->name('semesters.courses.public');
    Route::get('levels/{level}/courses', [CourseController::class, 'byLevel'])->name('levels.courses.public');
    Route::get('documents', [DocumentController::class, 'index'])->name('documents.index.public');
    Route::get('documents/{document}', [DocumentController::class, 'show'])->name('documents.show.public');
    Route::prefix('documents')->group(function () {
        Route::get('featured', [DocumentController::class, 'featured'])->name('documents.featured');
        Route::post('{id}/view', [DocumentController::class, 'incrementView'])->name('documents.incrementView');
        Route::post('{id}/download', [DocumentController::class, 'incrementDownload'])->name('documents.incrementDownload');
        // Fichier physique : aperçu inline (GET) ou téléchargement (?download=1). Public pour les docs approuvés.
        Route::get('{id}/file', [DocumentController::class, 'file'])->name('documents.file');
        Route::get('{id}/preview', [DocumentController::class, 'file'])->name('documents.preview');
    });

    Route::get('maintenance/status', [MaintenanceController::class, 'status'])->name('maintenance.status');

    Route::get('search', [SearchController::class, 'search'])->name('search.documents');
    Route::get('search/popular', [SearchController::class, 'popularQueries'])->name('search.popularQueries');

    // Authenticated routes
    Route::middleware(['auth:sanctum'])->group(function () {
        Route::post('logout', [AuthController::class, 'logout'])->name('auth.logout');
        Route::get('me', [AuthController::class, 'me'])->name('auth.me');
        Route::put('profile', [AuthController::class, 'updateProfile'])->name('auth.profile');

        Route::apiResource('faculties', FacultyController::class)->except(['index', 'show']);
        Route::apiResource('departments', DepartmentController::class)->except(['index', 'show']);

        Route::apiResource('levels', LevelController::class)->except(['index', 'show']);
        Route::apiResource('semesters', SemesterController::class)->except(['index', 'show']);

        Route::apiResource('courses', CourseController::class)->except(['index', 'show']);
        // Search reste public (déjà exposé), pas de doublon ici

        Route::apiResource('documents', DocumentController::class)->except(['index', 'show']);

        // Classification manuelle (fallback upload) : avant la ressource pour
        // éviter toute capture par {document} (PATCH documents/{document} = update).
        Route::patch('documents/{id}/classify', [DocumentController::class, 'classify'])->name('documents.classify');

        Route::apiResource('document-tags', DocumentTagController::class);
        Route::get('document-tags/by-slug/{slug}', [DocumentTagController::class, 'bySlug'])->name('document-tags.bySlug');
        Route::get('documents/{document}/tags', [DocumentTagController::class, 'byDocument'])->name('documents.tags');

        Route::post('maintenance/toggle', [MaintenanceController::class, 'toggle'])->name('maintenance.toggle');

        Route::apiResource('users', UserController::class);
        Route::post('users/{id}/reset-password', [UserController::class, 'resetPassword'])->name('users.resetPassword');
        Route::get('users/by-email/{email}', [UserController::class, 'byEmail'])->name('users.byEmail');
        Route::get('users/by-uuid/{uuid}', [UserController::class, 'byUuid'])->name('users.byUuid');
        Route::get('users/by-role/{role}', [UserController::class, 'byRole'])->name('users.byRole');

        // Spécifiques avant la ressource (évite la capture par {google_drive})
        Route::get('google-drives/default', [GoogleDriveController::class, 'defaultDrive'])->name('google-drives.default');
        Route::get('google-drives/active-by-priority', [GoogleDriveController::class, 'activeByPriority'])->name('google-drives.activeByPriority');
        Route::apiResource('google-drives', GoogleDriveController::class);

        Route::prefix('notifications')->group(function () {
            // Broadcast custom (admin) — must be before {id} param route
            Route::post('broadcast', [NotificationController::class, 'broadcast'])->name('notifications.broadcast');
            // Convenience endpoints for authenticated user (avoid IDOR)
            Route::get('me', [NotificationController::class, 'me'])->name('notifications.me');
            Route::get('me/unread', [NotificationController::class, 'myUnread'])->name('notifications.myUnread');
            Route::post('{userId}/upload', [NotificationController::class, 'notifyUpload'])->name('notifications.notifyUpload');
            Route::post('{userId}/approval', [NotificationController::class, 'notifyApproval'])->name('notifications.notifyApproval');
            Route::post('{userId}/rejection', [NotificationController::class, 'notifyRejection'])->name('notifications.notifyRejection');
            Route::get('user/{userId}', [NotificationController::class, 'byUser'])->name('notifications.byUser');
            Route::get('user/{userId}/unread', [NotificationController::class, 'unreadByUser'])->name('notifications.unreadByUser');
            Route::patch('{id}/read', [NotificationController::class, 'markAsRead'])->name('notifications.markAsRead');
        });

        Route::prefix('statistics')->group(function () {
            Route::post('{documentId}/popularity', [StatisticsController::class, 'updatePopularity'])->name('statistics.updatePopularity');
            Route::post('recalculate', [StatisticsController::class, 'recalculate'])->name('statistics.recalculate');
        });

        Route::prefix('automation')->group(function () {
            Route::post('{driveId}/sync', [AutomationController::class, 'synchronizeDrive'])->name('automation.synchronizeDrive');
            Route::post('process-pending', [AutomationController::class, 'processPendingDocuments'])->name('automation.processPendingDocuments');
            Route::get('target-drive', [AutomationController::class, 'resolveTargetDrive'])->name('automation.resolveTargetDrive');
        });

        Route::prefix('upload')->group(function () {
            Route::post('validate-file', [UploadController::class, 'validateFile'])->name('upload.validateFile');
            Route::post('compute-hash', [UploadController::class, 'computeHash'])->name('upload.computeHash');
            Route::post('detect-mime-type', [UploadController::class, 'detectMimeType'])->name('upload.detectMimeType');
            Route::get('duplicate-by-hash/{hash}', [UploadController::class, 'findDuplicateByHash'])->name('upload.findDuplicateByHash');
            Route::post('recognize', [UploadController::class, 'recognize'])->name('upload.recognize');
        });

        Route::get('system-logs', [SystemLogController::class, 'index'])->name('system-logs.index');

        // Historique des telechargements (table existante, sans migration).
        Route::get('downloads/mine', [DownloadsController::class, 'mine'])->name('downloads.mine');

        // IA secondaire : statut + toggle/cle (admin, lecture seule, sans DB).
        Route::get('secondary-ai/status', [SecondaryAIController::class, 'status'])->name('secondary-ai.status');
        Route::put('secondary-ai/settings', [SecondaryAIController::class, 'update'])->name('secondary-ai.update');

        // Espace Delegue : stats scopees, passation autonome, revocation admin.
        Route::prefix('delegate')->group(function () {
            Route::get('stats', [DelegateController::class, 'stats'])->name('delegate.stats');
            Route::post('handover', [DelegateController::class, 'handover'])->name('delegate.handover');
            Route::post('promote', [DelegateController::class, 'promote'])->name('delegate.promote');
            Route::post('revoke', [DelegateController::class, 'revoke'])->name('delegate.revoke');
            Route::get('students', [DelegateController::class, 'students'])->name('delegate.students');
            Route::post('students/{id}/reset-password', [DelegateController::class, 'resetPassword'])->name('delegate.resetPassword');
        });

        Route::prefix('favorites')->group(function () {
            Route::get('/', [DocumentFavoriteController::class, 'index'])->name('favorites.index');
            Route::post('/{document}', [DocumentFavoriteController::class, 'store'])->name('favorites.store');
            Route::delete('/{document}', [DocumentFavoriteController::class, 'destroy'])->name('favorites.destroy');
            Route::get('/{document}/check', [DocumentFavoriteController::class, 'check'])->name('favorites.check');
        });
    });
});
