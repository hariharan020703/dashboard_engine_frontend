import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes, useParams } from 'react-router-dom'
import AuthProvider from '@/context/AuthProvider'
import { useAuth } from '@/context/authContext'
import NotificationProvider from '@/ui/NotificationProvider'
import PlatformLayout from '@/layouts/PlatformLayout'
import WorkspaceLayout from '@/layouts/WorkspaceLayout'
import ActivatePage from '@/pages/ActivatePage'
import DashboardPage from '@/pages/DashboardPage'
import DataPage from '@/pages/DataPage'
import HomePage from '@/pages/HomePage'
import LoginPage from '@/pages/LoginPage'
import ProfilePage from '@/pages/ProfilePage'
import CompaniesPage from '@/pages/admin/CompaniesPage'
import GroupsPage from '@/pages/admin/GroupsPage'
import RolesPage from '@/pages/admin/RolesPage'
import UserDetailPage from '@/pages/admin/UserDetailPage'
import UsersPage from '@/pages/admin/UsersPage'
import PlatformOverviewPage from '@/pages/platform/PlatformOverviewPage'
import AuditLogPage from '@/pages/platform/AuditLogPage'
import PlatformSettingsPage from '@/pages/platform/PlatformSettingsPage'
import WorkspaceOverviewPage from '@/pages/workspace/WorkspaceOverviewPage'
import AccessMatrixPage from '@/pages/workspace/AccessMatrixPage'
import CompanySettingsPage from '@/pages/workspace/CompanySettingsPage'
import { PageHeader, Panel } from '@/ui/page'

function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactElement
}) {
  const { can } = useAuth()
  if (can(permission)) return children

  return (
    <div className="p-6">
      <PageHeader title="Access Restricted" />
      <Panel>
        <p className="text-sm text-slate-600">
          Your assigned role does not hold the <code className="text-slate-800 font-mono">{permission}</code>{' '}
          permission, so this area cannot be accessed.
        </p>
        <p className="mt-2 text-xs text-slate-400">
          An administrator can adjust what your role is permitted to perform.
        </p>
      </Panel>
    </div>
  )
}

function RootDispatcher() {
  const { status, user } = useAuth()
  if (status === 'RESTORING') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs text-slate-500">
        Connecting to session…
      </div>
    )
  }
  if (status !== 'AUTHENTICATED' && status !== 'PASSWORD_CHANGE_REQUIRED') {
    return <Navigate to="/login" replace />
  }
  if (user?.role === 'SUPER_ADMIN') {
    return <Navigate to="/platform" replace />
  }
  return <Navigate to="/workspace" replace />
}

function LoginRoute() {
  const { status, user } = useAuth()
  if (status === 'AUTHENTICATED' || status === 'PASSWORD_CHANGE_REQUIRED') {
    if (user?.role === 'SUPER_ADMIN') {
      return <Navigate to="/platform" replace />
    }
    return <Navigate to="/workspace" replace />
  }
  return <LoginPage />
}

function LegacyUserRedirect() {
  const { user } = useAuth()
  const { id } = useParams()
  const isPlatform = user?.role === 'SUPER_ADMIN'
  const target = id
    ? isPlatform
      ? `/platform/users/${id}`
      : `/team/users/${id}`
    : isPlatform
    ? '/platform/users'
    : '/team/users'
  return <Navigate to={target} replace />
}

function LegacyGroupRedirect() {
  const { user } = useAuth()
  const isPlatform = user?.role === 'SUPER_ADMIN'
  return <Navigate to={isPlatform ? '/platform/groups' : '/team/groups'} replace />
}

function NotFoundRoute() {
  const { user } = useAuth()
  const homePath = user?.role === 'SUPER_ADMIN' ? '/platform' : '/workspace'
  return (
    <div className="p-6">
      <PageHeader title="Page Not Found" />
      <Panel>
        <p className="text-sm text-slate-600">
          There is nothing at this web address.
        </p>
        <div className="mt-4">
          <a
            href={homePath}
            className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700"
          >
            Return to Dashboard Hub
          </a>
        </div>
      </Panel>
    </div>
  )
}

export default function App() {
  return (
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            {/* Public Entry Points */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/activate" element={<ActivatePage />} />

            {/* Smart Root Dispatcher */}
            <Route path="/" element={<RootDispatcher />} />

            {/* ========================================================= */}
            {/* PLATFORM CONSOLE (SUPER_ADMIN ONLY)                       */}
            {/* ========================================================= */}
            <Route path="/platform" element={<PlatformLayout />}>
              <Route index element={<PlatformOverviewPage />} />
              <Route
                path="companies"
                element={
                  <RequirePermission permission="company.read">
                    <CompaniesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="companies/:id"
                element={
                  <RequirePermission permission="company.read">
                    <CompaniesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="users"
                element={
                  <RequirePermission permission="user.read">
                    <UsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="users/:id"
                element={
                  <RequirePermission permission="user.read">
                    <UserDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="roles"
                element={
                  <RequirePermission permission="role.read">
                    <RolesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="groups"
                element={
                  <RequirePermission permission="group.read">
                    <GroupsPage />
                  </RequirePermission>
                }
              />
              <Route path="dashboards" element={<HomePage />} />
              <Route
                path="data"
                element={
                  <RequirePermission permission="data.read">
                    <DataPage />
                  </RequirePermission>
                }
              />
              <Route path="audit" element={<AuditLogPage />} />
              <Route path="settings" element={<PlatformSettingsPage />} />
            </Route>

            {/* ========================================================= */}
            {/* CUSTOMER TENANT WORKSPACE (COMPANY_ADMIN & USER)           */}
            {/* ========================================================= */}
            <Route element={<WorkspaceLayout />}>
              <Route path="/workspace" element={<WorkspaceOverviewPage />} />
              <Route path="/dashboards/:dashboardId" element={<DashboardPage />} />

              <Route
                path="/data"
                element={
                  <RequirePermission permission="data.read">
                    <DataPage />
                  </RequirePermission>
                }
              />

              <Route
                path="/team/users"
                element={
                  <RequirePermission permission="user.read">
                    <UsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/team/users/:id"
                element={
                  <RequirePermission permission="user.read">
                    <UserDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/team/groups"
                element={
                  <RequirePermission permission="group.read">
                    <GroupsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/team/access"
                element={
                  <RequirePermission permission="access.read">
                    <AccessMatrixPage />
                  </RequirePermission>
                }
              />

              <Route
                path="/settings/company"
                element={
                  <RequirePermission permission="company.read">
                    <CompanySettingsPage />
                  </RequirePermission>
                }
              />
              <Route path="/settings/profile" element={<ProfilePage />} />
              <Route path="/profile" element={<Navigate to="/settings/profile" replace />} />

              {/* Legacy Route Redirects */}
              <Route path="/admin/companies" element={<Navigate to="/platform/companies" replace />} />
              <Route path="/admin/users" element={<LegacyUserRedirect />} />
              <Route path="/admin/users/:id" element={<LegacyUserRedirect />} />
              <Route path="/admin/groups" element={<LegacyGroupRedirect />} />
              <Route path="/admin/roles" element={<Navigate to="/platform/roles" replace />} />

              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  )
}
