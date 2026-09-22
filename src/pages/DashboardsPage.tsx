import { Link } from 'react-router-dom'
import { ChartColumn, KeyRound, LayoutDashboard } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { dedupeDashboards } from '@/services/dashboards'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { AccessLevelBadge } from '@/components/common/Badges'
import { EmptyState } from '@/components/common/States'
import { Button } from '@/components/ui/button'

/**
 * Every dashboard this account can open.
 *
 * The list comes from the profile the session already carries - the server
 * resolved it as part of signing in, from the company's assignments and the
 * grants reaching this person - so there is nothing to fetch and no loading
 * state to design. That is also why it cannot show a dashboard somebody is not
 * entitled to: it is not a catalogue with a filter on it, it is the answer.
 */
export default function DashboardsPage() {
  const { dashboards, can, user } = useAuth()
  const paths = usePaths()

  const granted = dedupeDashboards(dashboards)
  const isAdmin = can('access.grant')
  const isPlatform = paths.shell === 'platform'

  return (
    <Page>
      <PageHeader
        title="Dashboards"
        description={
          granted.length > 0
            ? `${granted.length} ${granted.length === 1 ? 'dashboard' : 'dashboards'} you can open.`
            : undefined
        }
      />

      {granted.length === 0 ? (
        <Section flush>
          <EmptyState
            title="No dashboards yet"
            icon={LayoutDashboard}
            body={
              isPlatform
                ? 'A platform account holds no dashboard grants of its own. Assign a dashboard to a company, then grant it to an account inside that company to open it.'
                : isAdmin
                  ? 'Nothing has been shared with you yet. You can give yourself access from the dashboard access screen.'
                  : 'Your administrator has not shared a dashboard with you yet.'
            }
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
        </Section>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {granted.map((dashboard) => (
            <li key={dashboard.id}>
              <Link
                to={paths.dashboard(dashboard.id)}
                className="group flex h-full flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30"
              >
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <ChartColumn className="size-4" aria-hidden />
                </span>
                <span className="mt-4 block truncate text-sm font-medium text-foreground">
                  {dashboard.title || dashboard.id}
                </span>
                <span className="mt-3 block">
                  <AccessLevelBadge level={dashboard.accessLevel} />
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {user?.role === 'USER' && granted.length > 0 && (
        <p className="mt-6 text-xs text-muted-foreground">
          Need another dashboard? Ask an administrator at your company.
        </p>
      )}
    </Page>
  )
}
