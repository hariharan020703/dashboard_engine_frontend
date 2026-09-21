import { useCallback, useEffect, useState } from 'react'
import { ArrowLeft, Mail, Trash2 } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import {
  activateUser,
  deactivateUser,
  fetchScopeOptions,
  fetchUser,
  fetchUserGrants,
  fetchUserScope,
  grantUserAccess,
  listGrantableDashboards,
  resendActivation,
  revokeUserAccess,
  saveUserScope,
  updateUser,
} from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import GrantPicker from '@/components/rbac/GrantPicker'
import RoleBadge from '@/components/rbac/RoleBadge'
import RoleSelect from '@/components/rbac/RoleSelect'
import StatusBadge from '@/components/rbac/StatusBadge'
import { useAuth } from '@/context/authContext'
import ChipSelect from '@/ui/ChipSelect'
import ConfirmDialog from '@/ui/ConfirmDialog'
import { useNotification } from '@/ui/notificationContext'
import { FormError, FormNotice } from '@/ui/feedback'
import { EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import {
  actionButtonCls,
  actionDangerCls,
  actionPrimaryCls,
  labelCls,
  tableCls,
  tdCls,
  thCls,
} from '@/ui/styles'
import type { AccessLevel, RoleName } from '@/types/auth'
import type { AdminUser, DashboardSummary, ScopeDimension, UserGrant } from '@/types/admin'

export default function UserDetailPage() {
  const { id } = useParams()
  const userId = Number(id)
  const { can, user: me } = useAuth()

  // A malformed id is decided from the route, not by a state write - there is
  // nothing to fetch, so there is nothing to be loading.
  const idIsValid = Number.isInteger(userId) && userId > 0

  const [target, setTarget] = useState<AdminUser | null>(null)
  const [error, setError] = useState<string | null>(null)
  const loading = idIsValid && target === null && error === null

  // Reloading bumps a counter rather than calling a loader, so the fetch lives
  // in the effect that owns it - see CompaniesPage for the same shape.
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    if (!idIsValid) return undefined
    let cancelled = false
    const run = async () => {
      try {
        const found = await fetchUser(userId)
        if (cancelled) return
        setTarget(found)
        setError(null)
      } catch (err) {
        if (!cancelled) setError(errorMessage(err, 'Could not load the account.'))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [userId, idIsValid, reloadToken])

  const basePath = me?.companyId === null ? '/platform/users' : '/team/users'

  if (loading) return <Loading />

  if (!idIsValid) {
    return (
      <div className="p-6">
        <PageHeader title="User" />
        <Panel>
          <FormError message="That is not a valid user id." />
          <Link to={basePath} className="mt-4 inline-block text-[13px] font-medium text-blue-600">
            Back to users
          </Link>
        </Panel>
      </div>
    )
  }

  if (error || !target) {
    return (
      <div className="p-6">
        <PageHeader title="User" />
        <Panel>
          <FormError message={error || 'User not found.'} />
          <Link to={basePath} className="mt-4 inline-block text-[13px] font-medium text-blue-600">
            Back to users
          </Link>
        </Panel>
      </div>
    )
  }

  const isSelf = target.id === me?.id

  return (
    <div className="p-6">
      <Link
        to={basePath}
        className="mb-3 inline-flex items-center gap-1.5 text-[13px] font-medium text-slate-500 hover:text-slate-700"
      >
        <ArrowLeft size={14} />
        Users
      </Link>

      <PageHeader
        title={target.displayName || target.username}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <RoleBadge role={target.role} />
            <StatusBadge status={target.status} />
            <span>{target.email}</span>
            {target.companyName && (
              <span>· {target.companyName}</span>
            )}
          </span>
        }
      />

      <div className="space-y-6">
        <AccountPanel target={target} isSelf={isSelf} onChanged={reload} />
        {can('access.read') && <AccessPanel target={target} />}
        {can('scope.read') && <ScopePanel userId={target.id} />}
      </div>
    </div>
  )
}

function AccountPanel({
  target,
  isSelf,
  onChanged,
}: {
  target: AdminUser
  isSelf: boolean
  onChanged: () => void
}) {
  const { can, user: me } = useAuth()
  const notify = useNotification()
  const isPlatform = me?.companyId === null
  const editable = can('user.update') && !isSelf

  const [role, setRole] = useState<RoleName>(target.role)
  const [pending, setPending] = useState(false)
  const [confirmDeactivate, setConfirmDeactivate] = useState(false)
  const [confirmReissue, setConfirmReissue] = useState(false)

  const run = async (work: () => Promise<unknown>, success: string, failure: string) => {
    setPending(true)
    try {
      await work()
      notify.success(success)
      onChanged()
    } catch (err) {
      notify.error(failure, errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Account"
      description="Role and activation. The backend re-reads both on every request."
    >
      {isSelf && (
        <div className="mb-4">
          <FormNotice message="This is your own account. Use your profile to change it — an administrator who can demote themselves can lock the company out." />
        </div>
      )}
      {!can('user.update') && !isSelf && (
        <div className="mb-4">
          <FormNotice message="You can see this account but not change it — that needs the user.update permission." />
        </div>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <RoleSelect
              value={role}
              onChange={setRole}
              includePlatform={isPlatform}
              disabled={!editable || pending}
            />
          </div>
          <button
            type="button"
            className={actionPrimaryCls}
            disabled={!editable || pending || role === target.role}
            onClick={() =>
              run(
                () => updateUser(target.id, { role }),
                'Role updated. Their sessions have been ended.',
                'Unable to change the role.'
              )
            }
          >
            Save
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-4 self-end">
          <div>
            <dt className={labelCls}>Created</dt>
            <dd className="text-sm text-slate-700">
              {target.createdAt ? new Date(target.createdAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className={labelCls}>Last sign-in</dt>
            <dd className="text-sm text-slate-700">
              {target.lastLoginAt ? new Date(target.lastLoginAt).toLocaleString() : 'Never'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
        {target.status !== 'disabled' && can('user.deactivate') && !isSelf && (
          <button
            type="button"
            className={actionDangerCls}
            disabled={pending}
            onClick={() => setConfirmDeactivate(true)}
          >
            Deactivate
          </button>
        )}
        {target.status === 'disabled' && can('user.activate') && (
          <button
            type="button"
            className={actionPrimaryCls}
            disabled={pending}
            onClick={() =>
              run(
                () => activateUser(target.id),
                'Account reactivated.',
                'Unable to reactivate the account.'
              )
            }
          >
            Reactivate
          </button>
        )}
        {can('user.update') && target.status !== 'disabled' && (
          <button
            type="button"
            className={actionButtonCls}
            disabled={pending}
            onClick={() => setConfirmReissue(true)}
          >
            <Mail size={14} />
            {target.status === 'pending' ? 'Resend invitation' : 'Reset access'}
          </button>
        )}
        <span className="text-[12px] text-slate-400">
          {target.status === 'pending'
            ? 'This account has not set a password yet.'
            : 'Resetting access clears the password and sends a new link.'}
        </span>
      </div>

      {confirmDeactivate && (
        <ConfirmDialog
          title="Deactivate this account?"
          message={`"${target.username}" will be signed out and refused at sign-in.`}
          consequence="Their sessions end immediately. Nothing is deleted, and you can reactivate them later."
          confirmLabel="Deactivate"
          destructive
          onConfirm={() =>
            run(
              () => deactivateUser(target.id),
              'Account deactivated.',
              'Unable to deactivate the account.'
            )
          }
          onClose={() => setConfirmDeactivate(false)}
        />
      )}

      {confirmReissue && (
        <ConfirmDialog
          title={target.status === 'pending' ? 'Send a new invitation?' : 'Reset this account’s access?'}
          message={`A single-use activation link will be emailed to ${target.email}.`}
          consequence={
            target.status === 'pending'
              ? 'Any earlier link stops working.'
              : 'Their current password stops working immediately and their sessions end. They cannot sign in until they use the new link.'
          }
          confirmLabel="Send link"
          destructive={target.status !== 'pending'}
          onConfirm={() =>
            run(
              () => resendActivation(target.id),
              `Activation link sent to ${target.email}.`,
              'Unable to send the activation link.'
            )
          }
          onClose={() => setConfirmReissue(false)}
        />
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------------- access --- */

/** Dashboard grants: what this user may open, direct and through their groups. */
function AccessPanel({ target }: { target: AdminUser }) {
  const { can } = useAuth()
  const notify = useNotification()
  const mayGrant = can('access.grant')
  const mayRevoke = can('access.revoke')

  const [grants, setGrants] = useState<UserGrant[] | null>(null)
  const [dashboards, setDashboards] = useState<DashboardSummary[]>([])
  const [pending, setPending] = useState(false)
  const loading = grants === null
  const rows = grants ?? []

  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await fetchUserGrants(target.id)
        if (!cancelled) setGrants(found)
      } catch (err) {
        if (cancelled) return
        setGrants([])
        notify.error('Could not load this account’s access.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [target.id, reloadToken, notify])

  /*
   * The picker offers what the company has been assigned, not the whole
   * registry - the backend would refuse anything else, so offering it would
   * only produce an error the user could not act on.
   */
  useEffect(() => {
    if (!mayGrant) return
    let cancelled = false
    const run = async () => {
      try {
        const rows = await listGrantableDashboards(target.companyId ?? undefined)
        if (!cancelled) setDashboards(rows)
      } catch (err) {
        if (!cancelled) notify.error('Could not load the available dashboards.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [mayGrant, target.companyId, notify])

  const onGrant = async (dashboardId: string, level: AccessLevel) => {
    setPending(true)
    try {
      await grantUserAccess(dashboardId, target.id, level)
      notify.success(`Access granted at "${level}".`)
      reload()
    } catch (err) {
      notify.error('Unable to grant access.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  const onRevoke = async (dashboardId: string) => {
    setPending(true)
    try {
      await revokeUserAccess(dashboardId, target.id)
      notify.success('Access revoked.')
      reload()
    } catch (err) {
      notify.error('Unable to revoke access.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Dashboard access"
      description="The effective level is the strongest of their own grant and their groups'."
      flush
    >
      {mayGrant && <GrantPicker dashboards={dashboards} disabled={pending} onGrant={onGrant} />}

      {loading && <Loading label="Loading access…" />}
      {!loading && rows.length === 0 && (
        <EmptyState message="No dashboard reaches this account yet." />
      )}
      {!loading && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className={tableCls}>
            <thead>
              <tr>
                <th className={thCls}>Dashboard</th>
                <th className={thCls}>Level</th>
                <th className={thCls}>Granted through</th>
                <th className={thCls} />
              </tr>
            </thead>
            <tbody>
              {rows.map((g) => (
                <tr key={`${g.origin}-${g.dashboardId}-${g.groupId ?? 0}`}>
                  <td className={tdCls}>
                    <span className="block font-medium text-slate-800">
                      {g.dashboardTitle || g.dashboardId}
                    </span>
                    <span className="block text-[11px] text-slate-400">{g.dashboardId}</span>
                  </td>
                  <td className={tdCls}>
                    <AccessLevelBadge level={g.level} />
                  </td>
                  <td className={`${tdCls} text-slate-500`}>
                    {g.origin === 'direct' ? 'Direct grant' : `Group: ${g.groupName}`}
                  </td>
                  <td className={`${tdCls} whitespace-nowrap text-right`}>
                    {mayRevoke && g.origin === 'direct' && (
                      <button
                        type="button"
                        className={actionDangerCls}
                        onClick={() => void onRevoke(g.dashboardId)}
                        disabled={pending}
                      >
                        <Trash2 size={14} />
                        Revoke
                      </button>
                    )}
                    {g.origin === 'group' && (
                      <Link to="/admin/groups" className={actionButtonCls}>
                        Manage group
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------------- scopes --- */

/**
 * Row-level data scopes.
 *
 * Which dimensions exist is runtime configuration on the backend, and the
 * values come from the data itself, so this panel offers exactly what the
 * server will accept - and says plainly that nothing filters on them yet.
 */
function ScopePanel({ userId }: { userId: number }) {
  const { can } = useAuth()
  const notify = useNotification()
  const editable = can('scope.update')

  const [dimensions, setDimensions] = useState<ScopeDimension[] | null>(null)
  const [enforced, setEnforced] = useState(false)
  const [selected, setSelected] = useState<Record<string, string[]>>({})
  const [pending, setPending] = useState(false)
  const loading = dimensions === null
  const rows = dimensions ?? []

  useEffect(() => {
    let active = true
    const run = async () => {
      try {
        const [options, scope] = await Promise.all([fetchScopeOptions(), fetchUserScope(userId)])
        if (!active) return
        setDimensions(options.dimensions)
        setEnforced(options.enforced)
        setSelected(scope.scopes)
      } catch (err) {
        if (!active) return
        setDimensions([])
        notify.error('Could not load data scopes.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      active = false
    }
  }, [userId, notify])

  const toggle = (dimension: string, value: string) => {
    setSelected((prev) => {
      const current = prev[dimension] || []
      const next = current.includes(value)
        ? current.filter((v) => v !== value)
        : [...current, value]
      return { ...prev, [dimension]: next }
    })
  }

  const save = async () => {
    setPending(true)
    try {
      // Send every configured dimension, so clearing one reaches the server as
      // an empty list - which is what "unrestricted" is stored as.
      const payload: Record<string, string[]> = {}
      for (const d of rows) payload[d.dimension] = selected[d.dimension] || []
      await saveUserScope(userId, payload)
      notify.success('Data scopes saved.')
    } catch (err) {
      notify.error('Unable to save the data scopes.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Data scopes"
      description="Row-level slices this account may see. An empty dimension reads as unrestricted."
      actions={
        editable && rows.length > 0 ? (
          <button type="button" className={actionPrimaryCls} onClick={() => void save()} disabled={pending}>
            Save scopes
          </button>
        ) : null
      }
    >
      {!enforced && (
        <div className="mb-4">
          <FormNotice message="Scopes are stored and configurable, but nothing filters on them yet — every query still reads the full table." />
        </div>
      )}

      {loading && <Loading label="Loading scope dimensions…" />}

      {!loading && rows.length === 0 && (
        <p className="text-sm text-slate-500">
          No scope dimensions are configured. They are declared in the backend&apos;s
          <code className="mx-1 text-slate-700">config/rbac/scope-dimensions.json</code>.
        </p>
      )}

      {!loading &&
        rows.map((d) => (
          <div key={d.dimension} className="mb-5 last:mb-0">
            <p className={labelCls}>{d.label}</p>
            {d.error && <FormError message={d.error} />}
            <ChipSelect
              options={d.values}
              selected={selected[d.dimension] || []}
              onToggle={(value) => toggle(d.dimension, value)}
              keyOf={(value) => value}
              labelOf={(value) => value}
              disabled={!editable || pending}
              emptyMessage="No values found in the data."
            />
          </div>
        ))}
    </Panel>
  )
}
