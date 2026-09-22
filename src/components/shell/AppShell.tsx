import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { shellForRole, type Shell } from '@/app/paths'
import ChangePasswordGate from '@/pages/ChangePasswordGate'
import { AppSidebar } from '@/components/shell/AppSidebar'
import { Topbar } from '@/components/shell/Topbar'
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar'
import type { AppData } from '@/layouts/appOutlet'

/**
 * The application frame, and the client-side half of the access rules.
 *
 * One component serves both shells.
 *
 * The guards run in a fixed order, and each one has exactly one answer:
 *
 *   restoring          wait - do not decide anything yet
 *   not authenticated  the login screen
 *   password expired   the change-password gate, and nothing else
 *   wrong shell        the shell this role does belong to
 *
 * Powered by official shadcn Sidebar components:
 * - SidebarProvider manages state, shortcuts, cookies, and responsive drawer
 * - SidebarInset wraps Topbar and the main scrollable viewport
 */
export function AppShell({ shell }: { shell: Shell }) {
  const { status, user, dashboards, refresh } = useAuth()

  if (status === 'RESTORING') {
    return (
      <div
        className="flex min-h-screen items-center justify-center bg-background"
        role="status"
        aria-live="polite"
      >
        <div className="flex items-center gap-2.5 text-sm text-muted-foreground">
          <span className="size-4 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          Restoring your session…
        </div>
      </div>
    )
  }

  if (status !== 'AUTHENTICATED' && status !== 'PASSWORD_CHANGE_REQUIRED') {
    return <Navigate to="/login" replace />
  }
  if (!user) return <Navigate to="/login" replace />

  /*
   * Checked before the shell match. An account that must set a new password has
   * a valid session and a real role, but the server refuses every other endpoint
   * until it does - so sending it to a console it cannot load anything into
   * would just be an error page.
   */
  if (status === 'PASSWORD_CHANGE_REQUIRED') return <ChangePasswordGate />

  const belongs = shellForRole(user.role)
  if (belongs !== shell) {
    return <Navigate to={belongs === 'platform' ? '/platform' : '/workspace'} replace />
  }

  const context: AppData = { dashboards, reload: refresh }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        <AppSidebar />
        <SidebarInset className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
          <Topbar />
          <main className="scrollbar-thin min-w-0 flex-1 overflow-y-auto bg-muted/30">
            <Outlet context={context} />
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  )
}

export function PlatformShell() {
  return <AppShell shell="platform" />
}

export function WorkspaceShell() {
  return <AppShell shell="workspace" />
}
