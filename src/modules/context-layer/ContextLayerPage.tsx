import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { ArrowRight, Database, Plus, RefreshCw, Table2, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { ContextQueryProvider } from './queries/QueryProvider'
import { useConnections, useConnectors, useDeleteConnection, useVerifyConnection } from './queries/hooks'
import { VersionBadge } from './components/VersionBadge'
import { connectorPresentation, isConnectable } from './connectors/registry'
import { formatRelativeTime, maskSecretHint } from './components/format'
import type { Connection } from './types'

/**
 * The Context Layer landing: the data sources this company has connected.
 *
 * This is what the sidebar's "Context layer" opens, and it answers one
 * question — what is already connected, and is it still working. Building a
 * context is a separate, longer task, so it lives behind "New connection" in
 * the seven-step builder rather than being unfolded here.
 *
 * Connecting happens in the builder's first step and nowhere else. There used
 * to be a second connect dialog on this page; two forms for one credential is
 * exactly how the wording, the validation and the field list drift apart, so
 * the button here navigates into the workflow instead of opening its own.
 *
 * Every link is built from `paths`, never written out. This screen is mounted
 * in both shells, and a hardcoded /context would drop a platform administrator
 * out of the console mid-task.
 */
export default function ContextLayerPage() {
  return (
    <ContextQueryProvider>
      <ConnectionsLanding />
    </ContextQueryProvider>
  )
}

function ConnectionsLanding() {
  const { can } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const canManage = can('context.manage')

  const connections = useConnections()
  const connectors = useConnectors()
  const verify = useVerifyConnection()
  const remove = useDeleteConnection()

  const [deleting, setDeleting] = useState<Connection | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const runVerify = async (connection: Connection) => {
    setBusyId(connection.id)
    try {
      await verify.mutateAsync(connection.id)
      notify.success(`${connection.name} is still connected.`)
    } catch (err) {
      notify.failure(`verify ${connection.name}`, err)
    } finally {
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    try {
      await remove.mutateAsync(deleting.id)
      notify.success(`${deleting.name} was removed.`, 'Its stored credential was deleted.')
      setDeleting(null)
    } catch (err) {
      notify.failure('remove that connection', err)
    }
  }

  const newConnection = (
    <Button onClick={() => navigate(paths.contextBuilder())} disabled={!canManage}>
      <Plus className="size-4" aria-hidden />
      New connection
    </Button>
  )

  const list = connections.data ?? []
  const available = (connectors.data ?? []).filter(isConnectable)
  const planned = (connectors.data ?? []).filter((c) => !isConnectable(c))

  return (
    <Page>
      <PageHeader
        title="Context layer"
        description="The data sources connected to this company, and the context built from them."
        actions={canManage ? newConnection : undefined}
      />

      {connections.isError ? (
        <Section>
          <ErrorState
            error={connections.error}
            title="Unable to load your connections"
            onRetry={() => connections.refetch()}
          />
        </Section>
      ) : connections.isPending ? (
        <CardGridSkeleton count={3} />
      ) : list.length === 0 ? (
        <Section>
          <EmptyState
            title="No data source connected yet"
            body={
              canManage
                ? 'Start a new connection to choose a warehouse, pick its datasets, and build a context from them. The credential is validated against the warehouse before anything is saved.'
                : 'Nobody has connected a warehouse for this company yet. Your role can see connections but not create them.'
            }
            icon={Database}
            action={canManage ? newConnection : undefined}
          />
        </Section>
      ) : (
        <Section
          title="Connected sources"
          description="Each connection belongs to one company and holds its own credential."
        >
          <div className="grid gap-3 lg:grid-cols-2">
            {list.map((connection) => (
              <ConnectionCard
                key={connection.id}
                connection={connection}
                canManage={canManage}
                busy={busyId === connection.id}
                builderPath={paths.contextBuilder(connection.id)}
                datasetsPath={paths.contextConnection(connection.id)}
                onVerify={() => void runVerify(connection)}
                onDelete={() => setDeleting(connection)}
              />
            ))}
          </div>
        </Section>
      )}

      {/*
        A compact availability strip rather than the full gallery — the gallery
        is step one of the builder, and repeating it here would mean two places
        to keep in step. This only answers "what else can I connect".
      */}
      {connectors.data ? (
        <Section
          title="Connectors"
          description={`${available.length} available · ${planned.length} planned`}
        >
          <div className="flex flex-wrap gap-2">
            {(connectors.data ?? []).map((connector) => {
              const presentation = connectorPresentation(connector.id)
              const usable = isConnectable(connector)
              return (
                <span
                  key={connector.id}
                  className={cn(
                    'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm',
                    usable ? 'bg-card' : 'border-dashed bg-muted/40 text-muted-foreground'
                  )}
                >
                  <presentation.icon
                    className={cn('size-3.5', !usable && 'opacity-60')}
                    aria-hidden
                  />
                  {connector.name}
                  {usable ? null : (
                    <Badge variant="outline" className="text-[10px] text-muted-foreground">
                      Planned
                    </Badge>
                  )}
                </span>
              )
            })}
          </div>
        </Section>
      ) : null}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Remove ${deleting.name}?` : ''}
        body="The connection and its stored token are deleted."
        consequence="The dataset selection goes with it. Nothing in the warehouse is touched, but reconnecting means entering a token again."
        confirmLabel="Remove connection"
        destructive
        pending={remove.isPending}
        onConfirm={confirmDelete}
      />
    </Page>
  )
}

function ConnectionCard({
  connection,
  canManage,
  busy,
  builderPath,
  datasetsPath,
  onVerify,
  onDelete,
}: {
  connection: Connection
  canManage: boolean
  busy: boolean
  builderPath: string
  datasetsPath: string
  onVerify: () => void
  onDelete: () => void
}) {
  const presentation = connectorPresentation(connection.provider)
  const connected = connection.status === 'connected'
  const datasetCount = connection.selectedDatasetCount ?? 0

  return (
    <article className="flex flex-col rounded-xl border bg-card">
      <div className="flex items-start gap-3 p-4">
        <span
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-md',
            presentation.accentClass
          )}
        >
          <presentation.icon className="size-4" aria-hidden />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Link
              to={canManage ? builderPath : datasetsPath}
              className="truncate text-sm font-medium hover:text-primary"
            >
              {connection.name}
            </Link>
            <Badge
              variant="outline"
              className={
                connected
                  ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-300'
                  : 'border-rose-300 bg-rose-50 text-rose-700 dark:border-rose-900 dark:bg-rose-950/40 dark:text-rose-300'
              }
            >
              {connected ? 'Connected' : 'Not working'}
            </Badge>
          </div>

          <p className="mt-0.5 truncate text-xs text-muted-foreground">
            {connection.host} · {maskSecretHint(connection.secretHint)}
          </p>

          {connection.context ? (
            <p className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-muted-foreground">
              <VersionBadge status={connection.context.status} label={connection.context.label} />
              <span className="truncate">
                {connection.context.name}
                {connection.context.status === 'published' && connection.context.publishedAt
                  ? ` · published ${formatRelativeTime(connection.context.publishedAt)}`
                  : ` · edited ${formatRelativeTime(connection.context.updatedAt)}`}
              </span>
            </p>
          ) : null}

          <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Table2 className="size-3" aria-hidden />
              <dt className="sr-only">Datasets selected</dt>
              <dd>
                {datasetCount > 0
                  ? `${datasetCount} dataset${datasetCount === 1 ? '' : 's'} selected`
                  : 'No datasets selected'}
              </dd>
            </div>
            <div>
              <dt className="sr-only">Last verified</dt>
              <dd>Verified {formatRelativeTime(connection.lastVerifiedAt)}</dd>
            </div>
          </dl>

          {!connected && connection.lastError ? (
            <p className="mt-1.5 text-xs text-destructive">{connection.lastError}</p>
          ) : null}
        </div>
      </div>

      <footer className="mt-auto flex flex-wrap items-center gap-2 border-t px-4 py-2.5">
        {/*
          The builder is gated on `context.manage`, so a read-only account is
          not offered a button that would land them on a permission refusal.
          Their primary action is the dataset view instead.
        */}
        {canManage ? (
          <Button asChild size="sm">
            <Link to={builderPath}>
              {connection.context?.status === 'published'
                ? 'Edit context'
                : datasetCount > 0
                  ? 'Continue building'
                  : 'Build context'}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
          </Button>
        ) : null}

        <Button asChild size="sm" variant={canManage ? 'outline' : 'default'}>
          <Link to={datasetsPath}>Datasets</Link>
        </Button>

        {canManage ? (
          <>
            <Button size="sm" variant="outline" disabled={busy} onClick={onVerify}>
              <RefreshCw className={cn('size-4', busy && 'animate-spin')} aria-hidden />
              {busy ? 'Checking…' : 'Verify'}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="ml-auto text-destructive hover:text-destructive"
              aria-label={`Remove ${connection.name}`}
              onClick={onDelete}
            >
              <Trash2 className="size-4" aria-hidden />
            </Button>
          </>
        ) : null}
      </footer>
    </article>
  )
}
