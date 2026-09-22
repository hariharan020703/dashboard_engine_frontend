import { useState } from 'react'
import type { FormEvent } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import { ArrowRight, LayoutDashboard, Loader2, Trash2, UserPlus, Users } from 'lucide-react'
import {
  assignDashboard,
  deleteCompany,
  fetchCompany,
  listCompanyDashboards,
  listUsers,
  unassignDashboard,
  updateCompany,
} from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { usePaths } from '@/app/usePaths'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ActiveBadge, RoleBadge, StatusBadge } from '@/components/common/Badges'
import { CompanyAvatar } from '@/components/common/CompanyAvatar'
import { StatCard } from '@/components/common/StatCard'
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  InlineLoading,
} from '@/components/common/States'
import { FormNotice, TextField } from '@/components/common/Fields'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { UserOnboardingDialog } from '@/components/onboarding/UserOnboardingDialog'
import { notify } from '@/components/common/notify'
import { Button } from '@/components/ui/button'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { DashboardSummary } from '@/types/admin'

/**
 * One customer, administered from the platform.
 *
 * Tabbed rather than one long page, because the four things a platform owner
 * does to a customer - look at it, see its people, decide what it may use,
 * change or suspend it - are separate errands with nothing to say to each other.
 *
 * Every read here is platform-scoped by the API. A customer's own administrator
 * reaches the same facts through /api/workspace, and never through this screen.
 */
export default function CompanyDetailPage() {
  const { companyId: companyIdParam } = useParams()
  const companyId = Number(companyIdParam)
  const { can } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()

  const [addingUser, setAddingUser] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deletePending, setDeletePending] = useState(false)

  const company = useAsync(() => fetchCompany(companyId), [companyId])
  const users = useAsync(() => listUsers(companyId), [companyId])
  const dashboards = useAsync(() => listCompanyDashboards(companyId), [companyId])

  /*
   * The settings form, DERIVED from the loaded company until somebody edits it.
   * Null means "as loaded", so a reload is reflected immediately and there is no
   * effect copying the record into state on every load.
   */
  const [draft, setDraft] = useState<{ name: string; active: boolean } | null>(null)
  const name = draft?.name ?? company.data?.name ?? ''
  const active = draft?.active ?? company.data?.active ?? true

  const editDraft = (change: Partial<{ name: string; active: boolean }>) =>
    setDraft((current) => ({
      name: change.name ?? current?.name ?? company.data?.name ?? '',
      active: change.active ?? current?.active ?? company.data?.active ?? true,
    }))

  const [savingSettings, setSavingSettings] = useState(false)

  const [togglingDashboard, setTogglingDashboard] = useState<string | null>(null)

  if (!Number.isInteger(companyId) || companyId <= 0) {
    return (
      <Page>
        <ErrorState
          error={null}
          title="That is not a company address"
          onRetry={() => navigate(paths.companies ?? '/platform')}
        />
      </Page>
    )
  }

  if (company.error) {
    return (
      <Page>
        <PageHeader
          title="Company"
          crumbs={[{ label: 'Companies', to: paths.companies ?? undefined }, { label: 'Not available' }]}
        />
        <Section>
          <ErrorState error={company.error} title="Unable to load this company" onRetry={company.reload} />
        </Section>
      </Page>
    )
  }

  if (company.loading || !company.data) {
    return (
      <Page>
        <PageHeader title="Loading company…" />
        <CardGridSkeleton count={3} />
      </Page>
    )
  }

  const record = company.data

  const toggleDashboard = async (dashboard: DashboardSummary) => {
    setTogglingDashboard(dashboard.id)
    const label = dashboard.title || dashboard.id
    try {
      if (dashboard.assigned) {
        await unassignDashboard(companyId, dashboard.id)
        notify.success(`${record.name} can no longer use ${label}.`, 'Grants inside the company were removed with it.')
      } else {
        await assignDashboard(companyId, dashboard.id)
        notify.success(`${record.name} can now use ${label}.`, 'Their administrator decides who sees it.')
      }
      dashboards.reload()
      company.reload()
    } catch (err) {
      notify.failure('change that assignment', err)
    } finally {
      setTogglingDashboard(null)
    }
  }

  const saveSettings = async (event: FormEvent) => {
    event.preventDefault()
    setSavingSettings(true)
    try {
      await updateCompany(companyId, { name: name.trim(), active })
      // Back to deriving from the record, which the reload refreshes.
      setDraft(null)
      company.reload()
      notify.success('Company updated.')
    } catch (err) {
      notify.failure('save these changes', err)
    } finally {
      setSavingSettings(false)
    }
  }

  const confirmDelete = async () => {
    setDeletePending(true)
    try {
      await deleteCompany(companyId)
      notify.success(`${record.name} has been deleted.`)
      navigate(paths.companies ?? '/platform')
    } catch (err) {
      // The server refuses while the company still has accounts, and says so.
      notify.failure('delete this company', err)
      setDeletePending(false)
      setDeleting(false)
    }
  }

  const memberCount = users.data?.length ?? null
  const assignedCount = dashboards.data?.filter((d) => d.assigned).length ?? null
  const willSuspend = record.active && !active

  return (
    <Page>
      <PageHeader
        crumbs={[
          { label: 'Companies', to: paths.companies ?? undefined },
          { label: record.name },
        ]}
        icon={<CompanyAvatar name={record.name} size="lg" />}
        title={record.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ActiveBadge active={record.active} />
            <span className="text-xs">{record.slug}</span>
          </span>
        }
        actions={
          can('user.create') && (
            <Button onClick={() => setAddingUser(true)}>
              <UserPlus aria-hidden />
              Add a person
            </Button>
          )
        }
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="people">People</TabsTrigger>
          <TabsTrigger value="dashboards">Dashboards</TabsTrigger>
          {can('company.update') && <TabsTrigger value="settings">Settings</TabsTrigger>}
        </TabsList>

        {/* ------------------------------------------------- overview --- */}
        <TabsContent value="overview" className="mt-4 space-y-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <StatCard label="People" value={memberCount} icon={Users} loading={users.loading} />
            <StatCard
              label="Dashboards assigned"
              value={assignedCount}
              icon={LayoutDashboard}
              loading={dashboards.loading}
            />
            <StatCard
              label="Awaiting activation"
              value={users.data ? users.data.filter((u) => u.status === 'pending').length : null}
              icon={UserPlus}
              loading={users.loading}
            />
          </div>

          <Section title="Administrators" description="Who runs this company." flush>
            {users.error ? (
              <ErrorState error={users.error} onRetry={users.reload} compact />
            ) : users.loading ? (
              <InlineLoading label="Loading people…" />
            ) : (
              (() => {
                const admins = (users.data ?? []).filter((u) => u.role === 'COMPANY_ADMIN')
                if (admins.length === 0) {
                  return (
                    <EmptyState
                      title="No administrator"
                      body="This company has nobody who can manage it. Add a person with the company admin role."
                      action={
                        can('user.create') && (
                          <Button onClick={() => setAddingUser(true)}>
                            <UserPlus aria-hidden />
                            Add an administrator
                          </Button>
                        )
                      }
                      compact
                    />
                  )
                }
                return (
                  <ul className="divide-y divide-border">
                    {admins.map((admin) => (
                      <li key={admin.id}>
                        <Link
                          to={paths.user(admin.id)}
                          className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                        >
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm font-medium text-foreground">
                              {admin.displayName || admin.username}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {admin.email}
                            </span>
                          </span>
                          <StatusBadge status={admin.status} />
                          <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                        </Link>
                      </li>
                    ))}
                  </ul>
                )
              })()
            )}
          </Section>
        </TabsContent>

        {/* --------------------------------------------------- people --- */}
        <TabsContent value="people" className="mt-4">
          <Section
            title="People"
            description={`Everyone with an account at ${record.name}.`}
            flush
          >
            {users.error ? (
              <ErrorState error={users.error} onRetry={users.reload} compact />
            ) : users.loading ? (
              <InlineLoading label="Loading people…" />
            ) : (users.data ?? []).length === 0 ? (
              <EmptyState
                title="Nobody here yet"
                body="This company has no accounts. Add its first person — they will be invited by email."
                action={
                  can('user.create') && (
                    <Button onClick={() => setAddingUser(true)}>
                      <UserPlus aria-hidden />
                      Add a person
                    </Button>
                  )
                }
                compact
              />
            ) : (
              <ul className="divide-y divide-border">
                {(users.data ?? []).map((member) => (
                  <li key={member.id}>
                    <Link
                      to={paths.user(member.id)}
                      className="flex flex-wrap items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {member.displayName || member.username}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {member.email}
                        </span>
                      </span>
                      <RoleBadge role={member.role} />
                      <StatusBadge status={member.status} />
                      <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </Section>
        </TabsContent>

        {/* ----------------------------------------------- dashboards --- */}
        <TabsContent value="dashboards" className="mt-4">
          <Section
            title="Available dashboards"
            description="What this company is entitled to. Their own administrator decides which of their people sees each one."
            flush
          >
            {dashboards.error ? (
              <ErrorState error={dashboards.error} onRetry={dashboards.reload} compact />
            ) : dashboards.loading ? (
              <InlineLoading label="Loading dashboards…" />
            ) : (dashboards.data ?? []).length === 0 ? (
              <EmptyState
                title="No dashboards exist yet"
                body="The dashboard registry is empty, so there is nothing to assign."
                icon={LayoutDashboard}
                compact
              />
            ) : (
              <ul className="divide-y divide-border">
                {(dashboards.data ?? []).map((dashboard) => {
                  const busy = togglingDashboard === dashboard.id
                  const title = dashboard.title || dashboard.id
                  return (
                    <li
                      key={dashboard.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-foreground">
                          {title}
                        </span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {dashboard.source}
                        </span>
                      </span>
                      <Label
                        htmlFor={`assign-${dashboard.id}`}
                        className="text-xs text-muted-foreground"
                      >
                        {dashboard.assigned ? 'Available' : 'Not available'}
                      </Label>
                      <Switch
                        id={`assign-${dashboard.id}`}
                        checked={Boolean(dashboard.assigned)}
                        disabled={busy || !can('dashboard.assign')}
                        onCheckedChange={() => void toggleDashboard(dashboard)}
                        aria-label={`${dashboard.assigned ? 'Remove' : 'Give'} ${record.name} access to ${title}`}
                      />
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </TabsContent>

        {/* ------------------------------------------------- settings --- */}
        {can('company.update') && (
          <TabsContent value="settings" className="mt-4 space-y-6">
            <Section title="Company details">
              <form onSubmit={saveSettings} className="max-w-md space-y-4" noValidate>
                <TextField
                  label="Company name"
                  value={name}
                  onChange={(value) => editDraft({ name: value })}
                  required
                />

                <div className="flex items-start justify-between gap-4 rounded-lg border border-border p-4">
                  <div className="min-w-0">
                    <Label htmlFor="company-active" className="text-sm font-medium">
                      Active
                    </Label>
                    <p className="mt-1 text-xs text-muted-foreground">
                      Suspending a company signs out everyone in it immediately and stops them
                      signing back in.
                    </p>
                  </div>
                  <Switch
                    id="company-active"
                    checked={active}
                    onCheckedChange={(value) => editDraft({ active: value })}
                  />
                </div>

                {willSuspend && (
                  <FormNotice
                    message={
                      memberCount === null
                        ? 'Saving this will sign out everyone in this company.'
                        : `Saving this will sign out all ${memberCount} ${memberCount === 1 ? 'person' : 'people'} in this company.`
                    }
                  />
                )}

                <Button type="submit" disabled={savingSettings || !name.trim()}>
                  {savingSettings && <Loader2 className="animate-spin" aria-hidden />}
                  Save changes
                </Button>
              </form>
            </Section>

            {can('company.delete') && (
              <Section
                title="Delete this company"
                description="Permanent. Only possible once every account in it has been removed."
                className="border-destructive/30"
              >
                <Button variant="destructive" onClick={() => setDeleting(true)}>
                  <Trash2 aria-hidden />
                  Delete {record.name}
                </Button>
              </Section>
            )}
          </TabsContent>
        )}
      </Tabs>

      <UserOnboardingDialog
        open={addingUser}
        onOpenChange={setAddingUser}
        onCreated={() => {
          users.reload()
          company.reload()
        }}
        companies={[record]}
      />

      <ConfirmDialog
        open={deleting}
        onOpenChange={setDeleting}
        title={`Delete ${record.name}?`}
        body="This removes the company and everything inside it — its groups, its dashboard assignments and every grant. It cannot be undone."
        consequence={
          memberCount && memberCount > 0
            ? `This company still has ${memberCount} ${memberCount === 1 ? 'account' : 'accounts'}. They must be deleted first — the server will refuse until they are.`
            : undefined
        }
        confirmLabel="Delete company"
        destructive
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </Page>
  )
}
