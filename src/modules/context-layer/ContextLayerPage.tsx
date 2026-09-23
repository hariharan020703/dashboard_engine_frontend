import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Database, Plug, RefreshCw, Trash2 } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { useAsync } from '@/hooks/useAsync'
import { createAdkSession } from '@/api/adkAgentApi'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { CardGridSkeleton, EmptyState, ErrorState } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import ConnectDialog from './ConnectDialog'
import { deleteConnection, listConnections, listConnectors, verifyConnection } from './api'
import type { Connection, Connector } from './types'

/**
 * The context layer: where a company's warehouses are connected.
 *
 * Two halves. The gallery is what can be connected — including the connectors
 * that are not built yet, listed and visibly disabled, because a page showing
 * only Domo answers "can I bring my data in" wrongly. Below it are the
 * connections this company already has.
 *
 * Choosing datasets happens one level down, per connection, because that list
 * is fetched live from the warehouse and does not belong on a page that has to
 * render when the warehouse is unreachable.
 *
 * Every link here is built from `paths`, not written out. This screen is
 * mounted in both shells, and it used to send a platform administrator to
 * /context — a workspace address — which dropped them out of the console
 * mid-task. A feature that appears in two shells must not know which one it is
 * in.
 */
export default function ContextLayerPage() {
  const { can } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const canManage = can('context.manage')

  const connectors = useAsync(() => listConnectors(), [])
  const connections = useAsync(() => listConnections(), [])

  const [connecting, setConnecting] = useState<Connector | null>(null)
  const [deleting, setDeleting] = useState<Connection | null>(null)
  const [deletePending, setDeletePending] = useState(false)
  const [busyId, setBusyId] = useState<string | null>(null)

  const verify = async (connection: Connection) => {
    setBusyId(connection.id)
    try {
      await verifyConnection(connection.id)
      notify.success(`${connection.name} is still connected.`)
    } catch (err) {
      notify.failure(`verify ${connection.name}`, err)
    } finally {
      // Reloaded either way: a refused token has just been recorded as invalid
      // on the server, and the row on screen should say so.
      connections.reload()
      setBusyId(null)
    }
  }

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteConnection(deleting.id)
      notify.success(`${deleting.name} was removed.`, 'Its stored credential was deleted.')
      connections.reload()
      setDeleting(null)
    } catch (err) {
      notify.failure('remove that connection', err)
    } finally {
      setDeletePending(false)
    }
  }

  const loading = connectors.loading || connections.loading
  const error = connectors.error ?? connections.error

  return (
    <Page>
      <PageHeader
        title="Context layer"
        description="Connect a data warehouse, then choose the datasets a context is built from."
      />

      {error ? (
        <Section>
          <ErrorState
            error={error}
            title="Unable to load the context layer"
            onRetry={() => {
              connectors.reload()
              connections.reload()
            }}
          />
        </Section>
      ) : loading ? (
        <CardGridSkeleton count={3} />
      ) : (
        <div className="space-y-6">
          <Section
            title="Connectors"
            description={
              canManage
                ? 'Choose a warehouse to connect.'
                : 'Your role can see connections but not create them.'
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {(connectors.data ?? []).map((connector) => {
                const available = connector.status === 'available'
                const usable = available && canManage
                return (
                  <button
                    key={connector.id}
                    type="button"
                    disabled={!usable}
                    onClick={() => setConnecting(connector)}
                    className={cn(
                      'flex h-full flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-colors',
                      'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-2',
                      usable
                        ? 'border-border bg-card hover:border-primary/40 hover:bg-accent/40'
                        : 'cursor-not-allowed border-dashed border-border bg-muted/40'
                    )}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Plug
                          className={cn(
                            'size-4',
                            usable ? 'text-primary' : 'text-muted-foreground/60'
                          )}
                          aria-hidden
                        />
                        <span
                          className={cn(
                            'text-sm font-medium',
                            usable ? 'text-foreground' : 'text-muted-foreground'
                          )}
                        >
                          {connector.name}
                        </span>
                      </span>
                      {!available && (
                        <Badge variant="outline" className="text-muted-foreground">
                          Planned
                        </Badge>
                      )}
                    </span>
                    <span className="text-xs leading-snug text-muted-foreground">
                      {connector.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </Section>

          <Section
            title="Connections"
            description="Each connection belongs to one company and holds its own credential."
            flush
          >
            {(connections.data ?? []).length === 0 ? (
              <EmptyState
                title="No warehouse connected yet"
                body={
                  canManage
                    ? 'Pick a connector above. The credential is checked against the warehouse before it is saved, so a connection on this list is one that worked.'
                    : 'Nobody has connected a warehouse for this company yet.'
                }
                icon={Database}
                compact
              />
            ) : (
              <ul className="divide-y divide-border">
                {(connections.data ?? []).map((connection) => {
                  const datasetPath = paths.contextConnection(connection.id)
                  return (
                    <li
                      key={connection.id}
                      className="flex flex-wrap items-center gap-3 px-5 py-3"
                    >
                      <Database
                        className="size-4 shrink-0 text-muted-foreground"
                        aria-hidden
                      />
                      <span className="min-w-0 flex-1">
                        <Link
                          to={datasetPath}
                          className="block truncate text-sm font-medium text-foreground hover:text-primary"
                        >
                          {connection.name}
                        </Link>
                        <span className="block truncate text-xs text-muted-foreground">
                          {connection.provider} · {connection.host} · token {connection.secretHint}
                          {connection.selectedDatasetCount
                            ? ` · ${connection.selectedDatasetCount} dataset${
                                connection.selectedDatasetCount === 1 ? '' : 's'
                              } selected`
                            : ' · no datasets selected'}
                        </span>
                        {connection.status === 'invalid' && connection.lastError && (
                          <span className="mt-0.5 block text-xs text-destructive">
                            {connection.lastError}
                          </span>
                        )}
                      </span>

                      <Badge
                        variant="outline"
                        className={
                          connection.status === 'connected'
                            ? 'border-success/25 bg-success/10 text-success'
                            : 'border-destructive/25 bg-destructive/10 text-destructive'
                        }
                      >
                        {connection.status === 'connected' ? 'Connected' : 'Not working'}
                      </Badge>

                      <Button variant="outline" size="sm" onClick={() => navigate(datasetPath)}>
                        Datasets
                      </Button>

                      {canManage && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={busyId === connection.id}
                            onClick={() => void verify(connection)}
                          >
                            <RefreshCw
                              className={busyId === connection.id ? 'animate-spin' : undefined}
                              aria-hidden
                            />
                            {busyId === connection.id ? 'Checking…' : 'Verify'}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            className="text-destructive hover:text-destructive"
                            aria-label={`Remove ${connection.name}`}
                            onClick={() => setDeleting(connection)}
                          >
                            <Trash2 aria-hidden />
                          </Button>
                        </>
                      )}
                    </li>
                  )
                })}
              </ul>
            )}
          </Section>
        </div>
      )}

      {connecting && (
        <ConnectDialog
          connector={connecting}
          onClose={() => setConnecting(null)}
          onConnected={(result) => {
            setConnecting(null)

            /*
             * Fire-and-forget: the connection is already saved, so a session
             * failure here must not block the redirect to it. The connection's
             * own id IS the ADK backend's workspace_id — that service has no
             * workspaces table of its own (see adk_agents/api/main.py).
             */
            createAdkSession(result.connection.id, 'context_layer_extractor').catch((err) => {
              notify.failure('start the context extraction agent for this connection', err)
            })

            // Straight to the picker: the datasets were just fetched, and
            // choosing them is why somebody connected in the first place.
            navigate(paths.contextConnection(result.connection.id))
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Remove ${deleting.name}?` : ''}
        body="The connection and its stored token are deleted."
        consequence="The dataset selection goes with it. Nothing in the warehouse is touched, but reconnecting means entering a token again."
        confirmLabel="Remove connection"
        destructive
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </Page>
  )
}
