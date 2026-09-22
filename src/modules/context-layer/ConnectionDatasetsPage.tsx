import { useCallback, useEffect, useMemo, useState } from 'react'
import { Link, useParams } from 'react-router-dom'
import { ArrowLeft, Search } from 'lucide-react'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import { useNotification } from '@/ui/notificationContext'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { inputCls, primaryButtonCls, actionButtonCls } from '@/ui/styles'
import { fetchDatasets, getConnection, saveSelection } from './api'
import type { Connection, WarehouseDataset } from './types'

/**
 * Choosing which datasets a context is built from.
 *
 * The list is fetched live from the warehouse every time this page opens,
 * never cached. A stale list means ticking a dataset id that no longer
 * resolves, and that failure would surface much later, somewhere else, for a
 * reason invisible from here.
 *
 * The connection is loaded separately from the datasets, so a revoked token
 * still renders the page with its saved selection and an explanation, rather
 * than an empty screen.
 */
export default function ConnectionDatasetsPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const notify = useNotification()
  const canManage = can('context.manage')

  const [connection, setConnection] = useState<Connection | null>(null)
  const [datasets, setDatasets] = useState<WarehouseDataset[] | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const found = await getConnection(id)
        if (cancelled) return
        setConnection(found)
        setChosen(new Set((found.selectedDatasets ?? []).map((d) => d.id)))
      } catch (err) {
        if (cancelled) return
        notify.error('Could not load the connection.', errorMessage(err, ''))
        return
      }

      try {
        const result = await fetchDatasets(id)
        if (cancelled) return
        setDatasets(result.datasets)
        setFetchError(null)
      } catch (err) {
        if (cancelled) return
        setDatasets([])
        setFetchError(errorMessage(err, 'The warehouse could not be reached.'))
      }
    })()

    return () => {
      cancelled = true
    }
  }, [id, reloadToken, notify])

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = datasets ?? []
    if (!needle) return rows
    return rows.filter(
      (d) => d.name.toLowerCase().includes(needle) || d.id.toLowerCase().includes(needle)
    )
  }, [datasets, query])

  const toggle = (datasetId: string) => {
    setChosen((current) => {
      const next = new Set(current)
      if (next.has(datasetId)) next.delete(datasetId)
      else next.add(datasetId)
      return next
    })
  }

  const onSave = async () => {
    if (!datasets) return
    setSaving(true)
    /*
     * Sent with the name and counts alongside the id, so the selection still
     * renders when the warehouse is unreachable. The id is the record; the
     * rest is a copy taken now.
     */
    const payload = datasets
      .filter((d) => chosen.has(d.id))
      .map((d) => ({ id: d.id, name: d.name, rowCount: d.rowCount, columnCount: d.columnCount }))

    try {
      const updated = await saveSelection(id, payload)
      setConnection(updated)
      notify.success(
        payload.length === 0
          ? 'Selection cleared.'
          : `${payload.length} dataset${payload.length === 1 ? '' : 's'} selected.`,
        'Their ids are saved and ready for a context to be built from them.'
      )
    } catch (err) {
      notify.error('Unable to save the selection.', errorMessage(err, ''))
    } finally {
      setSaving(false)
    }
  }

  const saved = new Set((connection?.selectedDatasets ?? []).map((d) => d.id))
  const dirty =
    saved.size !== chosen.size || [...chosen].some((datasetId) => !saved.has(datasetId))

  if (!connection) {
    return (
      <div className="p-6">
        <Panel flush>
          <Loading label="Loading connection…" />
        </Panel>
      </div>
    )
  }

  return (
    <div className="p-6">
      <Link
        to="/context"
        className="mb-3 inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-slate-800"
      >
        <ArrowLeft size={13} />
        Context Layer
      </Link>

      <PageHeader
        title={connection.name}
        description={`${connection.provider} · ${connection.host} · token ${connection.secretHint}`}
        actions={
          canManage ? (
            <button
              type="button"
              className={primaryButtonCls}
              disabled={saving || !dirty || datasets === null}
              onClick={() => void onSave()}
            >
              {saving ? 'Processing…' : dirty ? `Save ${chosen.size} selected` : 'Proceed Selected'}
            </button>
          ) : null
        }
      />

      {fetchError && (
        <div
          role="alert"
          className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-[13px] leading-snug text-amber-800"
        >
          <p className="font-semibold">The dataset list could not be loaded.</p>
          <p className="mt-0.5">{fetchError}</p>
          <p className="mt-1 text-amber-700/80">
            The selection below is what was saved earlier. It cannot be changed until the
            warehouse answers again.
          </p>
          <button type="button" className={`${actionButtonCls} mt-2`} onClick={reload}>
            Try again
          </button>
        </div>
      )}

      {connection.selectedDatasets && connection.selectedDatasets.length > 0 && (
        <Panel
          title="Saved selection"
          description="These dataset ids are what a context will be built from."
          flush
        >
          <ul className="divide-y divide-slate-100">
            {connection.selectedDatasets.map((d) => (
              <li key={d.id} className="flex items-center gap-3 px-5 py-2">
                <span className="min-w-0 flex-1 truncate text-sm text-slate-700">
                  {d.name || d.id}
                </span>
                <code className="shrink-0 text-[11px] text-slate-400">{d.id}</code>
              </li>
            ))}
          </ul>
        </Panel>
      )}

      <div className="mt-6">
        <Panel
          title="Datasets in this warehouse"
          description={
            datasets === null
              ? 'Reading the warehouse…'
              : `${datasets.length} visible to this token. Tick the ones to build a context from.`
          }
          flush
        >
          {datasets === null && <Loading label="Reading the warehouse…" />}

          {datasets !== null && datasets.length > 0 && (
            <div className="border-b border-slate-100 px-5 py-2.5">
              <div className="relative">
                <Search
                  size={14}
                  className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <input
                  className={`${inputCls} pl-8`}
                  placeholder="Filter by name or id…"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  aria-label="Filter datasets"
                />
              </div>
            </div>
          )}

          {datasets !== null && datasets.length === 0 && !fetchError && (
            <EmptyState
              message="This token can see no datasets."
              hint="The credential is valid, but the Domo account behind it has not been given access to any dataset."
            />
          )}

          {datasets !== null && visible.length === 0 && datasets.length > 0 && (
            <EmptyState message={`Nothing matches "${query}".`} />
          )}

          {visible.length > 0 && (
            <ul className="divide-y divide-slate-100">
              {visible.map((dataset) => {
                const ticked = chosen.has(dataset.id)
                return (
                  <li key={dataset.id}>
                    <label
                      className={`flex cursor-pointer items-center gap-3 px-5 py-2.5 transition-colors ${
                        ticked ? 'bg-blue-50/40' : 'hover:bg-slate-50'
                      } ${canManage ? '' : 'cursor-not-allowed opacity-70'}`}
                    >
                      <input
                        type="checkbox"
                        className="h-3.5 w-3.5 shrink-0 accent-blue-600"
                        checked={ticked}
                        disabled={!canManage}
                        onChange={() => toggle(dataset.id)}
                      />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm text-slate-800">{dataset.name}</span>
                        <span className="block truncate text-[11px] text-slate-400">
                          {dataset.id}
                          {dataset.owner ? ` · ${dataset.owner}` : ''}
                        </span>
                      </span>
                      {dataset.rowCount !== null && (
                        <Badge tone="neutral">{dataset.rowCount.toLocaleString()} rows</Badge>
                      )}
                    </label>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
