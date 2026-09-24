import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ShieldCheck } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { listCompanyOptions } from '@/api/platformApi'
import { Separator } from '@/components/ui/separator'
import { SidebarTrigger } from '@/components/ui/sidebar'
import { TenantLabel, TenantSwitcher } from '@/components/shell/TenantSwitcher'
import { UserMenu } from '@/components/shell/UserMenu'
import type { CompanyOption } from '@/types/admin'

/**
 * The top bar: who you are, and which context you are working in.
 *
 * Professional, clean design without search bar, featuring:
 * - Glassmorphic backdrop with subtle border
 * - Active tenant / platform context indicator
 * - Live analytics engine status badge
 * - Polished user profile trigger
 */
export function Topbar({ onOpenNav }: { onOpenNav?: () => void } = {}) {
  const { user } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const platform = paths.shell === 'platform'

  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [loadingCompanies, setLoadingCompanies] = useState(platform)
  const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null)

  useEffect(() => {
    if (!platform) return
    let cancelled = false

    listCompanyOptions()
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch(() => {
        /*
         * The switcher is a convenience, not the way to reach a customer - the
         * Companies screen is, and it reports its own failures properly. A toast
         * here would fire on every page of the console for one failed request,
         * so this leaves the switcher listing nothing and says so in its own
         * empty state rather than claiming there are no customers.
         */
        if (!cancelled) setCompanies([])
      })
      .finally(() => {
        if (!cancelled) setLoadingCompanies(false)
      })

    return () => {
      cancelled = true
    }
  }, [platform])

  /* Switching tenant is a navigation, never a silent re-filter of this screen. */
  const selectCompany = (companyId: number | null) => {
    setSelectedCompanyId(companyId)
    const destination = companyId === null ? paths.companies : paths.company(companyId)
    if (destination) navigate(destination)
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center justify-between border-b border-border/70 bg-background/80 px-4 backdrop-blur-md transition-all sm:px-6">
      {/* Left side: Mobile menu trigger & Context pill */}
      <div className="flex min-w-0 items-center gap-3">
        <SidebarTrigger className="md:hidden" onClick={onOpenNav} />

        {platform ? (
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5 rounded-md border border-indigo-200/70 bg-indigo-50/60 px-2.5 py-1 text-xs font-semibold text-indigo-700 shadow-2xs dark:border-indigo-900/40 dark:bg-indigo-950/30 dark:text-indigo-300">
              <span className="relative flex size-1.5">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75"></span>
                <span className="relative inline-flex size-1.5 rounded-full bg-indigo-600"></span>
              </span>
              <ShieldCheck className="size-3.5 text-indigo-600 dark:text-indigo-400" aria-hidden />
              <span>Platform Console</span>
            </div>

            <Separator orientation="vertical" className="hidden h-4 sm:block opacity-40" />

            <div className="hidden sm:block">
              <TenantSwitcher
                companies={companies}
                loading={loadingCompanies}
                selectedId={selectedCompanyId}
                onSelect={selectCompany}
              />
            </div>
          </div>
        ) : (
          <TenantLabel companyName={user?.companyName ?? null} />
        )}
      </div>

      {/* Right side: Live engine indicator & User menu */}
      <div className="flex items-center gap-3">
        <div className="hidden items-center gap-2 rounded-full border border-border/60 bg-muted/40 px-3 py-1 text-[11px] font-medium text-muted-foreground md:flex">
          <span className="relative flex size-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-70"></span>
            <span className="relative inline-flex size-2 rounded-full bg-emerald-500"></span>
          </span>
          <span className="text-foreground/80 font-medium">Live Analytics Engine</span>
        </div>

        <Separator orientation="vertical" className="hidden h-4 md:block opacity-40" />

        <UserMenu />
      </div>
    </header>
  )
}
