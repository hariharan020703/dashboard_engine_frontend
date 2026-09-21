import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import { Navigate, Outlet } from 'react-router-dom'
import UserMenu from '@/components/auth/UserMenu'
import ChangePasswordGate from '@/pages/ChangePasswordGate'
import { useAuth } from '@/context/authContext'
import AppSidebar from './AppSidebar'
import type { AppData } from './appOutlet'

/**
 * The authenticated shell: navigation, header, page.
 *
 * It holds no business logic. Its whole job is the four things every signed-in
 * screen needs - that there IS a session, that the session is usable, what the
 * user may navigate to, and where the page goes - so no page has to repeat any
 * of it.
 *
 * The dashboard list is no longer fetched here. It arrives with the profile, in
 * the same response as the user and their permissions, so there is one answer
 * to "what may this person see" rather than two requests that can disagree.
 *
 * The forced password change is handled here rather than as a route: it is a
 * state of the account, not a place in the app, and a user who can navigate
 * away from it is a user who never changes their password.
 */
export default function AppLayout() {
  const { status, user, dashboards, refresh } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)

  if (status === 'RESTORING') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 text-slate-500">
        Restoring your session…
      </div>
    )
  }

  // Every non-authenticated state lands on the login screen. Which one it was
  // has already been reported as a notification, so the reason is not lost.
  if (status !== 'AUTHENTICATED' && status !== 'PASSWORD_CHANGE_REQUIRED') {
    return <Navigate to="/login" replace />
  }
  if (!user) return <Navigate to="/login" replace />
  if (status === 'PASSWORD_CHANGE_REQUIRED') return <ChangePasswordGate />

  const context: AppData = { dashboards, reload: refresh }

  return (
    <div className="flex min-h-screen bg-slate-100">
      <div className="hidden md:block">
        <AppSidebar dashboards={dashboards} />
      </div>

      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="relative h-full">
            <AppSidebar dashboards={dashboards} onNavigate={() => setDrawerOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-slate-200 bg-white px-4 py-2.5">
          <button
            type="button"
            className="grid h-9 w-9 place-items-center rounded-md text-slate-500 hover:bg-slate-100 md:hidden"
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label={drawerOpen ? 'Close navigation' : 'Open navigation'}
          >
            {drawerOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
          <div className="min-w-0 flex-1">
            {user.companyName && (
              <span className="truncate text-[13px] font-medium text-slate-500">
                {user.companyName}
              </span>
            )}
          </div>
          <UserMenu />
        </header>

        <main className="min-w-0 flex-1">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
