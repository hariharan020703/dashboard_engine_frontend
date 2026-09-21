import { useEffect, useState } from 'react'
import { fetchColumns } from '@/api/dashboardApi'
import { useAppData } from '@/layouts/appOutlet'
import { dedupeDashboards } from '@/services/dashboards'
import { useNotification } from '@/ui/notificationContext'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { labelCls, selectCls, tableCls, tdCls, thCls } from '@/ui/styles'
import type { ColumnCatalogue } from '@/types/dashboard'
import { errorMessage } from '@/api/client'

/**
 * What the dashboards are built on: the source table a dashboard's spec names,
 * and every column in it with the role the engine gives it.
 *
 * This is the same catalogue the card editor picks fields from — the existing
 * `/api/dashboard/columns` endpoint — shown on its own so the shape of the data
 * can be read without opening a card. The database remains the source of truth; the
 * dashboard JSON only says which table to look at.
 */
export default function DataPage() {
  const { dashboards } = useAppData()
  const notify = useNotification()
  const listed = dedupeDashboards(dashboards)

  const [picked, setPicked] = useState('')
  const [catalogue, setCatalogue] = useState<ColumnCatalogue | null>(null)
  const [loading, setLoading] = useState(false)

  // Derived rather than stored: until someone picks one, the catalogue is read
  // from the first dashboard they may open. Storing that default would need an
  // effect to write it, and an effect that only mirrors a prop is a bug waiting
  // for the prop to change.
  const dashboardId = picked || listed[0]?.id || ''

  useEffect(() => {
    if (!dashboardId) return
    let active = true

    const run = async () => {
      setLoading(true)
      try {
        const c = await fetchColumns(dashboardId)
        if (active) setCatalogue(c)
      } catch (err) {
        if (!active) return
        setCatalogue(null)
        notify.error('Could not read the column catalogue.', errorMessage(err, ''))
      } finally {
        if (active) setLoading(false)
      }
    }
    void run()

    return () => {
      active = false
    }
  }, [dashboardId, notify])

  return (
    <div className="p-6">
      <PageHeader
        title="Data"
        description="The table behind a dashboard, as the query engine resolves it."
        actions={
          listed.length > 1 ? (
            <div className="w-56">
              <label className={labelCls} htmlFor="data-dashboard">
                Dashboard
              </label>
              <select
                id="data-dashboard"
                className={selectCls}
                value={dashboardId}
                onChange={(e) => setPicked(e.target.value)}
              >
                {listed.map((d) => (
                  <option key={d.id} value={d.id}>
                    {d.title || d.id}
                  </option>
                ))}
              </select>
            </div>
          ) : null
        }
      />

      {!listed.length && (
        <Panel flush>
          <EmptyState
            message="You have not been granted a dashboard yet."
            hint="The column catalogue is read from a dashboard's source table."
          />
        </Panel>
      )}

      {loading && (
        <Panel flush>
          <Loading label="Reading the table metadata…" />
        </Panel>
      )}

      {!loading && catalogue && (
        <div className="space-y-6">
          <Panel title="Source">
            <dl className="grid gap-4 sm:grid-cols-4">
              <div>
                <dt className={labelCls}>Database</dt>
                <dd className="text-sm text-slate-800">{catalogue.database}</dd>
              </div>
              <div>
                <dt className={labelCls}>Table</dt>
                <dd className="text-sm text-slate-800">
                  {catalogue.schema}.{catalogue.table}
                </dd>
              </div>
              <div>
                <dt className={labelCls}>Rows</dt>
                <dd className="text-sm text-slate-800">{catalogue.rowCountText}</dd>
              </div>
              <div>
                <dt className={labelCls}>Columns</dt>
                <dd className="text-sm text-slate-800">{catalogue.columns.length}</dd>
              </div>
            </dl>
          </Panel>

          <Panel
            title="Columns"
            description="Numeric columns are aggregated as measures; everything else groups."
            flush
          >
            <div className="overflow-x-auto">
              <table className={tableCls}>
                <thead>
                  <tr>
                    <th className={thCls}>Column</th>
                    <th className={thCls}>Type</th>
                    <th className={thCls}>Role</th>
                    <th className={thCls}>Nullable</th>
                  </tr>
                </thead>
                <tbody>
                  {catalogue.columns.map((c) => (
                    <tr key={c.name}>
                      <td className={`${tdCls} font-medium text-slate-800`}>{c.name}</td>
                      <td className={`${tdCls} text-slate-500`}>{c.columnType}</td>
                      <td className={tdCls}>
                        <Badge tone={c.role === 'measure' ? 'info' : 'neutral'}>{c.role}</Badge>
                      </td>
                      <td className={`${tdCls} text-slate-500`}>{c.nullable ? 'yes' : 'no'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Panel>
        </div>
      )}
    </div>
  )
}
