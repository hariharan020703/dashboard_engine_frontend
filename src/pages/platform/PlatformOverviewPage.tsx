import { useEffect, useState } from 'react'
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Plus,
  ShieldCheck,
  Users,
} from 'lucide-react'
import { Link, useNavigate } from 'react-router-dom'
import { fetchAuditLogs, listCompanies, listUsers } from '@/api/adminApi'
import StatCard from '@/ui/StatCard'
import CompanyOnboardingModal from '@/components/onboarding/CompanyOnboardingModal'
import { PageHeader, Panel } from '@/ui/page'
import { actionPrimaryCls } from '@/ui/styles'
import type { AdminUser, AuditLogEntry, Company } from '@/types/admin'
import CompanyLogo from '@/ui/CompanyLogo'

export default function PlatformOverviewPage() {
  const navigate = useNavigate()
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[] | null>(null)
  const [creatingCompany, setCreatingCompany] = useState(false)

  const [reloadToken, setReloadToken] = useState(0)
  const reload = () => setReloadToken((n) => n + 1)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [comps, usrs, logs] = await Promise.all([
          listCompanies(),
          listUsers(),
          fetchAuditLogs(10),
        ])
        if (cancelled) return
        setCompanies(comps)
        setUsers(usrs)
        setAuditLogs(logs)
      } catch {
        if (cancelled) return
        setCompanies([])
        setUsers([])
        setAuditLogs([])
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const activeCompanies = companies?.filter((c) => c.active).length ?? 0
  const inactiveCompanies = companies ? companies.length - activeCompanies : 0
  const totalUsers = users?.length ?? 0
  const totalCompanyAdmins = users?.filter((u) => u.role === 'COMPANY_ADMIN').length ?? 0

  return (
    <div className="p-6">
      <PageHeader
        title="Platform Console"
        description="Comprehensive operational oversight across all tenants, accounts, and system activity."
        actions={
          <button
            type="button"
            onClick={() => setCreatingCompany(true)}
            className={actionPrimaryCls}
          >
            <Plus size={14} />
            Onboard New Company
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Customer Companies"
          value={companies?.length ?? '—'}
          subtitle={`${activeCompanies} active · ${inactiveCompanies} inactive`}
          icon={Building2}
          tone="blue"
          onClick={() => navigate('/platform/companies')}
        />

        <StatCard
          title="Total Users"
          value={totalUsers || '—'}
          subtitle={`${totalCompanyAdmins} company administrators`}
          icon={Users}
          tone="emerald"
          onClick={() => navigate('/platform/users')}
        />

        <StatCard
          title="Active Tenants"
          value={activeCompanies || '—'}
          subtitle="Tenants actively accessing analytics"
          icon={CheckCircle2}
          tone="purple"
        />

        <StatCard
          title="System Security"
          value="Enforced"
          subtitle="Strict tenant isolation in SQL"
          icon={ShieldCheck}
          tone="amber"
          onClick={() => navigate('/platform/roles')}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Customer Companies Highlights */}
        <div className="lg:col-span-2">
          <Panel
            title="Recent Customer Companies"
            description="Tenant companies onboarded onto the platform."
            actions={
              <Link
                to="/platform/companies"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                View all companies
                <ArrowRight size={13} />
              </Link>
            }
            flush
          >
            {!companies ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading companies…</div>
            ) : companies.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-500">
                No customer companies onboarded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {companies.slice(0, 5).map((comp) => (
                  <div
                    key={comp.id}
                    className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50"
                  >
                    <div className="flex items-center gap-3">
                      <CompanyLogo name={comp.name} size="md" />
                      <div>
                        <Link
                          to={`/platform/companies/${comp.id}`}
                          className="font-semibold text-slate-900 hover:text-blue-600"
                        >
                          {comp.name}
                        </Link>
                        <p className="text-[11px] text-slate-400 font-mono">
                          /{comp.slug} · {comp.userCount ?? 0} users · {comp.dashboardCount ?? 0} dashboards
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${
                          comp.active
                            ? 'bg-emerald-50 text-emerald-700'
                            : 'bg-red-50 text-red-700'
                        }`}
                      >
                        {comp.active ? 'Active' : 'Disabled'}
                      </span>
                      <Link
                        to={`/platform/companies/${comp.id}`}
                        className="rounded-md border border-slate-200 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100"
                      >
                        Manage
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>

        {/* Audit Log / Platform Activity Feed */}
        <div>
          <Panel
            title="Recent Activity"
            description="Live audit events from the audit log."
            actions={
              <Link
                to="/platform/audit"
                className="inline-flex items-center gap-1 text-xs font-semibold text-blue-600 hover:text-blue-700"
              >
                Full audit
                <ArrowRight size={13} />
              </Link>
            }
            flush
          >
            {!auditLogs ? (
              <div className="p-6 text-center text-xs text-slate-400">Loading audit log…</div>
            ) : auditLogs.length === 0 ? (
              <div className="p-6 text-center text-xs text-slate-500">
                No recent activity recorded yet.
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {auditLogs.slice(0, 6).map((item, idx) => (
                  <div key={`audit-${idx}`} className="p-3 text-xs">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-800">
                        {item.event.replace(/_/g, ' ')}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {new Date(item.ts).toLocaleTimeString([], {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-500">
                      Actor: <span className="font-medium text-slate-700">{item.actor}</span>
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      {creatingCompany && (
        <CompanyOnboardingModal
          onCreated={() => {
            reload()
          }}
          onClose={() => setCreatingCompany(false)}
        />
      )}
    </div>
  )
}
