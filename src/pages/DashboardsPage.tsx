import { useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ChartColumn, KeyRound, LayoutDashboard, Loader2, Plus, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { AccessLevelBadge } from '@/components/common/Badges'
import { EmptyState } from '@/components/common/States'
import { Button } from '@/components/ui/button'
import { TextField } from '@/components/common/Fields'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { createDashboard, deleteDashboard } from '@/api/dashboardApi'
import { notify } from '@/components/common/notify'

/**
 * Every dashboard this account can open.
 *
 * Supports creating new dashboards (Platform Admin, Company Admin, and Company User)
 * and deleting dashboards (Platform Admin and Company Admin only).
 */
export default function DashboardsPage() {
  const { dashboards, can, user, refresh } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()

  const granted = dashboards
  const isAdmin = can('access.grant')
  const canCreate = can('dashboard.create')
  // Deleting needs the role permission AND "Full control" of that dashboard.
  const canDelete = can('dashboard.delete')

  // The list carries each current level; re-read it on arrival so a change an
  // administrator just made is reflected without signing out.
  useEffect(() => {
    void refresh().catch(() => {})
  }, [refresh])
  const isPlatform = paths.shell === 'platform'

  const [createOpen, setCreateOpen] = useState(false)
  const [deletingDashboard, setDeletingDashboard] = useState<{ id: string; title: string } | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const handleCreated = async (id: string) => {
    await refresh()
    navigate(paths.dashboard(id))
  }

  const handleDeleteConfirm = async () => {
    if (!deletingDashboard) return
    setDeletePending(true)
    try {
      await deleteDashboard(deletingDashboard.id)
      notify.success('Dashboard deleted.')
      setDeletingDashboard(null)
      await refresh()
    } catch (err) {
      notify.failure('delete dashboard', err)
    } finally {
      setDeletePending(false)
    }
  }

  return (
    <Page>
      <PageHeader
        title="Dashboards"
        description={
          granted.length > 0
            ? `${granted.length} ${granted.length === 1 ? 'dashboard' : 'dashboards'} you can open.`
            : undefined
        }
        actions={
          canCreate ? (
            <Button onClick={() => setCreateOpen(true)} size="sm">
              <Plus className="size-4" aria-hidden />
              Create Dashboard
            </Button>
          ) : undefined
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
                  ? 'Nothing has been shared with you yet. You can create a new dashboard or grant access from the dashboard access screen.'
                  : canCreate
                    ? 'No dashboards have been shared with you yet. You can create your first dashboard now.'
                    : 'Your administrator has not shared a dashboard with you yet.'
            }
            action={
              canCreate ? (
                <Button onClick={() => setCreateOpen(true)}>
                  <Plus aria-hidden />
                  Create Dashboard
                </Button>
              ) : isAdmin && paths.access ? (
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
            <li key={dashboard.id} className="group relative flex flex-col rounded-xl border border-border bg-card p-5 transition-colors hover:border-primary/40 hover:bg-accent/30">
              <div className="flex items-start justify-between">
                <span className="grid size-9 place-items-center rounded-lg bg-muted text-muted-foreground transition-colors group-hover:bg-primary/10 group-hover:text-primary">
                  <ChartColumn className="size-4" aria-hidden />
                </span>
                {canDelete && dashboard.accessLevel === 'admin' && (
                  <button
                    type="button"
                    title="Delete dashboard"
                    aria-label={`Delete ${dashboard.title || dashboard.id}`}
                    onClick={(e) => {
                      e.preventDefault()
                      e.stopPropagation()
                      setDeletingDashboard({ id: dashboard.id, title: dashboard.title || dashboard.id })
                    }}
                    className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                )}
              </div>
              <Link
                to={paths.dashboard(dashboard.id)}
                className="mt-4 flex flex-1 flex-col focus:outline-none"
              >
                <span className="block truncate text-sm font-medium text-foreground group-hover:text-primary transition-colors">
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

      {user?.role === 'USER' && granted.length > 0 && !canCreate && (
        <p className="mt-6 text-xs text-muted-foreground">
          Need another dashboard? Ask an administrator at your company.
        </p>
      )}

      <CreateDashboardDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        onCreated={handleCreated}
      />

      <ConfirmDialog
        open={deletingDashboard !== null}
        onOpenChange={(open) => !open && setDeletingDashboard(null)}
        title={`Delete "${deletingDashboard?.title}"?`}
        body="Are you sure you want to delete this dashboard? This cannot be undone."
        consequence="All cards, custom configurations, and user access grants for this dashboard will be permanently deleted."
        confirmLabel="Delete Dashboard"
        destructive
        pending={deletePending}
        onConfirm={handleDeleteConfirm}
      />
    </Page>
  )
}

function CreateDashboardDialog({
  open,
  onOpenChange,
  onCreated,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: (id: string) => void
}) {
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim()) {
      setError('Title is required')
      return
    }
    setBusy(true)
    setError(null)
    try {
      const res = await createDashboard({
        title: title.trim(),
        description: description.trim() || undefined,
      })
      notify.success('Dashboard created successfully.')
      setTitle('')
      setDescription('')
      onOpenChange(false)
      onCreated(res.id)
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create dashboard'
      setError(msg)
      notify.failure('create dashboard', err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => !busy && onOpenChange(next)}>
      <DialogContent>
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Create New Dashboard</DialogTitle>
            <DialogDescription>
              Create a custom dashboard for your company. You will be able to customize cards and configurations.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <TextField
              label="Dashboard Title"
              value={title}
              onChange={(val) => {
                setTitle(val)
                if (error) setError(null)
              }}
              placeholder="e.g. Sales & Revenue Analytics"
              required
              autoFocus
              error={error}
            />

            <TextField
              label="Description (Optional)"
              value={description}
              onChange={setDescription}
              placeholder="Brief summary of what this dashboard tracks"
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={busy}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={busy || !title.trim()}>
              {busy ? (
                <>
                  <Loader2 className="size-4 animate-spin" aria-hidden />
                  Creating…
                </>
              ) : (
                'Create Dashboard'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

