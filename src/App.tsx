import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from '@/context/AuthProvider'
import { useAuth } from '@/context/authContext'
import NotificationProvider from '@/ui/NotificationProvider'
import AppLayout from '@/layouts/AppLayout'
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
import { PageHeader, Panel } from '@/ui/page'

/**
 * The application's routes.
 *
 * Two public routes and one authenticated shell, and inside it only the screens
 * the product actually has. There is no route per concept: dashboards are one
 * parameterised route serving every dashboard the registry knows about, a
 * company's detail is part of the companies screen, and the forced password
 * change is a state AppLayout renders rather than a place you can navigate to.
 */

/**
 * Keeps a screen behind the same permission its API requires.
 *
 * The backend already rejects the calls these pages make, so this is not the
 * security boundary - it is here so somebody who types the URL gets an honest
 * answer instead of a screen of failed requests.
 */
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
      <PageHeader title="Not available" />
      <Panel>
        <p className="text-sm text-slate-600">
          Your role does not hold the <code className="text-slate-800">{permission}</code>{' '}
          permission, so this area is not available to you.
        </p>
        <p className="mt-2 text-[13px] text-slate-500">
          An administrator can change what your role may do.
        </p>
      </Panel>
    </div>
  )
}

/** The login screen, or straight past it when there is already a session. */
function LoginRoute() {
  const { status } = useAuth()
  if (status === 'AUTHENTICATED' || status === 'PASSWORD_CHANGE_REQUIRED') {
    return <Navigate to="/" replace />
  }
  return <LoginPage />
}

function NotFoundRoute() {
  return (
    <div className="p-6">
      <PageHeader title="Page not found" />
      <Panel>
        <p className="text-sm text-slate-600">
          There is nothing at this address. Use the navigation to get back to your dashboards.
        </p>
      </Panel>
    </div>
  )
}

export default function App() {
  return (
    /*
     * Notifications wrap authentication, not the other way round: AuthProvider
     * reports an expired or withdrawn session through the same mechanism every
     * other action uses, so it has to be able to reach it.
     */
    <NotificationProvider>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginRoute />} />
            {/* Public: reached from an email link by somebody with no session. */}
            <Route path="/activate" element={<ActivatePage />} />

            <Route element={<AppLayout />}>
              <Route path="/" element={<HomePage />} />
              <Route path="/dashboards/:dashboardId" element={<DashboardPage />} />

              <Route
                path="/data"
                element={
                  <RequirePermission permission="data.read">
                    <DataPage />
                  </RequirePermission>
                }
              />

              <Route path="/profile" element={<ProfilePage />} />

              <Route
                path="/admin/companies"
                element={
                  <RequirePermission permission="company.read">
                    <CompaniesPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/users"
                element={
                  <RequirePermission permission="user.read">
                    <UsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/users/:id"
                element={
                  <RequirePermission permission="user.read">
                    <UserDetailPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/groups"
                element={
                  <RequirePermission permission="group.read">
                    <GroupsPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/admin/roles"
                element={
                  <RequirePermission permission="role.read">
                    <RolesPage />
                  </RequirePermission>
                }
              />

              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </NotificationProvider>
  )
}
