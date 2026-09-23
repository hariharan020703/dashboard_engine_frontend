import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Activity, ArrowRight, Building2, LayoutDashboard, Plus, Users } from 'lucide-react'
import { fetchAuditLogs, fetchPlatformOverview, listCompanies } from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/app/usePaths'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { StatCard } from '@/components/common/StatCard'
import { ActiveBadge } from '@/components/common/Badges'
import { CompanyAvatar } from '@/components/common/CompanyAvatar'
import { EmptyState, ErrorState, InlineLoading, StatSkeleton } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { CompanyOnboardingDialog } from '@/components/onboarding/CompanyOnboardingDialog'

/** "3 minutes ago" for the activity feed, which is only ever recent. */
function relativeTime(iso: string): string {
  const then = new Date(iso).getTime()
  if (Number.isNaN(then)) return ''
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 60) return 'just now'
  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  return `${Math.round(hours / 24)}d ago`
}

/**
 * The platform console's landing page.
 *
 * Every number comes from /api/platform/overview, which counts rows. There is
 * no arithmetic here and no placeholder: a figure the API did not return is
 * rendered as "Unavailable" by StatCard rather than as a dash that reads like a
 * zero.
 *
 * The three regions load independently, so a failing audit file does not take
 * the customer list down with it - each reports its own state.
 */
export default function PlatformOverviewPage() {
  const { user } = useAuth()
  const paths = usePaths()
  const [onboarding, setOnboarding] = useState(false)

  const overview = useAsync(() => fetchPlatformOverview(), [])
  const companies = useAsync(() => listCompanies(), [])
  const activity = useAsync(() => fetchAuditLogs(5), [])

  const counts = overview.data
  const recent = [...(companies.data ?? [])]
    .sort((a, b) => (b.createdAt ?? '').localeCompare(a.createdAt ?? ''))
    .slice(0, 5)

  const reloadAll = () => {
    overview.reload()
    companies.reload()
    activity.reload()
  }

  return (
    <Page>
      <PageHeader
        title="Platform overview"
        description={`Signed in as ${user?.displayName || user?.username}. You manage every customer on this platform.`}
        actions={
          <Button onClick={() => setOnboarding(true)}>
            <Plus aria-hidden />
            Onboard a company
          </Button>
        }
      />

      {/* Counts */}
      {overview.error ? (
        <Section>
          <ErrorState
            error={overview.error}
            title="Unable to load platform figures"
            onRetry={overview.reload}
            compact
          />
        </Section>
      ) : overview.loading ? (
        <StatSkeleton />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Customers"
            value={counts?.companies ?? null}
            icon={Building2}
            to={paths.companies ?? undefined}
            hint={
              counts
                ? `${counts.companiesActive} active · ${counts.companiesInactive} suspended`
                : undefined
            }
          />
          <StatCard
            label="Users"
            value={counts?.users ?? null}
            icon={Users}
            to={paths.users}
            hint={
              counts
                ? `${counts.usersActive} active · ${counts.usersPending} awaiting activation`
                : undefined
            }
          />
          <StatCard
            label="Dashboards"
            value={counts?.dashboards ?? null}
            icon={LayoutDashboard}
            to={paths.dashboards}
            hint={counts ? `${counts.assignments} assignments across customers` : undefined}
          />
          <StatCard
            label="Company admins"
            value={counts?.companyAdmins ?? null}
            icon={Users}
            hint={counts ? `${counts.groups} groups in total` : undefined}
          />
        </div>
      )}

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <Section
            title="Recent customers"
            description="The most recently onboarded companies."
            actions={
              paths.companies && (
                <Button variant="ghost" size="sm" asChild>
                  <Link to={paths.companies}>
                    View all
                    <ArrowRight aria-hidden />
                  </Link>
                </Button>
              )
            }
            flush
          >
            {companies.error ? (
              <ErrorState
                error={companies.error}
                title="Unable to load customers"
                onRetry={companies.reload}
                compact
              />
            ) : companies.loading ? (
              <InlineLoading label="Loading customers…" />
            ) : recent.length === 0 ? (
              <EmptyState
                title="No customers yet"
                body="Onboard your first customer company to get started. You will create it and its administrator together."
                action={
                  <Button onClick={() => setOnboarding(true)}>
                    <Plus aria-hidden />
                    Onboard a company
                  </Button>
                }
                compact
              />
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((company) => (
                  <li key={company.id}>
                    <Link
                      to={paths.company(company.id) ?? '#'}
                      className="flex items-center gap-3 px-5 py-3.5 transition-colors hover:bg-muted/50"
                    >
                      <CompanyAvatar name={company.name} size="md" />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {company.name}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {company.userCount ?? 0} users · {company.dashboardCount ?? 0} dashboards
                        </span>
                      </span>
                      <ActiveBadge active={company.active} />
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </div>

        <Section
          title="Recent activity"
          description="From the audit log."
          actions={
            paths.audit && (
              <Button variant="ghost" size="sm" asChild>
                <Link to={paths.audit}>
                  View all
                  <ArrowRight aria-hidden />
                </Link>
              </Button>
            )
          }
          flush
        >
          {activity.error ? (
            <ErrorState
              error={activity.error}
              title="Unable to load activity"
              onRetry={activity.reload}
              compact
            />
          ) : activity.loading ? (
            <InlineLoading label="Loading activity…" />
          ) : (activity.data ?? []).length === 0 ? (
            <EmptyState
              title="Nothing recorded yet"
              body="Administrative actions appear here as they happen."
              icon={Activity}
              compact
            />
          ) : (
            <ul className="divide-y divide-border">
              {(activity.data ?? []).map((entry, index) => (
                <li key={`${entry.ts}-${index}`} className="px-5 py-3">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-sm font-medium text-foreground">
                      {entry.event.replace(/_/g, ' ').toLowerCase()}
                    </span>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {relativeTime(entry.ts)}
                    </span>
                  </div>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">
                    by {entry.actor ?? 'system'}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Section>
      </div>

      <CompanyOnboardingDialog
        open={onboarding}
        onOpenChange={setOnboarding}
        onCreated={reloadAll}
      />
    </Page>
  )
}
