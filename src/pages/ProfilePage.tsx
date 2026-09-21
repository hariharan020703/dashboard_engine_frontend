import { useEffect, useState } from 'react'
import {
  CheckCircle2,
  KeyRound,
  LogOut,
  Monitor,
  ShieldCheck,
} from 'lucide-react'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import { useAuth } from '@/context/authContext'
import { fetchSessions } from '@/api/authApi'
import { errorMessage } from '@/api/client'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import RoleBadge from '@/components/rbac/RoleBadge'
import StatusBadge from '@/components/rbac/StatusBadge'
import { dedupeDashboards } from '@/services/dashboards'
import { useNotification } from '@/ui/notificationContext'
import { PageHeader, Panel } from '@/ui/page'
import { actionDangerCls, actionPrimaryCls } from '@/ui/styles'
import type { SessionSummary } from '@/types/auth'

export default function ProfilePage() {
  const { user, dashboards, signOut } = useAuth()
  const notify = useNotification()
  const isPlatform = user?.companyId === null

  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)
  const [changingPassword, setChangingPassword] = useState(false)

  useEffect(() => {
    let cancelled = false
    fetchSessions()
      .then((rows) => {
        if (!cancelled) setSessions(rows)
      })
      .catch((err) => {
        if (!cancelled) {
          setSessions([])
          notify.error('Could not load your active sessions.', errorMessage(err, ''))
        }
      })
    return () => {
      cancelled = true
    }
  }, [notify])

  if (!user) return null

  const listed = dedupeDashboards(dashboards)

  // Map raw permissions to friendly business descriptions
  const friendlyCapabilities = user.permissions.map((p) => {
    const map: Record<string, string> = {
      'company.read': 'View customer companies',
      'company.create': 'Onboard new companies',
      'company.update': 'Update company configuration',
      'company.delete': 'Remove customer companies',
      'user.read': 'View team directory',
      'user.create': 'Onboard new users & employees',
      'user.update': 'Manage team member roles',
      'user.delete': 'Delete user accounts',
      'user.activate': 'Reactivate accounts',
      'user.deactivate': 'Deactivate accounts',
      'dashboard.read': 'View interactive dashboards',
      'dashboard.update': 'Customize visual card specifications',
      'dashboard.assign': 'Assign dashboards to companies',
      'data.read': 'Inspect business data catalog',
      'group.read': 'View functional team groups',
      'group.create': 'Create team groups',
      'group.update': 'Manage group memberships',
      'group.delete': 'Remove groups',
      'access.read': 'Audit dashboard access grants',
      'access.grant': 'Allocate dashboard access to members',
      'access.revoke': 'Revoke dashboard access',
      'role.read': 'View system roles & RBAC',
      'role.update': 'Manage role permissions',
      'scope.read': 'View row-level data scopes',
      'scope.update': 'Assign row-level data scopes',
    }
    return map[p] || p.replace(/\./g, ' ')
  })

  return (
    <div className="p-6">
      <PageHeader
        title="My Account & Security"
        description="Manage your profile identity, authentication credentials, and active sessions."
        actions={
          <button type="button" className={actionDangerCls} onClick={() => void signOut()}>
            <LogOut size={14} />
            Sign Out
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Details Panel */}
        <Panel title="Profile Details">
          <div className="flex items-center gap-3 border-b border-slate-100 pb-4 mb-4">
            <div className="grid h-12 w-12 place-items-center rounded-full bg-blue-50 text-base font-bold text-blue-700">
              {(user.displayName || user.username)[0].toUpperCase()}
            </div>
            <div>
              <h3 className="font-bold text-slate-900">{user.displayName || user.username}</h3>
              <p className="text-xs text-slate-500 font-mono">@{user.username}</p>
            </div>
          </div>

          <dl className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Email Address</dt>
              <dd className="mt-1 font-semibold text-slate-800">{user.email}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Organization</dt>
              <dd className="mt-1 font-semibold text-slate-800">
                {user.companyName
                  ? user.companyName
                  : isPlatform
                  ? 'Platform Owner'
                  : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Assigned Role</dt>
              <dd className="mt-1">
                <RoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Account Status</dt>
              <dd className="mt-1">
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Member Since</dt>
              <dd className="mt-1 text-slate-700">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Last Sign-in</dt>
              <dd className="mt-1 text-slate-700">
                {user.lastLoginAt ? new Date(user.lastLoginAt).toLocaleString() : 'Current session'}
              </dd>
            </div>
          </dl>
        </Panel>

        {/* Password & Security Panel */}
        <Panel
          title="Password & Security"
          description="Protect your account with a secure password."
          actions={
            !changingPassword ? (
              <button
                type="button"
                onClick={() => setChangingPassword(true)}
                className={actionPrimaryCls}
              >
                <KeyRound size={13} />
                Change Password
              </button>
            ) : null
          }
        >
          {changingPassword ? (
            <div className="pt-1">
              <ChangePasswordForm
                onDone={() => {
                  setChangingPassword(false)
                  notify.success('Password changed successfully.')
                }}
                onCancel={() => setChangingPassword(false)}
              />
            </div>
          ) : (
            <div className="space-y-3 text-xs text-slate-600">
              <p>
                Your account is secured with a bcrypt-hashed password and rotating session tokens.
              </p>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <ShieldCheck size={14} className="text-emerald-600" />
                Password must be at least 8 characters long.
              </div>
            </div>
          )}
        </Panel>

        {/* Assigned Dashboards */}
        <Panel
          title="Granted Dashboards"
          description="Analytics applications your account is authorized to view or edit."
          flush
        >
          {listed.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">
              No dashboards assigned yet.
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {listed.map((d) => (
                <div
                  key={d.id}
                  className="flex items-center justify-between p-3.5 text-xs transition-colors hover:bg-slate-50/50"
                >
                  <span className="font-semibold text-slate-800">{d.title || d.id}</span>
                  <AccessLevelBadge level={d.accessLevel} />
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Active Browser Sessions */}
        <Panel
          title="Active Sessions"
          description="Devices and browsers currently authenticated to your account."
          flush
        >
          {!sessions ? (
            <div className="p-6 text-center text-xs text-slate-400">Loading active sessions…</div>
          ) : sessions.length === 0 ? (
            <div className="p-6 text-center text-xs text-slate-400">No other active sessions.</div>
          ) : (
            <div className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <div key={s.familyId} className="flex items-center justify-between p-3.5 text-xs">
                  <div className="flex items-center gap-2.5">
                    <Monitor size={16} className="text-slate-400" />
                    <div>
                      <p className="font-semibold text-slate-800">
                        {s.current ? 'Current Browser Session' : 'Active Session'}
                      </p>
                      <p className="text-[11px] text-slate-400">
                        Last used: {new Date(s.lastUsedAt).toLocaleString()}
                      </p>
                    </div>
                  </div>

                  {s.current ? (
                    <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                      Current
                    </span>
                  ) : (
                    <span className="text-[11px] text-slate-400">Valid session</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </Panel>

        {/* Human-Readable Capabilities Summary */}
        <div className="lg:col-span-2">
          <Panel
            title="System Capabilities & Access Permissions"
            description="Capabilities granted through your assigned system role."
          >
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {friendlyCapabilities.map((cap, i) => (
                <div
                  key={`cap-${i}`}
                  className="flex items-center gap-2 rounded-lg border border-slate-100 bg-slate-50/50 p-2 text-xs text-slate-700"
                >
                  <CheckCircle2 size={13} className="shrink-0 text-emerald-600" />
                  <span className="truncate capitalize">{cap}</span>
                </div>
              ))}
            </div>
          </Panel>
        </div>
      </div>
    </div>
  )
}
