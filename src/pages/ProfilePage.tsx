import { useState } from 'react'
import { KeyRound, LogOut, Monitor, ShieldCheck } from 'lucide-react'
import { fetchSessions } from '@/api/authApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { dedupeDashboards } from '@/services/dashboards'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { AccessLevelBadge, RoleBadge, StatusBadge } from '@/components/common/Badges'
import { EmptyState, ErrorState, InlineLoading } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/**
 * Your own account.
 *
 * Personal information, the password, and the sessions currently signed in -
 * the things somebody wants to know or change about themselves.
 *
 * It deliberately does NOT list raw permission ids. The old screen printed all
 * twenty-eight of them as a checklist, which is a description of the
 * authorization model rather than an answer to "what can I do here" - and for a
 * USER it was a list of capabilities they mostly do not have. What a person can
 * reach is already the navigation they can see; what they have been given is
 * their dashboards, which are listed. A platform owner gets the permission
 * model in full on the Roles screen, where it belongs.
 */
export default function ProfilePage() {
  const { user, dashboards, signOut } = useAuth()
  const paths = usePaths()
  const [changingPassword, setChangingPassword] = useState(false)

  const sessions = useAsync(() => fetchSessions(), [])

  if (!user) return null

  const granted = dedupeDashboards(dashboards)
  const isPlatform = user.companyId === null

  return (
    <Page>
      <PageHeader
        title="Your account"
        description="Your details, your password and the devices you are signed in on."
        actions={
          <Button variant="outline" onClick={() => void signOut()}>
            <LogOut aria-hidden />
            Sign out
          </Button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Section title="Details">
          <dl className="grid gap-4 sm:grid-cols-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Name</dt>
              <dd className="mt-1 font-medium text-foreground">
                {user.displayName || user.username}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Username</dt>
              <dd className="mt-1 text-foreground">{user.username}</dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">Email</dt>
              <dd className="mt-1 text-foreground">{user.email}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Role</dt>
              <dd className="mt-1">
                <RoleBadge role={user.role} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1">
                <StatusBadge status={user.status} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {isPlatform ? 'Belongs to' : 'Company'}
              </dt>
              <dd className="mt-1">
                {user.companyName ? (
                  <span className="text-foreground">{user.companyName}</span>
                ) : (
                  <Badge variant="outline" className="text-muted-foreground">
                    The platform
                  </Badge>
                )}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Joined</dt>
              <dd className="mt-1 text-foreground">
                {user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}
              </dd>
            </div>
          </dl>
        </Section>

        <Section
          title="Password"
          description="Changing it signs out every other session on your account."
          actions={
            !changingPassword && (
              <Button size="sm" onClick={() => setChangingPassword(true)}>
                <KeyRound aria-hidden />
                Change password
              </Button>
            )
          }
        >
          {changingPassword ? (
            <ChangePasswordForm
              onDone={() => setChangingPassword(false)}
              onCancel={() => setChangingPassword(false)}
            />
          ) : (
            <p className="flex items-start gap-2 text-sm text-muted-foreground">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
              Your password is stored hashed and is never visible to anyone, including
              administrators. If you forget it, an administrator sends you a new activation link
              rather than telling you what it was.
            </p>
          )}
        </Section>

        {/* A platform account holds no dashboard grants, so this is not shown to one. */}
        {!isPlatform && (
          <Section
            title="Your dashboards"
            description="What has been shared with you, and what you can do with each."
            flush
          >
            {granted.length === 0 ? (
              <EmptyState
                title="Nothing shared yet"
                body="Your administrator has not given you a dashboard."
                compact
              />
            ) : (
              <ul className="divide-y divide-border">
                {granted.map((dashboard) => (
                  <li
                    key={dashboard.id}
                    className="flex flex-wrap items-center justify-between gap-2 px-5 py-3"
                  >
                    <a
                      href={paths.dashboard(dashboard.id)}
                      className="min-w-0 truncate text-sm font-medium text-foreground hover:text-primary"
                    >
                      {dashboard.title || dashboard.id}
                    </a>
                    <AccessLevelBadge level={dashboard.accessLevel} />
                  </li>
                ))}
              </ul>
            )}
          </Section>
        )}

        <Section
          title="Signed in on"
          description="Each is a browser that can refresh your session without a password."
          flush
        >
          {sessions.error ? (
            <ErrorState
              error={sessions.error}
              title="Unable to load your sessions"
              onRetry={sessions.reload}
              compact
            />
          ) : sessions.loading ? (
            <InlineLoading label="Loading your sessions…" />
          ) : (sessions.data ?? []).length === 0 ? (
            <EmptyState title="No other sessions" compact />
          ) : (
            <ul className="divide-y divide-border">
              {(sessions.data ?? []).map((session) => (
                <li
                  key={session.familyId}
                  className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
                >
                  <span className="flex min-w-0 items-center gap-2.5">
                    <Monitor className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    <span className="min-w-0">
                      <span className="block text-sm text-foreground">
                        {session.current ? 'This browser' : 'Another browser'}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        Last used {new Date(session.lastUsedAt).toLocaleString()}
                      </span>
                    </span>
                  </span>
                  {session.current && (
                    <Badge
                      variant="outline"
                      className="border-success/25 bg-success/10 text-success"
                    >
                      Current
                    </Badge>
                  )}
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>
    </Page>
  )
}
