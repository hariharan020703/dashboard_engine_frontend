import type { ReactElement } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import AuthProvider from '@/context/AuthProvider'
import { useAuth } from '@/context/authContext'
import { shellForRole } from '@/app/paths'
import { usePaths } from '@/app/usePaths'
import { Toaster } from '@/components/ui/sonner'
import { TooltipProvider } from '@/components/ui/tooltip'
import { PlatformShell, WorkspaceShell } from '@/components/shell/AppShell'
import { Page } from '@/components/common/Page'
import { NotFoundState, PermissionDeniedState } from '@/components/common/States'

import LoginPage from '@/pages/LoginPage'
import ActivatePage from '@/pages/ActivatePage'
import ProfilePage from '@/pages/ProfilePage'
import DashboardPage from '@/pages/DashboardPage'
import DashboardsPage from '@/pages/DashboardsPage'
import DataPage from '@/pages/DataPage'

import PlatformOverviewPage from '@/pages/platform/PlatformOverviewPage'
import CompaniesPage from '@/pages/platform/CompaniesPage'
import CompanyDetailPage from '@/pages/platform/CompanyDetailPage'
import PlatformUsersPage from '@/pages/platform/PlatformUsersPage'
import PlatformUserDetailPage from '@/pages/platform/PlatformUserDetailPage'
import RolesPage from '@/pages/platform/RolesPage'
import AuditLogPage from '@/pages/platform/AuditLogPage'
import PlatformSettingsPage from '@/pages/platform/PlatformSettingsPage'

import WorkspaceOverviewPage from '@/pages/workspace/WorkspaceOverviewPage'
import TeamPage from '@/pages/workspace/TeamPage'
import TeamMemberPage from '@/pages/workspace/TeamMemberPage'
import GroupsPage from '@/pages/workspace/GroupsPage'
import AccessPage from '@/pages/workspace/AccessPage'
import CompanySettingsPage from '@/pages/workspace/CompanySettingsPage'

import ContextLayerPage from '@/modules/context-layer/ContextLayerPage'
import ConnectionDatasetsPage from '@/modules/context-layer/ConnectionDatasetsPage'
import { CommandCenterPage } from '@/modules/data-analyst-agent/pages/CommandCenterPage'
import { AnalystChatPage } from '@/modules/data-analyst-agent/pages/AnalystChatPage'
import { PlaybooksPage } from '@/modules/data-analyst-agent/pages/PlaybooksPage'

/**
 * The route table.
 *
 * It mirrors src/app/paths.ts exactly - that file says where a screen lives and
 * this one mounts it there. Keeping them side by side is what makes the pairing
 * checkable: every path in AppPaths appears below, and nothing below is
 * unreachable from a link.
 *
 * Several screens are mounted twice, once per shell. That is not duplication of
 * the screen - it is the same component - it is the two shells wrapping it, so a
 * platform administrator opening the context layer stays in the console and a
 * customer opening it stays in their workspace.
 */

/**
 * Hides a route behind a permission.
 *
 * The server is the boundary; this exists so somebody who follows a stale link
 * gets an explanation rather than a screen that loads and then fails four
 * requests. The permission names are the same ids the API checks.
 */
function RequirePermission({
  permission,
  children,
}: {
  permission: string
  children: ReactElement
}) {
  const { can } = useAuth()
  const paths = usePaths()

  if (can(permission)) return children

  return (
    <Page>
      <PermissionDeniedState
        detail="Your role does not include access to this area. An administrator can change what your role is permitted to do."
        backTo={paths.overview}
      />
    </Page>
  )
}

/** Sends a signed-in account to its own shell, and everyone else to login. */
function RootRedirect() {
  const { status, user } = useAuth()

  if (status === 'RESTORING') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Restoring your session…
      </div>
    )
  }
  if (!user || (status !== 'AUTHENTICATED' && status !== 'PASSWORD_CHANGE_REQUIRED')) {
    return <Navigate to="/login" replace />
  }
  return <Navigate to={shellForRole(user.role) === 'platform' ? '/platform' : '/workspace'} replace />
}

function LoginRoute() {
  const { status, user } = useAuth()
  if (user && (status === 'AUTHENTICATED' || status === 'PASSWORD_CHANGE_REQUIRED')) {
    return <Navigate to={shellForRole(user.role) === 'platform' ? '/platform' : '/workspace'} replace />
  }
  return <LoginPage />
}

/** An address inside a shell that matches no route. */
function NotFoundRoute() {
  const paths = usePaths()
  return (
    <Page>
      <NotFoundState detail="There is nothing at this address." backTo={paths.overview} />
    </Page>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <TooltipProvider>
        <AuthProvider>
          <Routes>
            {/* ---------------------------------------------- public ---- */}
            <Route path="/login" element={<LoginRoute />} />
            <Route path="/activate" element={<ActivatePage />} />
            <Route path="/" element={<RootRedirect />} />

            {/* ------------------------------------ platform console ---- */}
            <Route path="/platform" element={<PlatformShell />}>
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
                path="companies/:companyId"
                element={
                  <RequirePermission permission="company.read">
                    <CompanyDetailPage />
                  </RequirePermission>
                }
              />

              <Route
                path="users"
                element={
                  <RequirePermission permission="user.read">
                    <PlatformUsersPage />
                  </RequirePermission>
                }
              />
              <Route
                path="users/:userId"
                element={
                  <RequirePermission permission="user.read">
                    <PlatformUserDetailPage />
                  </RequirePermission>
                }
              />

              <Route path="dashboards" element={<DashboardsPage />} />
              <Route path="dashboards/:dashboardId" element={<DashboardPage />} />
              <Route
                path="data"
                element={
                  <RequirePermission permission="data.read">
                    <DataPage />
                  </RequirePermission>
                }
              />

              <Route
                path="context"
                element={
                  <RequirePermission permission="context.read">
                    <ContextLayerPage />
                  </RequirePermission>
                }
              />
              <Route
                path="context/connections/:id"
                element={
                  <RequirePermission permission="context.read">
                    <ConnectionDatasetsPage />
                  </RequirePermission>
                }
              />
              <Route path="agent/:id?" element={<CommandCenterPage mode="analyst" />} />
              <Route path="data-analyst/:id?" element={<AnalystChatPage />} />
              <Route path="playbook-builder/:id?" element={<CommandCenterPage mode="builder" />} />
              <Route path="playbooks" element={<PlaybooksPage />} />

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

              <Route path="audit" element={<AuditLogPage />} />
              <Route path="settings" element={<PlatformSettingsPage />} />
              <Route path="profile" element={<ProfilePage />} />

              <Route path="*" element={<NotFoundRoute />} />
            </Route>

            {/* --------------------------------- customer workspace ---- */}
            <Route element={<WorkspaceShell />}>
              <Route path="/workspace" element={<WorkspaceOverviewPage />} />

              <Route path="/dashboards" element={<DashboardsPage />} />
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
                path="/context"
                element={
                  <RequirePermission permission="context.read">
                    <ContextLayerPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/context/connections/:id"
                element={
                  <RequirePermission permission="context.read">
                    <ConnectionDatasetsPage />
                  </RequirePermission>
                }
              />
              <Route path="/agent/:id?" element={<CommandCenterPage mode="analyst" />} />
              <Route path="/data-analyst/:id?" element={<AnalystChatPage />} />
              <Route path="/playbook-builder/:id?" element={<CommandCenterPage mode="builder" />} />
              <Route path="/playbooks" element={<PlaybooksPage />} />

              <Route
                path="/team/users"
                element={
                  <RequirePermission permission="user.read">
                    <TeamPage />
                  </RequirePermission>
                }
              />
              <Route
                path="/team/users/:userId"
                element={
                  <RequirePermission permission="user.read">
                    <TeamMemberPage />
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
                    <AccessPage />
                  </RequirePermission>
                }
              />

              <Route path="/settings" element={<Navigate to="/settings/profile" replace />} />
              <Route
                path="/settings/company"
                element={
                  <RequirePermission permission="company.read">
                    <CompanySettingsPage />
                  </RequirePermission>
                }
              />
              <Route path="/settings/profile" element={<ProfilePage />} />

              <Route path="*" element={<NotFoundRoute />} />
            </Route>
          </Routes>

          {/* The single toast surface for the whole application. */}
          <Toaster />
        </AuthProvider>
      </TooltipProvider>
    </BrowserRouter>
  )
}
