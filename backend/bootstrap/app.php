<?php

use App\Http\Middleware\CheckDepartmentAccess;
use App\Http\Middleware\CheckDocumentOwnership;
use App\Http\Middleware\CheckFacultyAccess;
use App\Http\Middleware\CheckGoogleDriveAvailability;
use App\Http\Middleware\CheckRole;
use App\Http\Middleware\CheckUserStatus;
use App\Http\Middleware\EnsureDocumentPublished;
use App\Http\Middleware\LogApiRequest;
use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
use Illuminate\Http\Exceptions\PostTooLargeException;
use Illuminate\Http\Request;

return Application::configure(basePath: dirname(__DIR__))
    ->withRouting(
        web: __DIR__.'/../routes/web.php',
        api: __DIR__.'/../routes/api.php',
        commands: __DIR__.'/../routes/console.php',
        health: '/up',
    )
    ->withMiddleware(function (Middleware $middleware): void {
        $middleware->alias([
            'check.user.status' => CheckUserStatus::class,
            'check.role' => CheckRole::class,
            'check.faculty.access' => CheckFacultyAccess::class,
            'check.department.access' => CheckDepartmentAccess::class,
            'check.document.ownership' => CheckDocumentOwnership::class,
            'check.google.drive.availability' => CheckGoogleDriveAvailability::class,
            'ensure.document.published' => EnsureDocumentPublished::class,
            'log.api.request' => LogApiRequest::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );

        // Corps de requete superieur a post_max_size : PHP vide $_POST/$_FILES
        // avant toute validation. Message clair en francais au lieu de
        // « The POST data is too large. ».
        $exceptions->render(function (PostTooLargeException $e, Request $request) {
            if ($request->is('api/*') || $request->expectsJson()) {
                return response()->json([
                    'message' => 'Le fichier est trop volumineux pour le serveur (limite depassee). Reduisez sa taille ou contactez l\'administrateur.',
                ], 413);
            }
        });
    })->create();
