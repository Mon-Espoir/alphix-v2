/* eslint-disable react-refresh/only-export-components */
/**
 * ---------------------------------------------------------------------------
 * ALPHIX V2 — Configuration de routage (React Router v7)
 * ---------------------------------------------------------------------------
 * Lazy loading par route : chaque page est code-splittee (dynamic import).
 * Suspense centralise avec <LoadingScreen>. Layouts & guards restent
 * eager (taille negligeable, necessaires au premier rendu).
 */

import { lazy, Suspense, createElement } from 'react'
import { createBrowserRouter, Navigate } from 'react-router-dom'
import GuestLayout from '../layouts/GuestLayout'
import AppLayout from '../layouts/AppLayout'
import ProtectedRoute from '../components/common/ProtectedRoute'
import PublicRoute from '../components/common/PublicRoute'
import AdminLayout from '../layouts/AdminLayout'
import AdminRoute from '../components/common/AdminRoute'
import DelegateRoute from '../components/common/DelegateRoute'
import LoadingScreen from '../components/feedback/LoadingScreen'
import NotFoundPage from '../pages/NotFoundPage'
import { ROUTE_PATHS } from '../constants/routes'

// Lazy pages — code splitting per route
const HomePage = lazy(() => import('../pages/HomePage'))
const LoginPage = lazy(() => import('../pages/LoginPage'))
const RegisterPage = lazy(() => import('../pages/RegisterPage'))
const DashboardPage = lazy(() => import('../pages/DashboardPage'))
const DownloadsPage = lazy(() => import('../pages/DownloadsPage'))
const FacultiesListPage = lazy(() => import('../pages/faculties/FacultiesListPage'))
const FacultyFormPage = lazy(() => import('../pages/faculties/FacultyFormPage'))
const DepartmentsListPage = lazy(() => import('../pages/departments/DepartmentsListPage'))
const DepartmentFormPage = lazy(() => import('../pages/departments/DepartmentFormPage'))
const LevelsListPage = lazy(() => import('../pages/levels/LevelsListPage'))
const LevelFormPage = lazy(() => import('../pages/levels/LevelFormPage'))
const SemestersListPage = lazy(() => import('../pages/semesters/SemestersListPage'))
const SemesterFormPage = lazy(() => import('../pages/semesters/SemesterFormPage'))
const CoursesListPage = lazy(() => import('../pages/courses/CoursesListPage'))
const CourseFormPage = lazy(() => import('../pages/courses/CourseFormPage'))
const DocumentsListPage = lazy(() => import('../pages/documents/DocumentsListPage'))
const DocumentDetailsPage = lazy(() => import('../pages/documents/DocumentDetailsPage'))
const DocumentFormPage = lazy(() => import('../pages/documents/DocumentFormPage'))
const DocumentPreviewPage = lazy(() => import('../pages/documents/DocumentPreviewPage'))
const DocumentSearchPage = lazy(() => import('../pages/documents/DocumentSearchPage'))
const UploadCenterPage = lazy(() => import('../pages/upload/UploadCenterPage'))
const UploadHistoryPage = lazy(() => import('../pages/upload/UploadHistoryPage'))
const StorageDashboardPage = lazy(() => import('../pages/storage/StorageDashboardPage'))
const DriveManagerPage = lazy(() => import('../pages/storage/DriveManagerPage'))
const AdminDashboardPage = lazy(() => import('../pages/admin/AdminDashboardPage'))
const AdminUsersPage = lazy(() => import('../pages/admin/AdminUsersPage'))
const AdminDocumentsPage = lazy(() => import('../pages/admin/AdminDocumentsPage'))
const AdminFacultiesPage = lazy(() => import('../pages/admin/AdminFacultiesPage'))
const AdminDepartmentsPage = lazy(() => import('../pages/admin/AdminDepartmentsPage'))
const AdminCoursesPage = lazy(() => import('../pages/admin/AdminCoursesPage'))
const AdminStoragePage = lazy(() => import('../pages/admin/AdminStoragePage'))
const AdminStatisticsPage = lazy(() => import('../pages/admin/AdminStatisticsPage'))
const AdminLogsPage = lazy(() => import('../pages/admin/AdminLogsPage'))
const AdminSettingsPage = lazy(() => import('../pages/admin/AdminSettingsPage'))
const AutomationDashboardPage = lazy(() => import('../pages/automation/AutomationDashboardPage'))
const DelegateDashboardPage = lazy(() => import('../pages/delegate/DelegateDashboardPage'))

/**
 * Enrobe un composant lazy dans Suspense + LoadingScreen.
 * @param {React.ComponentType} Component - Composant lazy
 * @returns {import('react').JSX.Element}
 */
function lazyElement(Component) {
  return createElement(
    Suspense,
    { fallback: createElement(LoadingScreen, { label: 'Chargement de la page…' }) },
    createElement(Component),
  )
}

/**
 * Arborescence des routes (exportee pour testabilite et reutilisation).
 */
export const routeConfig = [
  {
    path: ROUTE_PATHS.HOME,
    element: createElement(GuestLayout),
    children: [
      { index: true, element: lazyElement(HomePage) },
      {
        path: ROUTE_PATHS.LOGIN,
        element: createElement(PublicRoute, null, lazyElement(LoginPage)),
      },
      {
        path: ROUTE_PATHS.REGISTER,
        element: createElement(PublicRoute, null, lazyElement(RegisterPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DASHBOARD,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(DashboardPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.FACULTIES,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(FacultiesListPage)),
      },
      {
        path: 'create',
        element: createElement(ProtectedRoute, null, lazyElement(FacultyFormPage)),
      },
      {
        path: ':id/edit',
        element: createElement(ProtectedRoute, null, lazyElement(FacultyFormPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DEPARTMENTS,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(DepartmentsListPage)),
      },
      {
        path: 'create',
        element: createElement(ProtectedRoute, null, lazyElement(DepartmentFormPage)),
      },
      {
        path: ':id/edit',
        element: createElement(ProtectedRoute, null, lazyElement(DepartmentFormPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.LEVELS,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(LevelsListPage)),
      },
      {
        path: 'create',
        element: createElement(ProtectedRoute, null, lazyElement(LevelFormPage)),
      },
      {
        path: ':id/edit',
        element: createElement(ProtectedRoute, null, lazyElement(LevelFormPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.SEMESTERS,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(SemestersListPage)),
      },
      {
        path: 'create',
        element: createElement(ProtectedRoute, null, lazyElement(SemesterFormPage)),
      },
      {
        path: ':id/edit',
        element: createElement(ProtectedRoute, null, lazyElement(SemesterFormPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.COURSES,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(CoursesListPage)),
      },
      {
        path: 'create',
        element: createElement(ProtectedRoute, null, lazyElement(CourseFormPage)),
      },
      {
        path: ':id/edit',
        element: createElement(ProtectedRoute, null, lazyElement(CourseFormPage)),
      },
    ],
  },
  {
    // Lecture invite : liste, fiche et apercu publics (telechargement protege au clic).
    path: ROUTE_PATHS.DOCUMENTS,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: lazyElement(DocumentsListPage),
      },
      {
        path: 'create',
        element: createElement(ProtectedRoute, null, lazyElement(DocumentFormPage)),
      },
      {
        path: ':id',
        element: lazyElement(DocumentDetailsPage),
      },
      {
        path: ':id/edit',
        element: createElement(ProtectedRoute, null, lazyElement(DocumentFormPage)),
      },
      {
        path: ':id/preview',
        element: lazyElement(DocumentPreviewPage),
      },
    ],
  },
  {
    // Recherche publique en lecture seule (SQL classique, sans compte).
    path: ROUTE_PATHS.SEARCH,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: lazyElement(DocumentSearchPage),
      },
    ],
  },
  {
    path: ROUTE_PATHS.UPLOAD,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(UploadCenterPage)),
      },
      {
        path: 'history',
        element: createElement(ProtectedRoute, null, lazyElement(UploadHistoryPage)),
      },
    ],
  },
  {
    // Stockage : gestion des drives Google — admins uniquement.
    path: ROUTE_PATHS.STORAGE,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(AdminRoute, null, lazyElement(StorageDashboardPage)),
      },
      {
        path: 'drives',
        element: createElement(AdminRoute, null, lazyElement(DriveManagerPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.ADMIN,
    element: createElement(AdminLayout),
    children: [
      { index: true, element: createElement(AdminRoute, null, lazyElement(AdminDashboardPage)) },
      { path: 'users', element: createElement(AdminRoute, null, lazyElement(AdminUsersPage)) },
      { path: 'documents', element: createElement(AdminRoute, null, lazyElement(AdminDocumentsPage)) },
      { path: 'faculties', element: createElement(AdminRoute, null, lazyElement(AdminFacultiesPage)) },
      { path: 'departments', element: createElement(AdminRoute, null, lazyElement(AdminDepartmentsPage)) },
      { path: 'courses', element: createElement(AdminRoute, null, lazyElement(AdminCoursesPage)) },
      { path: 'storage', element: createElement(AdminRoute, null, lazyElement(AdminStoragePage)) },
      { path: 'statistics', element: createElement(AdminRoute, null, lazyElement(AdminStatisticsPage)) },
      { path: 'logs', element: createElement(AdminRoute, null, lazyElement(AdminLogsPage)) },
      { path: 'settings', element: createElement(AdminRoute, null, lazyElement(AdminSettingsPage)) },
    ],
  },
  {
    // Automatisation : opérations plateforme (sync drives, reindex) — admins uniquement.
    path: ROUTE_PATHS.AUTOMATION,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(AdminRoute, null, lazyElement(AutomationDashboardPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DOWNLOADS,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(ProtectedRoute, null, lazyElement(DownloadsPage)),
      },
    ],
  },
  {
    path: ROUTE_PATHS.DELEGATE,
    element: createElement(AppLayout),
    children: [
      {
        index: true,
        element: createElement(DelegateRoute, null, lazyElement(DelegateDashboardPage)),
      },
    ],
  },
  {
    // Alias historique : /favorites -> /downloads (onglet Favoris).
    path: ROUTE_PATHS.FAVORITES,
    element: createElement(Navigate, { to: `${ROUTE_PATHS.DOWNLOADS}?tab=favorites`, replace: true }),
  },
  {
    path: '*',
    element: createElement(NotFoundPage),
  },
]

/**
 * Router navigateur cree une seule fois au niveau module (singleton).
 */
export const router = createBrowserRouter(routeConfig)
