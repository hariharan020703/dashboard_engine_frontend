import { useCallback, useEffect, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Database, Plug, RefreshCw, Trash2 } from 'lucide-react'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import ConfirmDialog from '@/ui/ConfirmDialog'
import { useNotification } from '@/ui/notificationContext'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { actionButtonCls, actionDangerCls } from '@/ui/styles'
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
 */
export default function ContextLayerPage() {
  const { can } = useAuth()
  const navigate = useNavigate()
  const notify = useNotification()
  const canManage = can('context.manage')

  const [connectors, setConnectors] = useState<Connector[] | null>(null)
  const [connections, setConnections] = useState<Connection[] | null>(null)
  const [connecting, setConnecting] = useState<Connector | null>(null)
  const [deleting, setDeleting] = useState<Connection | null>(null)
  const [busyId, setBusyId] = useState<string | null>(null)

  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const [foundConnectors, foundConnections] = await Promise.all([
          listConnectors(),
          listConnections(),
        ])
        if (cancelled) return
        setConnectors(foundConnectors)
        setConnections(foundConnections)
      } catch (err) {
        if (cancelled) return
        setConnectors([])
        setConnections([])
        notify.error('Could not load the context layer.', errorMessage(err, ''))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [reloadToken, notify])

  const onVerify = async (connection: Connection) => {
    setBusyId(connection.id)
    try {
      await verifyConnection(connection.id)
      notify.success(`${connection.name} is still connected.`)
      reload()
    } catch (err) {
      notify.error(`${connection.name} could not be verified.`, errorMessage(err, ''))
      // Reloaded either way: a refused token has just been recorded as invalid
      // on the server, and the row on screen should say so.
      reload()
    } finally {
      setBusyId(null)
    }
  }

  const onDelete = async (connection: Connection) => {
    try {
      await deleteConnection(connection.id)
      notify.success(`"${connection.name}" was removed.`, 'Its stored credential was deleted.')
      reload()
    } catch (err) {
      notify.error('Unable to remove the connection.', errorMessage(err, ''))
    }
  }

  const loading = connectors === null || connections === null
  const connectorRows = connectors ?? []
  const connectionRows = connections ?? []

  return (
    <div className="p-6">
      <PageHeader
        title="Context Layer"
        description="Connect a data warehouse, then choose the datasets a context is built from."
      />

      {loading && (
        <Panel flush>
          <Loading label="Loading connectors…" />
        </Panel>
      )}

      {!loading && (
        <div className="space-y-6">
          <Panel
            title="Connectors"
            description={
              canManage
                ? 'Choose a warehouse to connect.'
                : 'Your role can see connections but not create them.'
            }
          >
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
              {connectorRows.map((connector) => {
                const available = connector.status === 'available'
                return (
                  <button
                    key={connector.id}
                    type="button"
                    disabled={!available || !canManage}
                    onClick={() => setConnecting(connector)}
                    className={`flex h-full flex-col items-start gap-1.5 rounded-xl border p-4 text-left transition-all ${
                      available && canManage
                        ? 'border-slate-200 bg-white hover:border-blue-300 hover:shadow-sm'
                        : 'cursor-not-allowed border-dashed border-slate-200 bg-slate-50/60'
                    }`}
                  >
                    <span className="flex w-full items-center justify-between gap-2">
                      <span className="flex items-center gap-2">
                        <Plug
                          size={15}
                          className={available ? 'text-blue-600' : 'text-slate-300'}
                        />
                        <span
                          className={`text-sm font-semibold ${
                            available ? 'text-slate-900' : 'text-slate-500'
                          }`}
                        >
                          {connector.name}
                        </span>
                      </span>
                      {!available && <Badge tone="neutral">planned</Badge>}
                    </span>
                    <span className="text-[12px] leading-snug text-slate-500">
                      {connector.description}
                    </span>
                  </button>
                )
              })}
            </div>
          </Panel>

          <Panel
            title="Connections"
            description="Each connection belongs to one company and holds its own credential."
            flush
          >
            {connectionRows.length === 0 ? (
              <EmptyState
                message="No warehouse is connected yet."
                hint="Pick a connector above. The credential is checked before it is saved."
              />
            ) : (
              <ul className="divide-y divide-slate-100">
                {connectionRows.map((connection) => (
                  <li key={connection.id} className="flex items-center gap-3 px-5 py-3">
                    <Database size={16} className="shrink-0 text-slate-300" />
                    <span className="min-w-0 flex-1">
                      <Link
                        to={`/context/connections/${encodeURIComponent(connection.id)}`}
                        className="block truncate text-sm font-medium text-slate-800 hover:text-blue-700"
                      >
                        {connection.name}
                      </Link>
                      <span className="block truncate text-[11px] text-slate-400">
                        {connection.provider} · {connection.host} · token {connection.secretHint}
                        {connection.selectedDatasetCount
                          ? ` · ${connection.selectedDatasetCount} dataset${
                              connection.selectedDatasetCount === 1 ? '' : 's'
                            } selected`
                          : ' · no datasets selected'}
                      </span>
                      {connection.status === 'invalid' && connection.lastError && (
                        <span className="mt-0.5 block text-[11px] text-red-600">
                          {connection.lastError}
                        </span>
                      )}
                    </span>

                    <Badge tone={connection.status === 'connected' ? 'success' : 'danger'}>
                      {connection.status}
                    </Badge>

                    <button
                      type="button"
                      className={actionButtonCls}
                      onClick={() => navigate(`/context/connections/${encodeURIComponent(connection.id)}`)}
                    >
                      Datasets
                    </button>

                    {canManage && (
                      <>
                        <button
                          type="button"
                          className={actionButtonCls}
                          disabled={busyId === connection.id}
                          onClick={() => void onVerify(connection)}
                        >
                          <RefreshCw size={13} />
                          {busyId === connection.id ? 'Checking…' : 'Verify'}
                        </button>
                        <button
                          type="button"
                          className={actionDangerCls}
                          onClick={() => setDeleting(connection)}
                        >
                          <Trash2 size={13} />
                        </button>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {connecting && (
        <ConnectDialog
          connector={connecting}
          onClose={() => setConnecting(null)}
          onConnected={(result) => {
            setConnecting(null)
            // Straight to the picker: the datasets were just fetched, and
            // choosing them is why somebody connected in the first place.
            navigate(`/context/connections/${encodeURIComponent(result.connection.id)}`)
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Remove this connection?"
          message={`"${deleting.name}" and its stored token will be deleted.`}
          consequence="The dataset selection goes with it. Nothing in the warehouse is touched, and reconnecting means entering a token again."
          confirmLabel="Remove connection"
          destructive
          onConfirm={() => onDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}
