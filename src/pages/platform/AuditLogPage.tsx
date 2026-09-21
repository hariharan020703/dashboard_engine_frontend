import { useEffect, useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { fetchAuditLogs } from '@/api/adminApi'
import DataTable, { type ColumnDef } from '@/ui/DataTable'
import Modal from '@/ui/Modal'
import { Badge, PageHeader } from '@/ui/page'
import { actionButtonCls } from '@/ui/styles'
import type { AuditLogEntry } from '@/types/admin'

export default function AuditLogPage() {
  const [logs, setLogs] = useState<AuditLogEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedEntry, setSelectedEntry] = useState<AuditLogEntry | null>(null)

  const [reloadToken, setReloadToken] = useState(0)
  const reload = () => {
    setLoading(true)
    setReloadToken((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await fetchAuditLogs(200)
        if (cancelled) return
        setLogs(data)
      } catch {
        if (cancelled) return
        setLogs([])
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  const getTone = (event: string) => {
    if (event.includes('fail') || event.includes('denied') || event.includes('block')) {
      return 'danger'
    }
    if (event.includes('created') || event.includes('granted') || event.includes('activated')) {
      return 'success'
    }
    if (event.includes('deleted') || event.includes('revoked')) {
      return 'warning'
    }
    return 'neutral'
  }

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'ts',
      header: 'Timestamp',
      sortable: true,
      width: '180px',
      render: (item) => (
        <span className="font-mono text-[11px] text-slate-500">
          {new Date(item.ts).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      sortable: true,
      render: (item) => (
        <Badge tone={getTone(item.event)}>
          {item.event.replace(/_/g, ' ')}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Actor',
      sortable: true,
      render: (item) => (
        <span className="font-medium text-slate-900">
          {item.actor || 'anonymous'}
          {item.actorCompanyId && (
            <span className="ml-1 text-[11px] text-slate-400">
              (Co. #{item.actorCompanyId})
            </span>
          )}
        </span>
      ),
    },
    {
      key: 'summary',
      header: 'Context / Target',
      render: (item) => {
        const target =
          item.targetUsername ||
          item.targetEmail ||
          item.name ||
          (item.companyId ? `Company #${item.companyId}` : null) ||
          item.dashboardId ||
          '—'
        return <span className="truncate text-slate-600">{String(target)}</span>
      },
    },
    {
      key: 'actions',
      header: '',
      align: 'right',
      render: (item) => (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            setSelectedEntry(item)
          }}
          className="inline-flex items-center gap-1 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          title="Inspect Raw Event"
        >
          <Eye size={14} />
        </button>
      ),
    },
  ]

  return (
    <div className="p-6">
      <PageHeader
        title="Audit Log"
        description="Immutable operational trail of security authentications, tenant changes, and RBAC mutations."
        actions={
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className={actionButtonCls}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Refresh
          </button>
        }
      />

      <DataTable
        data={logs}
        columns={columns}
        keyOf={(item) => `${item.ts}-${item.event}`}
        loading={loading}
        searchPlaceholder="Search audit events, actors, targets…"
        searchFilter={(item, q) =>
          item.event.toLowerCase().includes(q) ||
          String(item.actor || '').toLowerCase().includes(q) ||
          JSON.stringify(item).toLowerCase().includes(q)
        }
        emptyMessage="No audit records found"
        emptyHint="Events are written automatically as administrative and authentication actions occur."
      />

      {/* Raw Event Detail Modal */}
      {selectedEntry && (
        <Modal
          title={`Audit Event: ${selectedEntry.event}`}
          onClose={() => setSelectedEntry(null)}
          width="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            <div className="rounded-lg border border-slate-200 bg-slate-900 p-4 font-mono text-emerald-400">
              <pre className="overflow-x-auto whitespace-pre-wrap">
                {JSON.stringify(selectedEntry, null, 2)}
              </pre>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setSelectedEntry(null)}
                className="rounded-md border border-slate-300 px-3 py-1.5 font-medium text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  )
}
