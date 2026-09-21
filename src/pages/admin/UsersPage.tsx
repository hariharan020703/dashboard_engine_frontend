import { useCallback, useEffect, useState } from 'react'
import {
  Mail,
  Plus,
  Trash2,
  UserCheck,
  UserX,
} from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  activateUser,
  deactivateUser,
  deleteUser,
  listCompanies,
  listUsers,
  resendActivation,
} from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import DataTable, { type ColumnDef } from '@/ui/DataTable'
import ConfirmDialog from '@/ui/ConfirmDialog'
import UserOnboardingModal from '@/components/onboarding/UserOnboardingModal'
import RoleBadge from '@/components/rbac/RoleBadge'
import StatusBadge from '@/components/rbac/StatusBadge'
import { useNotification } from '@/ui/notificationContext'
import { Badge, PageHeader } from '@/ui/page'
import {
  actionButtonCls,
  actionDangerCls,
  actionPrimaryCls,
} from '@/ui/styles'
import type { AdminUser, Company } from '@/types/admin'

export default function UsersPage() {
  const { can, user: me } = useAuth()
  const notify = useNotification()
  const navigate = useNavigate()
  const isPlatform = me?.companyId === null

  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [roleFilter, setRoleFilter] = useState<string>('')
  const [statusFilter, setStatusFilter] = useState<string>('')

  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const [reloadToken, setReloadToken] = useState(0)

  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  // Load users
  useEffect(() => {
    let cancelled = false
    listUsers(companyFilter ? Number(companyFilter) : undefined)
      .then((data) => {
        if (!cancelled) setUsers(data)
      })
      .catch((err) => {
        if (!cancelled) {
          setUsers([])
          notify.error('Could not load users.', errorMessage(err, ''))
        }
      })
    return () => {
      cancelled = true
    }
  }, [companyFilter, reloadToken, notify])

  // Load companies for the platform filter
  useEffect(() => {
    if (!isPlatform || !can('company.read')) return
    let cancelled = false
    listCompanies()
      .then((data) => {
        if (!cancelled) setCompanies(data)
      })
      .catch(() => {})
    return () => {
      cancelled = true
    }
  }, [isPlatform, can])

  const handleDelete = async (target: AdminUser) => {
    try {
      await deleteUser(target.id)
      notify.success(`Account "${target.username}" was permanently deleted.`)
      reload()
    } catch (err) {
      notify.error('Unable to delete the account.', errorMessage(err, ''))
    } finally {
      setDeleting(null)
    }
  }

  const handleToggleStatus = async (target: AdminUser) => {
    try {
      if (target.status === 'active') {
        await deactivateUser(target.id)
        notify.success(`Account "${target.username}" deactivated.`)
      } else {
        await activateUser(target.id)
        notify.success(`Account "${target.username}" reactivated.`)
      }
      reload()
    } catch (err) {
      notify.error('Unable to change account status.', errorMessage(err, ''))
    }
  }

  const handleResendActivation = async (target: AdminUser) => {
    try {
      await resendActivation(target.id)
      notify.success(`A fresh invitation has been emailed to ${target.email}.`)
    } catch (err) {
      notify.error('Unable to send activation email.', errorMessage(err, ''))
    }
  }

  // Filtered dataset
  const displayUsers = (users ?? []).filter((u) => {
    if (roleFilter && u.role !== roleFilter) return false
    if (statusFilter && u.status !== statusFilter) return false
    return true
  })

  const detailPath = (u: AdminUser) =>
    isPlatform ? `/platform/users/${u.id}` : `/team/users/${u.id}`

  const columns: ColumnDef<AdminUser>[] = [
    {
      key: 'username',
      header: 'Name / Username',
      sortable: true,
      render: (u) => (
        <div className="flex items-center gap-2.5">
          <span className="grid h-8 w-8 place-items-center rounded-full bg-slate-100 text-slate-700 font-bold text-xs">
            {(u.displayName || u.username)[0].toUpperCase()}
          </span>
          <div>
            <span className="font-semibold text-slate-900 group-hover:text-blue-600">
              {u.displayName || u.username}
            </span>
            <span className="block font-mono text-[11px] text-slate-400">@{u.username}</span>
          </div>
        </div>
      ),
    },
    {
      key: 'email',
      header: 'Email',
      sortable: true,
      render: (u) => <span className="font-mono text-slate-600">{u.email}</span>,
    },
    ...(isPlatform
      ? [
          {
            key: 'companyName',
            header: 'Company',
            sortable: true,
            render: (u: AdminUser) => (
              <span className="text-slate-700 font-medium">
                {u.companyName ? (
                  u.companyName
                ) : (
                  <Badge tone="neutral">Platform</Badge>
                )}
              </span>
            ),
          },
        ]
      : []),
    {
      key: 'role',
      header: 'Role',
      sortable: true,
      render: (u) => <RoleBadge role={u.role} />,
    },
    {
      key: 'status',
      header: 'Status',
      sortable: true,
      render: (u) => <StatusBadge status={u.status} />,
    },
    {
      key: 'lastLoginAt',
      header: 'Last Active',
      sortable: true,
      render: (u) => (
        <span className="text-slate-500">
          {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : 'Never'}
        </span>
      ),
    },
    {
      key: 'actions',
      header: 'Actions',
      align: 'right',
      render: (u) => {
        const isSelf = u.id === me?.id
        return (
          <div
            className="flex items-center justify-end gap-1"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => navigate(detailPath(u))}
              className={actionButtonCls}
            >
              Manage
            </button>

            {u.status === 'pending' && can('user.update') && (
              <button
                type="button"
                onClick={() => void handleResendActivation(u)}
                className={actionButtonCls}
                title="Resend onboarding invitation"
              >
                <Mail size={13} />
              </button>
            )}

            {!isSelf && can('user.deactivate') && (
              <button
                type="button"
                onClick={() => void handleToggleStatus(u)}
                className={actionButtonCls}
                title={u.status === 'active' ? 'Deactivate account' : 'Reactivate account'}
              >
                {u.status === 'active' ? (
                  <UserX size={13} className="text-amber-600" />
                ) : (
                  <UserCheck size={13} className="text-emerald-600" />
                )}
              </button>
            )}

            {!isSelf && can('user.delete') && (
              <button
                type="button"
                onClick={() => setDeleting(u)}
                className={actionDangerCls}
                title="Delete user"
              >
                <Trash2 size={13} />
              </button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Users & Team Directory"
        description={
          isPlatform
            ? 'Manage all platform accounts, company administrators, and team members.'
            : `Manage employees and access for ${me?.companyName || 'Workspace'}.`
        }
        actions={
          can('user.create') ? (
            <button
              type="button"
              onClick={() => setCreating(true)}
              className={actionPrimaryCls}
            >
              <Plus size={14} />
              Add User
            </button>
          ) : null
        }
      />

      <DataTable
        data={displayUsers}
        columns={columns}
        keyOf={(u) => u.id}
        loading={users === null}
        searchPlaceholder="Search users by name, username, or email…"
        searchFilter={(u, q) =>
          u.username.toLowerCase().includes(q) ||
          u.email.toLowerCase().includes(q) ||
          (u.displayName || '').toLowerCase().includes(q)
        }
        emptyMessage="No users found"
        emptyHint="Onboard your first user using the Add User wizard."
        onRowClick={(u) => navigate(detailPath(u))}
        filters={
          <div className="flex flex-wrap items-center gap-2">
            {isPlatform && companies.length > 0 && (
              <select
                value={companyFilter}
                onChange={(e) => setCompanyFilter(e.target.value)}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
              >
                <option value="">All Companies</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Roles</option>
              <option value="USER">USER</option>
              <option value="COMPANY_ADMIN">COMPANY_ADMIN</option>
              {isPlatform && <option value="SUPER_ADMIN">SUPER_ADMIN</option>}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-9 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-700 focus:border-blue-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="active">Active</option>
              <option value="pending">Pending</option>
              <option value="disabled">Disabled</option>
            </select>
          </div>
        }
      />

      {creating && (
        <UserOnboardingModal
          companies={companies}
          onCreated={() => {
            reload()
          }}
          onClose={() => setCreating(false)}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title={`Delete "${deleting.username}"?`}
          message="Are you sure you want to delete this account?"
          consequence="This will permanently delete this account and all associated dashboard grants and sessions. This action cannot be undone."
          confirmLabel="Delete User"
          destructive
          onConfirm={() => void handleDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
