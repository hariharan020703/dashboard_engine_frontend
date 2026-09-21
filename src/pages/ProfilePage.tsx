import { useEffect, useState } from 'react'
import { LogOut, Monitor } from 'lucide-react'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import { useAuth } from '@/context/authContext'
import { fetchSessions } from '@/api/authApi'
import { errorMessage } from '@/api/client'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import RoleBadge from '@/components/rbac/RoleBadge'
import StatusBadge from '@/components/rbac/StatusBadge'
import { dedupeDashboards } from '@/services/dashboards'
import { useNotification } from '@/ui/notificationContext'
import { FormNotice } from '@/ui/feedback'
import { EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { actionDangerCls, labelCls } from '@/ui/styles'
import type { SessionSummary } from '@/types/auth'

/**
 * The account screen: everything the platform knows about you, and the things
 * you can do about it.
 *
 * Permissions, data scopes, dashboard grants and live sessions are all read
 * back from the server rather than inferred, so this page doubles as the honest
 * answer to "why can I not see that" - the same values the API enforces on.
 */
export default function ProfilePage() {
  const { user, dashboards, scopes, scopesEnforced, signOut } = useAuth()
  const notify = useNotification()

  const [sessions, setSessions] = useState<SessionSummary[] | null>(null)

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const rows = await fetchSessions()
        if (!cancelled) setSessions(rows)
      } catch (err) {
        if (!cancelled) {
          setSessions([])
          notify.error('Could not load your sessions.', errorMessage(err, ''))
        }
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [notify])

  if (!user) return null

  const listed = dedupeDashboards(dashboards)
  const scopeEntries = Object.entries(scopes)

  return (
    <div className="p-6">
      <PageHeader
        title="Profile"
        description="Your identity, what you may do, and what data you may see."
        actions={
          <button type="button" className={actionDangerCls} onClick={() => void signOut()}>
            <LogOut size={14} />
            Sign out
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="Account">
          <dl className="grid gap-4 sm:grid-cols-2">
            <div>
              <dt className={labelCls}>Username</dt>
              <dd className="text-sm font-medium text-slate-800">{user.username}</dd>
            </div>
            <div>
              <dt className={labelCls}>Email</dt>
              <dd className="truncate text-sm text-slate-800">{user.email}</dd>
            </div>
            <div>
              <dt className={labelCls}>Role</dt>
              <dd>
                <RoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className={labelCls}>Status</dt>
              <dd>
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div>
              <dt className={labelCls}>Company</dt>
              <dd className="text-sm text-slate-800">
                {user.companyName || 'Platform (no company)'}
              </dd>
            </div>
            <div>
              <dt className={labelCls}>Dashboards granted</dt>
              <dd className="text-sm text-slate-800">{listed.length}</dd>
            </div>
          </dl>
        </Panel>

        <Panel
          title="Permissions"
          description="Held through your role. These are what the API checks on every request."
        >
          {user.permissions.length === 0 ? (
            <p className="text-sm text-slate-500">Your role holds no permissions.</p>
          ) : (
            <ul className="flex flex-wrap gap-1.5">
              {[...user.permissions].sort().map((p) => (
                <li key={p}>
                  <code className="rounded bg-slate-100 px-1.5 py-0.5 text-[12px] text-slate-600">
                    {p}
                  </code>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Dashboard access" flush>
          {listed.length === 0 ? (
            <EmptyState message="No dashboards have been granted to you yet." />
          ) : (
            <ul className="divide-y divide-slate-100">
              {listed.map((d) => (
                <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
                  <span className="min-w-0 truncate text-sm text-slate-700">{d.title || d.id}</span>
                  <AccessLevelBadge level={d.accessLevel} />
                </li>
              ))}
            </ul>
          )}
        </Panel>

        {/*
          Sessions are listed so somebody can see whether their account is
          signed in somewhere they did not expect. Changing the password ends
          all of them, which is the action that follows from noticing one.
        */}
        <Panel
          title="Active sessions"
          description="Changing your password signs every other one out."
          flush
        >
          {sessions === null && <Loading label="Loading sessions…" />}
          {sessions !== null && sessions.length === 0 && (
            <EmptyState message="No active sessions recorded." />
          )}
          {sessions !== null && sessions.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {sessions.map((s) => (
                <li key={s.familyId} className="flex items-center gap-3 px-5 py-2.5">
                  <Monitor size={15} className="shrink-0 text-slate-400" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] text-slate-700">
                      Started {new Date(s.startedAt).toLocaleString()}
                    </span>
                    <span className="block text-[11px] text-slate-400">
                      Last used {new Date(s.lastUsedAt).toLocaleString()}
                    </span>
                  </span>
                  {s.current && (
                    <span className="shrink-0 text-[11px] font-semibold uppercase tracking-wider text-blue-600">
                      This device
                    </span>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel title="Data scopes" description="Row-level slices assigned to your account.">
          {!scopesEnforced && (
            <div className="mb-3">
              <FormNotice message="Data scopes are recorded but not yet applied to queries — every dashboard still reads the full table." />
            </div>
          )}
          {scopeEntries.length === 0 ? (
            <p className="text-sm text-slate-500">No scopes assigned, which reads as unrestricted.</p>
          ) : (
            <dl className="space-y-3">
              {scopeEntries.map(([dimension, values]) => (
                <div key={dimension}>
                  <dt className={labelCls}>{dimension}</dt>
                  <dd className="text-sm text-slate-700">{values.join(', ')}</dd>
                </div>
              ))}
            </dl>
          )}
        </Panel>

        <Panel title="Change password">
          {/* The form announces its own outcome through the notification system. */}
          <ChangePasswordForm onDone={() => {}} />
        </Panel>
      </div>
    </div>
  )
}
