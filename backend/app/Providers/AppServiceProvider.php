<?php

namespace App\Providers;

use App\Repositories\CourseRepository;
use App\Repositories\DepartmentRepository;
use App\Repositories\DocumentRepository;
use App\Repositories\DocumentTagRepository;
use App\Repositories\FacultyRepository;
use App\Repositories\GoogleDriveRepository;
use App\Repositories\LevelRepository;
use App\Repositories\NotificationRepository;
use App\Repositories\SearchRepository;
use App\Repositories\SemesterRepository;
use App\Repositories\UserRepository;
use App\Services\AutomationService;
use App\Services\CourseService;
use App\Services\DepartmentService;
use App\Services\DocumentService;
use App\Services\FacultyService;
use App\Services\GoogleDriveService;
use App\Services\NotificationService;
use App\Services\SearchService;
use App\Services\StatisticsService;
use App\Services\UploadService;
use Illuminate\Support\ServiceProvider;

class AppServiceProvider extends ServiceProvider
{
    /**
     * Register any application services.
     */
    public function register(): void
    {
        $this->app->singleton(FacultyRepository::class);
        $this->app->singleton(DepartmentRepository::class);
        $this->app->singleton(LevelRepository::class);
        $this->app->singleton(SemesterRepository::class);
        $this->app->singleton(GoogleDriveRepository::class);
        $this->app->singleton(CourseRepository::class);
        $this->app->singleton(DocumentRepository::class);
        $this->app->singleton(UserRepository::class);
        $this->app->singleton(SearchRepository::class);
        $this->app->singleton(NotificationRepository::class);
        $this->app->singleton(DocumentTagRepository::class);

        $this->app->singleton(FacultyService::class);
        $this->app->singleton(DepartmentService::class);
        $this->app->singleton(CourseService::class);
        $this->app->singleton(DocumentService::class);
        $this->app->singleton(SearchService::class);
        $this->app->singleton(NotificationService::class);
        $this->app->singleton(GoogleDriveService::class);
        $this->app->singleton(StatisticsService::class);
        $this->app->singleton(AutomationService::class);
        $this->app->singleton(UploadService::class);
        $this->app->singleton(AuthenticationService::class);
        $this->app->singleton(SecondaryAIService::class);
    }

    /**
     * Bootstrap any application services.
     */
    public function boot(): void
    {
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Document::class, \App\Policies\DocumentPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Course::class, \App\Policies\CoursePolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Faculty::class, \App\Policies\FacultyPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\Department::class, \App\Policies\DepartmentPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\GoogleDrive::class, \App\Policies\GoogleDrivePolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\User::class, \App\Policies\UserPolicy::class);
        \Illuminate\Support\Facades\Gate::policy(\App\Models\DocumentTag::class, \App\Policies\DocumentTagPolicy::class);
    }
}
