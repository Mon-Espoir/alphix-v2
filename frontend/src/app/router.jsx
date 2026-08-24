/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Configuration de routage (React Router v7)
 * ---------------------------------------------------------------------------
 * Routes :
 *   /              -> GuestLayout > HomePage
 *   /login         -> GuestLayout > PublicRoute > LoginPage
 *   /register      -> GuestLayout > PublicRoute > RegisterPage
 *   /dashboard     -> AppLayout   > ProtectedRoute > DashboardPage
 *   /faculties     -> AppLayout   > ProtectedRoute > FacultiesListPage
 *   /faculties/create -> AppLayout > ProtectedRoute > FacultyFormPage
 *   /faculties/:id/edit -> AppLayout > ProtectedRoute > FacultyFormPage
 *   *              -> NotFoundPage (404)
 */

import { createBrowserRouter } from 'react-router-dom'
import GuestLayout from '../layouts/GuestLayout'
import AppLayout from '../layouts/AppLayout'
import ProtectedRoute from '../components/common/ProtectedRoute'
import PublicRoute from '../components/common/PublicRoute'
import HomePage from '../pages/HomePage'
import LoginPage from '../pages/LoginPage'
import RegisterPage from '../pages/RegisterPage'
import DashboardPage from '../pages/DashboardPage'
import FacultiesListPage from '../pages/faculties/FacultiesListPage'
import FacultyFormPage from '../pages/faculties/FacultyFormPage'
import DepartmentsListPage from '../pages/departments/DepartmentsListPage'
import DepartmentFormPage from '../pages/departments/DepartmentFormPage'
import LevelsListPage from '../pages/levels/LevelsListPage'
import LevelFormPage from '../pages/levels/LevelFormPage'
import SemestersListPage from '../pages/semesters/SemestersListPage'
import SemesterFormPage from '../pages/semesters/SemesterFormPage'
import CoursesListPage from '../pages/courses/CoursesListPage'
import CourseFormPage from '../pages/courses/CourseFormPage'
import DocumentsListPage from '../pages/documents/DocumentsListPage'
import DocumentDetailsPage from '../pages/documents/DocumentDetailsPage'
import DocumentFormPage from '../pages/documents/DocumentFormPage'
import DocumentPreviewPage from '../pages/documents/DocumentPreviewPage'
import DocumentSearchPage from '../pages/documents/DocumentSearchPage'
import NotFoundPage from '../pages/NotFoundPage'
import UploadCenterPage from '../pages/upload/UploadCenterPage'
import UploadHistoryPage from '../pages/upload/UploadHistoryPage'
import StorageDashboardPage from '../pages/storage/StorageDashboardPage'
import DriveManagerPage from '../pages/storage/DriveManagerPage'
import AdminLayout from '../layouts/AdminLayout'
import AdminRoute from '../components/common/AdminRoute'
import AdminDashboardPage from '../pages/admin/AdminDashboardPage'
import AdminUsersPage from '../pages/admin/AdminUsersPage'
import AdminDocumentsPage from '../pages/admin/AdminDocumentsPage'
import AdminFacultiesPage from '../pages/admin/AdminFacultiesPage'
import AdminDepartmentsPage from '../pages/admin/AdminDepartmentsPage'
import AdminCoursesPage from '../pages/admin/AdminCoursesPage'
import AdminStoragePage from '../pages/admin/AdminStoragePage'
import AdminStatisticsPage from '../pages/admin/AdminStatisticsPage'
import AdminLogsPage from '../pages/admin/AdminLogsPage'
import AdminSettingsPage from '../pages/admin/AdminSettingsPage'
import { ROUTE_PATHS } from '../constants/routes'

/**
 * Arborescence des routes (exportee pour testabilite et reutilisation).
 */
export const routeConfig = [
  {
    path: ROUTE_PATHS.HOME,
    element: <GuestLayout />,
    children: [
      { index: true, element: <HomePage /> },
      {
        path: ROUTE_PATHS.LOGIN,
        element: (
          <PublicRoute>
            <LoginPage />
          </PublicRoute>
        ),
      },
      {
        path: ROUTE_PATHS.REGISTER,
        element: (
          <PublicRoute>
            <RegisterPage />
          </PublicRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DASHBOARD,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.FACULTIES,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <FacultiesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <FacultyFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <ProtectedRoute>
            <FacultyFormPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DEPARTMENTS,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DepartmentsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <DepartmentFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <ProtectedRoute>
            <DepartmentFormPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.LEVELS,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <LevelsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <LevelFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <ProtectedRoute>
            <LevelFormPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.SEMESTERS,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <SemestersListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <SemesterFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <ProtectedRoute>
            <SemesterFormPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.COURSES,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <CoursesListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <CourseFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <ProtectedRoute>
            <CourseFormPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DOCUMENTS,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DocumentsListPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'create',
        element: (
          <ProtectedRoute>
            <DocumentFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id',
        element: (
          <ProtectedRoute>
            <DocumentDetailsPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/edit',
        element: (
          <ProtectedRoute>
            <DocumentFormPage />
          </ProtectedRoute>
        ),
      },
      {
        path: ':id/preview',
        element: (
          <ProtectedRoute>
            <DocumentPreviewPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.SEARCH,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <DocumentSearchPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.UPLOAD,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <UploadCenterPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'history',
        element: (
          <ProtectedRoute>
            <UploadHistoryPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.STORAGE,
    element: <AppLayout />,
    children: [
      {
        index: true,
        element: (
          <ProtectedRoute>
            <StorageDashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'drives',
        element: (
          <ProtectedRoute>
            <DriveManagerPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
  {
    path: ROUTE_PATHS.ADMIN,
    element: <AdminLayout />,
    children: [
      { index: true, element: (<AdminRoute><AdminDashboardPage /></AdminRoute>) },
      { path: 'users', element: (<AdminRoute><AdminUsersPage /></AdminRoute>) },
      { path: 'documents', element: (<AdminRoute><AdminDocumentsPage /></AdminRoute>) },
      { path: 'faculties', element: (<AdminRoute><AdminFacultiesPage /></AdminRoute>) },
      { path: 'departments', element: (<AdminRoute><AdminDepartmentsPage /></AdminRoute>) },
      { path: 'courses', element: (<AdminRoute><AdminCoursesPage /></AdminRoute>) },
      { path: 'storage', element: (<AdminRoute><AdminStoragePage /></AdminRoute>) },
      { path: 'statistics', element: (<AdminRoute><AdminStatisticsPage /></AdminRoute>) },
      { path: 'logs', element: (<AdminRoute><AdminLogsPage /></AdminRoute>) },
      { path: 'settings', element: (<AdminRoute><AdminSettingsPage /></AdminRoute>) },
    ],
  },
  {
    path: '*',
    element: <NotFoundPage />,
  },
]

/**
 * Router navigateur cree une seule fois au niveau module (singleton).
 */
export const router = createBrowserRouter(routeConfig)
