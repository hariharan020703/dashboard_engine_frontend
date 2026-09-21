import { useEffect, useRef, useState } from 'react'
import { Check, ChevronDown, Globe, Menu, ShieldCheck, X } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import UserMenu from '@/components/auth/UserMenu'
import type { Company } from '@/types/admin'
import { listCompanies } from '@/api/adminApi'
import CompanyLogo from '@/ui/CompanyLogo'

interface TopbarProps {
  onToggleDrawer: () => void
  drawerOpen: boolean
  isPlatform?: boolean
  selectedCompanyId?: number | null
  onSelectCompany?: (companyId: number | null) => void
}

export default function Topbar({
  onToggleDrawer,
  drawerOpen,
  isPlatform = false,
  selectedCompanyId = null,
  onSelectCompany,
}: TopbarProps) {
  const { user } = useAuth()
  const [companies, setCompanies] = useState<Company[]>([])
  const [switcherOpen, setSwitcherOpen] = useState(false)
  const switcherRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isPlatform) return
    let active = true
    listCompanies()
      .then((data) => {
        if (active) setCompanies(data)
      })
      .catch(() => {})
    return () => {
      active = false
    }
  }, [isPlatform])

  useEffect(() => {
    if (!switcherOpen) return
    const handleClick = (e: MouseEvent) => {
      if (switcherRef.current && !switcherRef.current.contains(e.target as Node)) {
        setSwitcherOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [switcherOpen])

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <header className="sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-slate-200 bg-white px-4 sm:px-6">
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="grid h-8 w-8 place-items-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-800 md:hidden"
          onClick={onToggleDrawer}
          aria-label={drawerOpen ? 'Close sidebar' : 'Open sidebar'}
        >
          {drawerOpen ? <X size={18} /> : <Menu size={18} />}
        </button>

        <div className="flex items-center gap-2">
          {isPlatform ? (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-1.5 rounded-md bg-indigo-50 px-2.5 py-1 text-xs font-semibold text-indigo-700">
                <ShieldCheck size={13} />
                Platform Console
              </span>

              {onSelectCompany && (
                <div className="relative" ref={switcherRef}>
                  <button
                    type="button"
                    onClick={() => setSwitcherOpen((v) => !v)}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 shadow-2xs hover:border-slate-300 hover:bg-slate-50"
                  >
                    {selectedCompany ? (
                      <>
                        <CompanyLogo name={selectedCompany.name} size="xs" />
                        <span className="max-w-[160px] truncate font-semibold">{selectedCompany.name}</span>
                      </>
                    ) : (
                      <>
                        <Globe size={13} className="text-indigo-600" />
                        <span>All Tenants</span>
                      </>
                    )}
                    <ChevronDown size={12} className="text-slate-400" />
                  </button>

                  {switcherOpen && (
                    <div className="absolute left-0 mt-1 w-64 rounded-xl border border-slate-200 bg-white p-1.5 shadow-lg">
                      <p className="px-2 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                        Switch Tenant Context
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          onSelectCompany(null)
                          setSwitcherOpen(false)
                        }}
                        className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                          selectedCompanyId === null
                            ? 'bg-indigo-50 font-semibold text-indigo-700'
                            : 'text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <span className="flex items-center gap-1.5">
                          <Globe size={13} />
                          All Tenants (Global)
                        </span>
                        {selectedCompanyId === null && <Check size={13} />}
                      </button>

                      <div className="my-1 border-t border-slate-100" />

                      <div className="max-h-48 overflow-y-auto">
                        {companies.map((c) => (
                          <button
                            key={c.id}
                            type="button"
                            onClick={() => {
                              onSelectCompany(c.id)
                              setSwitcherOpen(false)
                            }}
                            className={`flex w-full items-center justify-between rounded-md px-2 py-1.5 text-left text-xs ${
                              selectedCompanyId === c.id
                                ? 'bg-blue-50 font-semibold text-blue-700'
                                : 'text-slate-700 hover:bg-slate-50'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate">
                              <CompanyLogo name={c.name} size="xs" />
                              <span className="truncate font-medium">{c.name}</span>
                            </span>
                            {selectedCompanyId === c.id && <Check size={13} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <span className="flex items-center gap-2 rounded-lg border border-slate-200/80 bg-slate-50/80 px-2.5 py-1 text-xs font-semibold text-slate-800 shadow-2xs">
                <CompanyLogo name={user?.companyName} size="xs" />
                <span className="truncate max-w-[220px]">{user?.companyName || 'Company Workspace'}</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3">
        <UserMenu />
      </div>
    </header>
  )
}
