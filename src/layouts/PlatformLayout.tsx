import { useState } from 'react'
import { Navigate, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import ChangePasswordGate from '@/pages/ChangePasswordGate'
import Topbar from '@/ui/Topbar'
import Sidebar from '@/ui/Sidebar'
import type { AppData } from './appOutlet'

export default function PlatformLayout() {
  const { status, user, dashboards, refresh } = useAuth()
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)
  const navigate = useNavigate()

  if (status === 'RESTORING') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50 text-xs font-medium text-slate-500">
        <div className="flex items-center gap-2">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-600 border-t-transparent" />
          Restoring platform console session…
        </div>
      </div>
    )
  }

  if (status !== 'AUTHENTICATED' && status !== 'PASSWORD_CHANGE_REQUIRED') {
    return <Navigate to="/login" replace />
  }

  if (!user) return <Navigate to="/login" replace />

  if (status === 'PASSWORD_CHANGE_REQUIRED') {
    return <ChangePasswordGate />
  }

  // Non-platform users must never enter the platform console
  if (user.role !== 'SUPER_ADMIN') {
    return <Navigate to="/workspace" replace />
  }

  const handleSelectCompany = (companyId: number | null) => {
    setSelectedCompanyId(companyId)
    if (companyId) {
      navigate(`/platform/companies/${companyId}`)
    } else {
      navigate('/platform')
    }
  }

  const context: AppData = { dashboards, reload: refresh }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50/70">
      <div className="hidden h-full flex-shrink-0 md:block">
        <Sidebar mode="platform" dashboards={dashboards} />
      </div>

      {/* Mobile Drawer */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 flex md:hidden">
          <div
            className="absolute inset-0 bg-slate-900/50 backdrop-blur-xs"
            onClick={() => setDrawerOpen(false)}
            aria-hidden
          />
          <div className="relative h-full">
            <Sidebar
              mode="platform"
              dashboards={dashboards}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex h-full min-w-0 flex-1 flex-col overflow-hidden">
        <div className="flex-shrink-0">
          <Topbar
            onToggleDrawer={() => setDrawerOpen((v) => !v)}
            drawerOpen={drawerOpen}
            isPlatform={true}
            selectedCompanyId={selectedCompanyId}
            onSelectCompany={handleSelectCompany}
          />
        </div>

        <main className="min-w-0 flex-1 overflow-y-auto">
          <Outlet context={context} />
        </main>
      </div>
    </div>
  )
}
