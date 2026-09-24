import { Link } from 'react-router-dom'
import { ArrowRight, ChartColumn, KeyRound, LayoutDashboard, Plus, Users, UsersRound } from 'lucide-react'
import { fetchWorkspaceOverview } from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { StatCard } from '@/components/common/StatCard'
import { AccessLevelBadge } from '@/components/common/Badges'
import { EmptyState, ErrorState, StatSkeleton } from '@/components/common/States'
import { Button } from '@/components/ui/button'

/** "Good morning" and so on. Nothing hangs on it, so it stays cheap. */
function greeting(): string {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good morning'
  if (hour < 18) return 'Good afternoon'
  return 'Good evening'
}

/**
 * The customer workspace's landing page.
 *
 * It says something different to each of the two roles that reach it, because
 * they arrived for different reasons. A USER came to open a dashboard, so their
 * dashboards are the page and nothing administrative appears at all. A
 * COMPANY_ADMIN also runs the place, so they additionally get the state of their
 * company - and those counts come from /api/workspace/overview, scoped to their
 * own company by the server.
 */
export default function WorkspaceOverviewPage() {
  const { user, dashboards, can } = useAuth()
  const paths = usePaths()

  const isAdmin = can('user.read')
  const granted = dashboards

  // Only an administrator has the permission behind this, so a plain member
  // never issues a request that would be refused.
  const overview = useAsync(
    () => (isAdmin ? fetchWorkspaceOverview() : Promise.resolve(null)),
    [isAdmin]
  )
  const counts = overview.data

  return (
    <Page>
      <PageHeader
        title={`${greeting()}, ${user?.displayName || user?.username || ''}`}
        description={
          isAdmin
            ? `You manage ${user?.companyName ?? 'your company'}.`
            : 'Your analytics workspace.'
        }
      />

      {/* Dashboards first: for most people, this is the whole product. */}
      <Section
        title="Your dashboards"
        description={
          granted.length > 0
            ? 'Live data, queried when you open one.'
            : undefined
        }
        actions={
          granted.length > 0 && (
            <Button variant="ghost" size="sm" asChild>
              <Link to={paths.dashboards}>
                See all
                <ArrowRight aria-hidden />
              </Link>
            </Button>
          )
        }
        flush={granted.length === 0}
      >
        {granted.length === 0 ? (
          <EmptyState
            title="No dashboards yet"
            body={
              isAdmin
                ? 'Nothing has been shared with you yet. You can give yourself access from the dashboard access screen.'
                : 'Your administrator has not shared a dashboard with you yet.'
            }
            icon={LayoutDashboard}
            action={
              isAdmin && paths.access ? (
                <Button asChild>
                  <Link to={paths.access}>
                    <KeyRound aria-hidden />
                    Manage dashboard access
                  </Link>
                </Button>
              ) : undefined
            }
          />
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {granted.slice(0, 6).map((dashboard) => (
              <li key={dashboard.id}>
                <Link
                  to={paths.dashboard(dashboard.id)}
                  className="group flex h-full items-start gap-3 rounded-lg border border-border p-4 transition-colors hover:border-primary/40 hover:bg-accent/40"
                >
                  <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-md bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                    <ChartColumn className="size-4" aria-hidden />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-foreground">
                      {dashboard.title || dashboard.id}
                    </span>
                    <span className="mt-1.5 block">
                      <AccessLevelBadge level={dashboard.accessLevel} />
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {/* Everything below is administration, and only an administrator sees it. */}
      {isAdmin && (
        <>
          <h2 className="mt-8 mb-4 text-sm font-semibold text-foreground">
            {user?.companyName ?? 'Your company'}
          </h2>

          {overview.error ? (
            <Section>
              <ErrorState
                error={overview.error}
                title="Unable to load your company's figures"
                onRetry={overview.reload}
                compact
              />
            </Section>
          ) : overview.loading ? (
            <StatSkeleton count={3} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-3">
              <StatCard
                label="People"
                value={counts?.users ?? null}
                icon={Users}
                to={paths.users}
                hint={
                  counts
                    ? `${counts.usersActive} active · ${counts.usersPending} invited`
                    : undefined
                }
              />
              <StatCard
                label="Groups"
                value={counts?.groups ?? null}
                icon={UsersRound}
                to={paths.groups}
                hint={counts ? `${counts.groupsActive} active` : undefined}
              />
              <StatCard
                label="Dashboards available"
                value={counts?.dashboards ?? null}
                icon={LayoutDashboard}
                to={paths.access ?? undefined}
                hint={counts ? `${counts.dashboardsGranted} shared with you` : undefined}
              />
            </div>
          )}

          {counts && counts.usersPending > 0 && (
            <Section className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  <span className="font-medium text-foreground">
                    {counts.usersPending}{' '}
                    {counts.usersPending === 1 ? 'person has' : 'people have'}
                  </span>{' '}
                  not set a password yet. They cannot sign in until they use their invitation.
                </p>
                <Button variant="outline" size="sm" asChild>
                  <Link to={paths.users}>
                    Review invitations
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              </div>
            </Section>
          )}

          {counts && counts.users <= 1 && (
            <Section className="mt-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm text-muted-foreground">
                  You are the only person here. Add colleagues and they will be invited by email.
                </p>
                <Button size="sm" asChild>
                  <Link to={paths.users}>
                    <Plus aria-hidden />
                    Add a colleague
                  </Link>
                </Button>
              </div>
            </Section>
          )}
        </>
      )}
    </Page>
  )
}
