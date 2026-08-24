<?php

use Illuminate\Foundation\Application;
use Illuminate\Foundation\Configuration\Exceptions;
use Illuminate\Foundation\Configuration\Middleware;
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
            'check.user.status' => \App\Http\Middleware\CheckUserStatus::class,
            'check.role' => \App\Http\Middleware\CheckRole::class,
            'check.faculty.access' => \App\Http\Middleware\CheckFacultyAccess::class,
            'check.department.access' => \App\Http\Middleware\CheckDepartmentAccess::class,
            'check.document.ownership' => \App\Http\Middleware\CheckDocumentOwnership::class,
            'check.google.drive.availability' => \App\Http\Middleware\CheckGoogleDriveAvailability::class,
            'ensure.document.published' => \App\Http\Middleware\EnsureDocumentPublished::class,
            'log.api.request' => \App\Http\Middleware\LogApiRequest::class,
        ]);
    })
    ->withExceptions(function (Exceptions $exceptions): void {
        $exceptions->shouldRenderJsonWhen(
            fn (Request $request) => $request->is('api/*') || $request->expectsJson(),
        );
    })->create();
