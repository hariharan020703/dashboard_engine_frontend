import { useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Loader2, Search } from 'lucide-react'
import { errorMessage } from '@/api/http'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { useAsync } from '@/hooks/useAsync'
import { Page, PageHeader, Section } from '@/components/common/Page'
import {
  CardGridSkeleton,
  EmptyState,
  ErrorState,
  InlineLoading,
  NoResultsState,
} from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { fetchDatasets, getConnection, saveSelection } from './api'
import type { WarehouseDataset } from './types'

/**
 * Choosing which datasets a context is built from.
 *
 * The list is fetched live from the warehouse every time this page opens, never
 * cached. A stale list means ticking a dataset id that no longer resolves, and
 * that failure would surface much later, somewhere else, for a reason invisible
 * from here.
 *
 * The connection and the dataset list are loaded separately and fail
 * separately, which is the important part: a revoked token still renders the
 * page with its saved selection and an explanation, rather than an empty screen.
 */
export default function ConnectionDatasetsPage() {
  const { id = '' } = useParams()
  const { can } = useAuth()
  const paths = usePaths()
  const canManage = can('context.manage')

  const connection = useAsync(() => getConnection(id), [id])
  const warehouse = useAsync(() => fetchDatasets(id), [id])

  /**
   * The ticked datasets.
   *
   * Null means "whatever is saved", so the selection is DERIVED from the loaded
   * connection until somebody actually ticks something - rather than being
   * copied into state by an effect, which would re-render twice on every load
   * and go stale whenever the connection reloaded. Saving sets it back to null,
   * so the screen returns to showing the server's answer.
   */
  const [edited, setEdited] = useState<Set<string> | null>(null)
  const [query, setQuery] = useState('')
  const [saving, setSaving] = useState(false)

  const saved = useMemo(
    () => new Set((connection.data?.selectedDatasets ?? []).map((dataset) => dataset.id)),
    [connection.data]
  )
  const chosen = edited ?? saved

  const setChosen = (update: (current: Set<string>) => Set<string>) =>
    setEdited((current) => update(current ?? saved))

  const datasets: WarehouseDataset[] | null = warehouse.data?.datasets ?? null

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const rows = datasets ?? []
    if (!needle) return rows
    return rows.filter(
      (dataset) =>
        dataset.name.toLowerCase().includes(needle) || dataset.id.toLowerCase().includes(needle)
    )
  }, [datasets, query])

  const dirty = saved.size !== chosen.size || [...chosen].some((datasetId) => !saved.has(datasetId))

  const save = async () => {
    if (!datasets) return
    setSaving(true)
    /*
     * Sent with the name and counts alongside the id, so the selection still
     * renders when the warehouse is unreachable. The id is the record; the rest
     * is a copy taken now.
     */
    const payload = datasets
      .filter((dataset) => chosen.has(dataset.id))
      .map((dataset) => ({
        id: dataset.id,
        name: dataset.name,
        rowCount: dataset.rowCount,
        columnCount: dataset.columnCount,
      }))

    try {
      await saveSelection(id, payload)
      // Back to deriving from the server's answer, which the reload refreshes.
      setEdited(null)
      connection.reload()
      notify.success(
        payload.length === 0
          ? 'Selection cleared.'
          : `${payload.length} dataset${payload.length === 1 ? '' : 's'} selected.`,
        'Saved and ready for a context to be built from them.'
      )
    } catch (err) {
      notify.failure('save the selection', err)
    } finally {
      setSaving(false)
    }
  }

  if (connection.error) {
    return (
      <Page>
        <PageHeader
          title="Connection"
          crumbs={[{ label: 'Context layer', to: paths.context }, { label: 'Not available' }]}
        />
        <Section>
          <ErrorState
            error={connection.error}
            title="Unable to load this connection"
            onRetry={connection.reload}
          />
        </Section>
      </Page>
    )
  }

  if (connection.loading || !connection.data) {
    return (
      <Page>
        <PageHeader title="Loading connection…" />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const record = connection.data

  return (
    <Page>
      <PageHeader
        crumbs={[{ label: 'Context layer', to: paths.context }, { label: record.name }]}
        title={record.name}
        description={`${record.provider} · ${record.host} · token ${record.secretHint}`}
        actions={
          canManage && (
            <Button disabled={saving || !dirty || datasets === null} onClick={() => void save()}>
              {saving && <Loader2 className="animate-spin" aria-hidden />}
              {dirty ? `Save ${chosen.size} selected` : 'Saved'}
            </Button>
          )
        }
      />

      {/*
        A warning rather than an error page: the connection loaded, the saved
        selection is real and worth showing, and only the live list is missing.
      */}
      {Boolean(warehouse.error) && (
        <div
          role="alert"
          className="mb-6 rounded-lg border border-warning/30 bg-warning/10 px-4 py-3 text-sm text-warning-foreground"
        >
          <p className="font-medium">The dataset list could not be loaded.</p>
          <p className="mt-0.5">
            {errorMessage(warehouse.error, 'The warehouse could not be reached.')}
          </p>
          <p className="mt-1 opacity-80">
            What is saved is shown below. It cannot be changed until the warehouse answers again.
          </p>
          <Button variant="outline" size="sm" className="mt-2" onClick={warehouse.reload}>
            Try again
          </Button>
        </div>
      )}

      <div className="space-y-6">
        {record.selectedDatasets && record.selectedDatasets.length > 0 && (
          <Section
            title="Saved selection"
            description="What a context will be built from."
            flush
          >
            <ul className="divide-y divide-border">
              {record.selectedDatasets.map((dataset) => (
                <li key={dataset.id} className="flex items-center gap-3 px-5 py-2.5">
                  <span className="min-w-0 flex-1 truncate text-sm text-foreground">
                    {dataset.name || dataset.id}
                  </span>
                  <code className="shrink-0 text-xs text-muted-foreground">{dataset.id}</code>
                </li>
              ))}
            </ul>
          </Section>
        )}

        <Section
          title="Datasets in this warehouse"
          description={
            datasets === null
              ? undefined
              : `${datasets.length} visible to this token. Tick the ones to build a context from.`
          }
          flush
        >
          {warehouse.loading ? (
            <InlineLoading label="Reading the warehouse…" />
          ) : datasets === null ? null : datasets.length === 0 ? (
            <EmptyState
              title="This token can see no datasets"
              body="The credential is valid, but the account behind it has not been given access to any dataset."
              compact
            />
          ) : (
            <>
              <div className="border-b border-border px-5 py-3">
                <div className="relative max-w-xs">
                  <Search
                    className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
                    aria-hidden
                  />
                  <Input
                    className="pl-8"
                    placeholder="Filter by name or id…"
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Filter datasets"
                  />
                </div>
              </div>

              {visible.length === 0 ? (
                <NoResultsState query={query} onClear={() => setQuery('')} />
              ) : (
                <ul className="divide-y divide-border">
                  {visible.map((dataset) => {
                    const ticked = chosen.has(dataset.id)
                    return (
                      <li key={dataset.id}>
                        <label
                          className={cn(
                            'flex items-center gap-3 px-5 py-2.5 transition-colors',
                            ticked ? 'bg-accent/40' : 'hover:bg-muted/50',
                            canManage ? 'cursor-pointer' : 'cursor-not-allowed opacity-70'
                          )}
                        >
                          <Checkbox
                            checked={ticked}
                            disabled={!canManage}
                            onCheckedChange={() =>
                              setChosen((current) => {
                                const next = new Set(current)
                                if (next.has(dataset.id)) next.delete(dataset.id)
                                else next.add(dataset.id)
                                return next
                              })
                            }
                          />
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-sm text-foreground">
                              {dataset.name}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {dataset.id}
                              {dataset.owner ? ` · ${dataset.owner}` : ''}
                            </span>
                          </span>
                          {dataset.rowCount !== null && (
                            <Badge variant="outline" className="shrink-0 tabular-nums">
                              {dataset.rowCount.toLocaleString()} rows
                            </Badge>
                          )}
                        </label>
                      </li>
                    )
                  })}
                </ul>
              )}
            </>
          )}
        </Section>
      </div>
    </Page>
  )
}
