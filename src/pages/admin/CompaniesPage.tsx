import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import {
  ArrowLeft,
  Plus,
  Trash2,
  UserPlus,
} from 'lucide-react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import {
  assignDashboard,
  deleteCompany,
  fetchCompany,
  listCompanies,
  listCompanyDashboards,
  listUsers,
  unassignDashboard,
  updateCompany,
} from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import ConfirmDialog from '@/ui/ConfirmDialog'
import DataTable, { type ColumnDef } from '@/ui/DataTable'
import { useNotification } from '@/ui/notificationContext'
import { TextField } from '@/ui/fields'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import {
  actionButtonCls,
  actionDangerCls,
  actionPrimaryCls,
  labelCls,
} from '@/ui/styles'
import type { AdminUser, Company, DashboardSummary } from '@/types/admin'
import CompanyOnboardingModal from '@/components/onboarding/CompanyOnboardingModal'
import UserOnboardingModal from '@/components/onboarding/UserOnboardingModal'
import RoleBadge from '@/components/rbac/RoleBadge'
import StatusBadge from '@/components/rbac/StatusBadge'
import CompanyLogo from '@/ui/CompanyLogo'

export default function CompaniesPage() {
  const { id } = useParams()
  const companyId = id ? Number(id) : null
  const navigate = useNavigate()
  const { can } = useAuth()
  const notify = useNotification()

  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    listCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setCompanies([])
          notify.error('Could not load companies.', errorMessage(err, ''))
        }
      })
    return () => {
      cancelled = true
    }
  }, [reloadToken, notify])

  const selectedCompany = companies?.find((c) => c.id === companyId) ?? null

  const handleDeleteCompany = async (comp: Company) => {
    try {
      await deleteCompany(comp.id)
      notify.success(`Company "${comp.name}" was permanently removed.`)
      reload()
      if (companyId === comp.id) {
        navigate('/platform/companies')
      }
    } catch (err) {
      notify.error('Unable to delete company.', errorMessage(err, ''))
    } finally {
      setDeleting(null)
    }
  }

  // Columns for the master enterprise table
  const columns: ColumnDef<Company>[] = [
    {
      key: 'name',
      header: 'Company / Tenant',
      sortable: true,
      render: (c) => (
        <div className="flex items-center gap-2.5">
          <CompanyLogo name={c.name} size="md" />
          <div>
            <span className="font-semibold text-slate-900 group-hover:text-blue-600">
              {c.name}
            </span>
            <span className="block font-mono text-[10px] text-slate-400">/{c.slug}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'active',
      header: 'Status',
      sortable: true,
      render: (c) => (
        <Badge tone={c.active ? 'success' : 'danger'}>
          {c.active ? 'Active' : 'Disabled'}
        </Badge>
      ),
    },
    {
      key: 'userCount',
      header: 'Users',
      sortable: true,
      align: 'right',
      render: (c) => <span className="font-semibold text-slate-700">{c.userCount ?? 0}</span>,
    },
    {
      key: 'dashboardCount',
      header: 'Assigned Dashboards',
      sortable: true,
      align: 'right',
      render: (c) => (
        <span className="font-semibold text-slate-700">{c.dashboardCount ?? 0}</span>
      ),
    },
    {
      key: 'createdAt',
      header: 'Created Date',
      sortable: true,
      render: (c) => (
        <span className="text-slate-500">
          {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : '—'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (c) => (
        <div className="flex items-center justify-end gap-1.5" onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            onClick={() => navigate(`/platform/companies/${c.id}`)}
            className={actionButtonCls}
          >
            Manage
          </button>
          {can('company.delete') && (
            <button
              type="button"
              onClick={() => setDeleting(c)}
              className={actionDangerCls}
              title="Delete company"
            >
              <Trash2 size={13} />
            </button>
          )}
        </div>
      ),
    },
  ]

  // If a specific company is selected, render the Company Detail Workspace
  if (companyId !== null) {
    return (
      <CompanyDetailWorkspace
        companyId={companyId}
        onBack={() => navigate('/platform/companies')}
        onDelete={() => {
          if (selectedCompany) setDeleting(selectedCompany)
        }}
        onCompanyChanged={reload}
      />
    )
  }

  // Full Directory View
  return (
    <div className="p-6">
      <PageHeader
        title="Customer Companies"
        description="Tenant organizations hosted on the analytics SaaS platform."
        actions={
          can('company.create') ? (
            <button
              type="button"
              className={actionPrimaryCls}
              onClick={() => setCreating(true)}
            >
              <Plus size={14} />
              Onboard Company
            </button>
          ) : null
        }
      />

      <DataTable
        data={companies ?? []}
        columns={columns}
        keyOf={(c) => c.id}
        loading={companies === null}
        searchPlaceholder="Search companies by name or slug…"
        searchFilter={(c, q) =>
          c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q)
        }
        emptyMessage="No customer companies registered"
        emptyHint="Customer companies are tenant boundaries owning users, groups, and assigned dashboards."
        onRowClick={(c) => navigate(`/platform/companies/${c.id}`)}
      />

      {creating && (
        <CompanyOnboardingModal
          onCreated={() => {
            reload()
          }}
          onClose={() => setCreating(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.name}"?`}
          message="Are you sure you want to permanently delete this company?"
          consequence="This will permanently destroy this company, all of its user accounts, groups, and dashboard assignments. This action cannot be undone."
          confirmLabel="Delete Company"
          destructive
          onConfirm={() => void handleDeleteCompany(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------------------- */
/* Dedicated Company Detail Workspace View                                    */
/* -------------------------------------------------------------------------- */

function CompanyDetailWorkspace({
  companyId,
  onBack,
  onDelete,
  onCompanyChanged,
}: {
  companyId: number
  onBack: () => void
  onDelete: () => void
  onCompanyChanged: () => void
}) {
  const { can } = useAuth()
  const notify = useNotification()

  const [company, setCompany] = useState<Company | null>(null)
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [dashboards, setDashboards] = useState<DashboardSummary[] | null>(null)
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'dashboards' | 'settings'>('overview')
  const [addingUser, setAddingUser] = useState(false)
  const [loading, setLoading] = useState(true)

  // Edit company form
  const [editName, setEditName] = useState('')
  const [editActive, setEditActive] = useState(true)
  const [savingSettings, setSavingSettings] = useState(false)

  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [comp, usrList, dashList] = await Promise.all([
          fetchCompany(companyId),
          listUsers(companyId),
          listCompanyDashboards(companyId),
        ])
        if (cancelled) return
        setCompany(comp)
        setEditName(comp.name)
        setEditActive(comp.active)
        setUsers(usrList)
        setDashboards(dashList)
      } catch (err) {
        if (cancelled) return
        notify.error('Could not load company details.', errorMessage(err, ''))
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [companyId, reloadToken, notify])

  const handleToggleAssignment = async (dash: DashboardSummary) => {
    try {
      if (dash.assigned) {
        await unassignDashboard(companyId, dash.id)
        notify.success(`Unassigned "${dash.title || dash.id}" from company.`)
      } else {
        await assignDashboard(companyId, dash.id)
        notify.success(`Assigned "${dash.title || dash.id}" to company.`)
      }
      reload()
      onCompanyChanged()
    } catch (err) {
      notify.error('Failed to change dashboard assignment.', errorMessage(err, ''))
    }
  }

  const handleSaveSettings = async (e: FormEvent) => {
    e.preventDefault()
    setSavingSettings(true)
    try {
      const updated = await updateCompany(companyId, {
        name: editName.trim(),
        active: editActive,
      })
      setCompany(updated)
      notify.success('Company settings saved.')
      onCompanyChanged()
    } catch (err) {
      notify.error('Unable to save settings.', errorMessage(err, ''))
    } finally {
      setSavingSettings(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loading label="Loading tenant details…" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6">
        <button
          type="button"
          onClick={onBack}
          className="mb-4 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
        >
          <ArrowLeft size={14} /> Back to Companies
        </button>
        <EmptyState message="Company not found or inaccessible." />
      </div>
    )
  }

  return (
    <div className="p-6">
      {/* Breadcrumbs */}
      <button
        type="button"
        onClick={onBack}
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={14} />
        Back to Companies
      </button>

      {/* Header Banner */}
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4 rounded-xl border border-slate-200 bg-white p-5 shadow-xs">
        <div className="flex items-center gap-3">
          <CompanyLogo name={company.name} size="lg" />
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900">{company.name}</h1>
              <Badge tone={company.active ? 'success' : 'danger'}>
                {company.active ? 'Active' : 'Disabled'}
              </Badge>
            </div>
            <p className="mt-0.5 font-mono text-xs text-slate-400">
              Slug: /{company.slug} · ID: #{company.id}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {can('user.create') && (
            <button
              type="button"
              onClick={() => setAddingUser(true)}
              className={actionPrimaryCls}
            >
              <UserPlus size={14} />
              Add User
            </button>
          )}
          {can('company.delete') && (
            <button type="button" onClick={onDelete} className={actionDangerCls}>
              <Trash2 size={13} />
              Delete Company
            </button>
          )}
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="mb-6 flex border-b border-slate-200">
        {[
          { id: 'overview', label: 'Overview' },
          { id: 'users', label: `Users (${users?.length ?? 0})` },
          {
            id: 'dashboards',
            label: `Dashboards (${dashboards?.filter((d) => d.assigned).length ?? 0})`,
          },
          { id: 'settings', label: 'Settings' },
        ].map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id as typeof activeTab)}
            className={`px-4 py-2 text-xs font-semibold transition-colors border-b-2 -mb-px ${
              activeTab === tab.id
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Panel title="Total Users">
              <p className="text-2xl font-bold text-slate-900">{users?.length ?? 0}</p>
              <p className="mt-1 text-xs text-slate-400">Members inside this tenant</p>
            </Panel>
            <Panel title="Assigned Dashboards">
              <p className="text-2xl font-bold text-slate-900">
                {dashboards?.filter((d) => d.assigned).length ?? 0}
              </p>
              <p className="mt-1 text-xs text-slate-400">Granted from registry</p>
            </Panel>
            <Panel title="Account Status">
              <p className="text-2xl font-bold text-slate-900">
                {company.active ? 'Active' : 'Disabled'}
              </p>
              <p className="mt-1 text-xs text-slate-400">Tenant access authorization</p>
            </Panel>
          </div>

          <Panel title="Company Information">
            <dl className="grid gap-4 sm:grid-cols-2 text-xs">
              <div>
                <dt className="text-slate-400 font-semibold uppercase">Company Name</dt>
                <dd className="mt-1 font-semibold text-slate-800">{company.name}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-semibold uppercase">Tenant Slug</dt>
                <dd className="mt-1 font-mono text-slate-800">{company.slug}</dd>
              </div>
              <div>
                <dt className="text-slate-400 font-semibold uppercase">Created At</dt>
                <dd className="mt-1 text-slate-800">
                  {company.createdAt ? new Date(company.createdAt).toLocaleString() : '—'}
                </dd>
              </div>
            </dl>
          </Panel>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <Panel
          title="Company User Accounts"
          description="Members belonging strictly to this tenant boundary."
          actions={
            <button
              type="button"
              onClick={() => setAddingUser(true)}
              className={actionPrimaryCls}
            >
              <Plus size={13} />
              Add User
            </button>
          }
          flush
        >
          {!users || users.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No users created for this company yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {users.map((u) => (
                <div key={u.id} className="flex items-center justify-between p-3.5 text-xs">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-slate-900">
                        {u.displayName || u.username}
                      </span>
                      <RoleBadge role={u.role} />
                      <StatusBadge status={u.status} />
                    </div>
                    <p className="mt-0.5 text-[11px] text-slate-400 font-mono">
                      {u.email} · @{u.username}
                    </p>
                  </div>
                  <Link
                    to={`/platform/users/${u.id}`}
                    className="rounded-md border border-slate-200 px-2.5 py-1 font-medium text-slate-600 hover:bg-slate-50"
                  >
                    Manage Account
                  </Link>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Tab 3: Dashboards */}
      {activeTab === 'dashboards' && (
        <Panel
          title="Assigned Analytics Dashboards"
          description="Which dashboards this customer company and its users may open."
          flush
        >
          {!dashboards || dashboards.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">
              No dashboards found in registry.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {dashboards.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-4 transition-colors hover:bg-slate-50/50"
                >
                  <div>
                    <span className="font-semibold text-slate-900">{d.title || d.id}</span>
                    <p className="mt-0.5 text-[11px] font-mono text-slate-400">ID: {d.id}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleToggleAssignment(d)}
                    className={d.assigned ? actionDangerCls : actionPrimaryCls}
                  >
                    {d.assigned ? 'Revoke Assignment' : 'Assign to Company'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </Panel>
      )}

      {/* Tab 4: Settings */}
      {activeTab === 'settings' && (
        <Panel title="Company Configuration">
          <form onSubmit={handleSaveSettings} className="max-w-md space-y-4">
            <TextField
              label="Company Name"
              value={editName}
              onChange={setEditName}
              required
            />

            <div>
              <label className={labelCls}>Company Status</label>
              <div className="flex items-center gap-3 pt-1">
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="company-status"
                    checked={editActive}
                    onChange={() => setEditActive(true)}
                  />
                  <span>Active</span>
                </label>
                <label className="flex items-center gap-1.5 text-xs text-slate-700 cursor-pointer">
                  <input
                    type="radio"
                    name="company-status"
                    checked={!editActive}
                    onChange={() => setEditActive(false)}
                  />
                  <span className="text-red-600">Disabled</span>
                </label>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={savingSettings}
                className={actionPrimaryCls}
              >
                {savingSettings ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Panel>
      )}

      {addingUser && (
        <UserOnboardingModal
          companies={[company]}
          onCreated={() => {
            reload()
            onCompanyChanged()
          }}
          onClose={() => setAddingUser(false)}
        />
      )}
    </div>
  )
}
