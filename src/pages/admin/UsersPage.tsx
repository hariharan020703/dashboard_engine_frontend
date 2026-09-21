import { useCallback, useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import { Link } from 'react-router-dom'
import { createUser, deleteUser, listCompanies, listUsers } from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import RoleBadge from '@/components/rbac/RoleBadge'
import RoleSelect from '@/components/rbac/RoleSelect'
import StatusBadge from '@/components/rbac/StatusBadge'
import ConfirmDialog from '@/ui/ConfirmDialog'
import Modal from '@/ui/Modal'
import { useNotification } from '@/ui/notificationContext'
import { TextField } from '@/ui/fields'
import { EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import {
  actionButtonCls,
  actionDangerCls,
  actionPrimaryCls,
  labelCls,
  primaryButtonCls,
  selectCls,
  tableCls,
  tdCls,
  thCls,
} from '@/ui/styles'
import type { AdminUser, Company } from '@/types/admin'
import type { RoleName } from '@/types/auth'

/**
 * The user directory.
 *
 * A company administrator sees their own company and nothing else, because the
 * backend filters the query by who is asking - this page sends no company id at
 * all. A platform account sees everyone and can narrow with the filter.
 *
 * Every button is offered only when the signed-in user's role holds the
 * permission that endpoint requires, so the screen shows what will work and the
 * backend decides whether it does.
 */
export default function UsersPage() {
  const { can, user: me } = useAuth()
  const notify = useNotification()
  const isPlatform = me?.companyId === null

  // `null` means "not loaded yet" - see the note in CompaniesPage for why the
  // loading flag is derived rather than written at the top of the effect.
  const [users, setUsers] = useState<AdminUser[] | null>(null)
  const [companies, setCompanies] = useState<Company[]>([])
  const [companyFilter, setCompanyFilter] = useState<string>('')
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<AdminUser | null>(null)
  const loading = users === null
  const rows = users ?? []

  /*
   * Reloading bumps a counter rather than calling a loader, so the fetch lives
   * in the effect that owns it and there is one code path for the first load,
   * a change of filter, and every refresh after a change.
   */
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await listUsers(companyFilter ? Number(companyFilter) : undefined)
        if (!cancelled) setUsers(found)
      } catch (err) {
        if (cancelled) return
        setUsers([])
        notify.error('Could not load the user directory.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [companyFilter, reloadToken, notify])

  // The company filter and the create dialog both need the list, and only a
  // platform account has more than one company to choose from.
  useEffect(() => {
    if (!isPlatform || !can('company.read')) return
    let cancelled = false
    const run = async () => {
      try {
        const rows = await listCompanies()
        if (!cancelled) setCompanies(rows)
      } catch (err) {
        if (!cancelled) notify.error('Could not load companies.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isPlatform, can, notify])

  const onDelete = async (target: AdminUser) => {
    try {
      await deleteUser(target.id)
      notify.success(`"${target.username}" was deleted.`)
      reload()
    } catch (err) {
      notify.error('Unable to delete the account.', errorMessage(err, ''))
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Users"
        description="Accounts, the role each one holds, and the dashboards they may open."
        actions={
          <div className="flex items-end gap-2">
            {isPlatform && companies.length > 0 && (
              <div className="w-52">
                <label className={labelCls} htmlFor="user-company-filter">
                  Company
                </label>
                <select
                  id="user-company-filter"
                  className={selectCls}
                  value={companyFilter}
                  onChange={(e) => setCompanyFilter(e.target.value)}
                >
                  <option value="">All companies</option>
                  {companies.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            )}
            {can('user.create') && (
              <button type="button" className={actionPrimaryCls} onClick={() => setCreating(true)}>
                <Plus size={14} />
                Add user
              </button>
            )}
          </div>
        }
      />

      <Panel flush>
        {loading && <Loading label="Loading users…" />}
        {!loading && rows.length === 0 && <EmptyState message="No accounts yet." />}
        {!loading && rows.length > 0 && (
          <div className="overflow-x-auto">
            <table className={tableCls}>
              <thead>
                <tr>
                  <th className={thCls}>User</th>
                  {isPlatform && <th className={thCls}>Company</th>}
                  <th className={thCls}>Role</th>
                  <th className={thCls}>Status</th>
                  <th className={thCls}>Last sign-in</th>
                  <th className={thCls} />
                </tr>
              </thead>
              <tbody>
                {rows.map((u) => (
                  <tr key={u.id}>
                    <td className={tdCls}>
                      <span className="block font-medium text-slate-800">
                        {u.displayName || u.username}
                        {u.id === me?.id && (
                          <span className="ml-1.5 text-[11px] text-slate-400">(you)</span>
                        )}
                      </span>
                      <span className="block text-[11px] text-slate-400">{u.email}</span>
                    </td>
                    {isPlatform && (
                      <td className={`${tdCls} text-slate-500`}>
                        {u.companyName || <span className="text-slate-400">Platform</span>}
                      </td>
                    )}
                    <td className={tdCls}>
                      <RoleBadge role={u.role} />
                    </td>
                    <td className={tdCls}>
                      <StatusBadge status={u.status} />
                    </td>
                    <td className={`${tdCls} text-slate-500`}>
                      {u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleDateString() : '—'}
                    </td>
                    <td className={`${tdCls} whitespace-nowrap text-right`}>
                      <Link to={`/admin/users/${u.id}`} className={actionButtonCls}>
                        Manage
                      </Link>
                      {can('user.delete') && u.id !== me?.id && (
                        <button
                          type="button"
                          className={`${actionDangerCls} ml-2`}
                          onClick={() => setDeleting(u)}
                        >
                          <Trash2 size={14} />
                          Delete
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>

      {creating && (
        <CreateUserDialog
          companies={companies}
          isPlatform={isPlatform}
          onClose={() => setCreating(false)}
          onCreated={() => {
            setCreating(false)
            reload()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this account?"
          message={`"${deleting.username}" will be removed from the platform.`}
          consequence="This cannot be undone. Their dashboard grants, group memberships and data scopes go with them."
          confirmLabel="Delete account"
          destructive
          onConfirm={() => onDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/**
 * Onboarding form.
 *
 * No password field, deliberately. The account is created with no credential at
 * all and its owner sets one through a single-use emailed link, so there is
 * never a password that two people have seen.
 */
function CreateUserDialog({
  companies,
  isPlatform,
  onClose,
  onCreated,
}: {
  companies: Company[]
  isPlatform: boolean
  onClose: () => void
  onCreated: () => void
}) {
  const notify = useNotification()
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<RoleName>('USER')
  const [companyId, setCompanyId] = useState('')
  const [pending, setPending] = useState(false)

  const activeCompanies = useMemo(() => companies.filter((c) => c.active), [companies])

  // A platform account must say which company, unless the new account is itself
  // a platform one. A company administrator never sends a company at all.
  const needsCompany = isPlatform && role !== 'SUPER_ADMIN'
  const ready = username.trim() && email.trim() && (!needsCompany || companyId)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !ready) return
    setPending(true)

    const progress = notify.pending('Creating the account and sending the invitation…')
    try {
      const created = await createUser({
        username: username.trim(),
        email: email.trim(),
        displayName: displayName.trim() || undefined,
        role,
        companyId: needsCompany ? Number(companyId) : undefined,
      })
      notify.dismiss(progress)
      notify.success(
        `${created.username} was created.`,
        `An activation link has been sent to ${created.email}.`
      )
      onCreated()
    } catch (err) {
      notify.dismiss(progress)
      notify.error('Unable to create the account.', errorMessage(err, ''))
      setPending(false)
    }
  }

  return (
    <Modal title="Add user" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Username" value={username} onChange={setUsername} autoFocus disabled={pending} />
        <TextField
          label="Email"
          value={email}
          onChange={setEmail}
          autoComplete="email"
          disabled={pending}
        />
        <TextField
          label="Display name (optional)"
          value={displayName}
          onChange={setDisplayName}
          disabled={pending}
          required={false}
        />

        <RoleSelect value={role} onChange={setRole} includePlatform={isPlatform} disabled={pending} />

        {needsCompany && (
          <div>
            <label className={labelCls} htmlFor="new-user-company">
              Company
            </label>
            <select
              id="new-user-company"
              className={selectCls}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={pending}
            >
              <option value="">Choose a company…</option>
              {activeCompanies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] leading-snug text-slate-500">
          No password is set here. They receive a single-use link by email and choose their own,
          so nobody else ever sees it.
        </p>

        <button type="submit" className={primaryButtonCls} disabled={pending || !ready}>
          {pending ? 'Creating…' : 'Create and send invitation'}
        </button>
      </form>
    </Modal>
  )
}
