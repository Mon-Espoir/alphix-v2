<?php

use App\Http\Controllers\AutomationController;
use App\Http\Controllers\CourseController;
use App\Http\Controllers\DepartmentController;
use App\Http\Controllers\DocumentController;
use App\Http\Controllers\DocumentTagController;
use App\Http\Controllers\FacultyController;
use App\Http\Controllers\GoogleDriveController;
use App\Http\Controllers\LevelController;
use App\Http\Controllers\NotificationController;
use App\Http\Controllers\SearchController;
use App\Http\Controllers\SemesterController;
use App\Http\Controllers\StatisticsController;
use App\Http\Controllers\UploadController;
use App\Http\Controllers\UserController;
use Illuminate\Support\Facades\Route;

use App\Http\Controllers\AuthController;

Route::prefix("v1")->group(function () {
    // Auth routes
    Route::post("register", [AuthController::class, "register"])->name("auth.register");
    Route::post("login", [AuthController::class, "login"])->name("auth.login");

    // Public routes
    Route::prefix("documents")->group(function () {
        Route::get("featured", [DocumentController::class, "featured"])->name("documents.featured");
        Route::post("{id}/view", [DocumentController::class, "incrementView"])->name("documents.incrementView");
        Route::post("{id}/download", [DocumentController::class, "incrementDownload"])->name("documents.incrementDownload");
    });

    Route::get("search", [SearchController::class, "search"])->name("search.documents");
    Route::get("search/popular", [SearchController::class, "popularQueries"])->name("search.popularQueries");

    // Authenticated routes
    Route::middleware(["auth:sanctum"])->group(function () {
        Route::post("logout", [AuthController::class, "logout"])->name("auth.logout");
        Route::get("me", [AuthController::class, "me"])->name("auth.me");
        Route::put("profile", [AuthController::class, "updateProfile"])->name("auth.profile");

        Route::apiResource("faculties", FacultyController::class);
        Route::get("faculties/{faculty}/departments", [DepartmentController::class, "byFaculty"])->name("faculties.departments");

        Route::apiResource("departments", DepartmentController::class);

        Route::apiResource("levels", LevelController::class);
        Route::get("levels/active-ordered", [LevelController::class, "activeOrdered"])->name("levels.activeOrdered");

        Route::apiResource("semesters", SemesterController::class);
        Route::get("semesters/active-ordered", [SemesterController::class, "activeOrdered"])->name("semesters.activeOrdered");

        Route::apiResource("courses", CourseController::class)->except(["index", "show"]);
        Route::get("departments/{department}/courses", [CourseController::class, "byDepartment"])->name("departments.courses");
        Route::get("semesters/{semester}/courses", [CourseController::class, "bySemester"])->name("semesters.courses");
        Route::get("levels/{level}/courses", [CourseController::class, "byLevel"])->name("levels.courses");

        Route::apiResource("documents", DocumentController::class);

        Route::apiResource("document-tags", DocumentTagController::class);
        Route::get("document-tags/by-slug/{slug}", [DocumentTagController::class, "bySlug"])->name("document-tags.bySlug");
        Route::get("documents/{document}/tags", [DocumentTagController::class, "byDocument"])->name("documents.tags");

        Route::apiResource("users", UserController::class);
        Route::get("users/by-email/{email}", [UserController::class, "byEmail"])->name("users.byEmail");
        Route::get("users/by-uuid/{uuid}", [UserController::class, "byUuid"])->name("users.byUuid");
        Route::get("users/by-role/{role}", [UserController::class, "byRole"])->name("users.byRole");

        Route::apiResource("google-drives", GoogleDriveController::class);
        Route::get("google-drives/default", [GoogleDriveController::class, "defaultDrive"])->name("google-drives.default");
        Route::get("google-drives/active-by-priority", [GoogleDriveController::class, "activeByPriority"])->name("google-drives.activeByPriority");

        Route::prefix("notifications")->group(function () {
            Route::post("{userId}/upload", [NotificationController::class, "notifyUpload"])->name("notifications.notifyUpload");
            Route::post("{userId}/approval", [NotificationController::class, "notifyApproval"])->name("notifications.notifyApproval");
            Route::post("{userId}/rejection", [NotificationController::class, "notifyRejection"])->name("notifications.notifyRejection");
            Route::get("user/{userId}", [NotificationController::class, "byUser"])->name("notifications.byUser");
            Route::get("user/{userId}/unread", [NotificationController::class, "unreadByUser"])->name("notifications.unreadByUser");
            Route::patch("{id}/read", [NotificationController::class, "markAsRead"])->name("notifications.markAsRead");
        });

        Route::prefix("statistics")->group(function () {
            Route::post("{documentId}/popularity", [StatisticsController::class, "updatePopularity"])->name("statistics.updatePopularity");
            Route::post("recalculate", [StatisticsController::class, "recalculate"])->name("statistics.recalculate");
        });

        Route::prefix("automation")->group(function () {
            Route::post("{driveId}/sync", [AutomationController::class, "synchronizeDrive"])->name("automation.synchronizeDrive");
            Route::post("process-pending", [AutomationController::class, "processPendingDocuments"])->name("automation.processPendingDocuments");
            Route::get("target-drive", [AutomationController::class, "resolveTargetDrive"])->name("automation.resolveTargetDrive");
        });

        Route::prefix("upload")->group(function () {
            Route::post("validate-file", [UploadController::class, "validateFile"])->name("upload.validateFile");
            Route::post("compute-hash", [UploadController::class, "computeHash"])->name("upload.computeHash");
            Route::post("detect-mime-type", [UploadController::class, "detectMimeType"])->name("upload.detectMimeType");
            Route::get("duplicate-by-hash/{hash}", [UploadController::class, "findDuplicateByHash"])->name("upload.findDuplicateByHash");
        });
    });
});
