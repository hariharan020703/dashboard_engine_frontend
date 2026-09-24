import { useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { fetchAuditLogs } from '@/api/platformApi'
import { useServerList } from '@/hooks/useServerList'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { DataTable, type ColumnDef } from '@/components/common/DataTable'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { cn } from '@/lib/utils'
import type { AuditLogEntry } from '@/types/admin'

/**
 * Colours for the server's event categories. Which category an event falls in
 * is decided by the server (routes/auditRoutes.js); this only paints it.
 */
const TONE_CLASS: Record<AuditLogEntry['tone'], string> = {
  danger: 'border-destructive/25 bg-destructive/10 text-destructive',
  warning: 'border-warning/30 bg-warning/15 text-warning-foreground',
  success: 'border-success/25 bg-success/10 text-success',
  neutral: 'border-border bg-muted text-muted-foreground',
}

/** Every field of an entry, envelope first, for the inspect dialog. */
function inspectRows(entry: AuditLogEntry): Array<[string, unknown]> {
  return [
    ['ts', entry.ts],
    ['event', entry.event],
    ['actor', entry.actor],
    ['actorId', entry.actorId],
    ['actorCompanyId', entry.actorCompanyId],
    ...Object.entries(entry.detail),
  ]
}

/**
 * The audit trail.
 *
 * Append-only on the server and read-only here. Platform-only, both because the
 * endpoint is inside /api/platform and because it records actions across every
 * customer - it is the one view that is deliberately not tenant-scoped.
 *
 * Search, sort and paging run on the server over the WHOLE trail. The screen
 * used to load the newest 200 entries and search those, so anything older was
 * unreachable.
 */
export default function AuditLogPage() {
  const logs = useServerList(fetchAuditLogs, { page: 1, pageSize: 25, sort: 'ts', dir: 'desc' })
  const [inspecting, setInspecting] = useState<AuditLogEntry | null>(null)

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'ts',
      header: 'When',
      width: 'w-44',
      serverSort: 'ts',
      render: (entry) => (
        <span className="text-sm tabular-nums text-muted-foreground">
          {new Date(entry.ts).toLocaleString()}
        </span>
      ),
    },
    {
      key: 'event',
      header: 'Event',
      width: 'w-56',
      serverSort: 'event',
      render: (entry) => (
        <Badge variant="outline" className={cn('font-medium', TONE_CLASS[entry.tone])}>
          {entry.label}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Who',
      width: 'w-40',
      serverSort: 'actor',
      render: (entry) => (
        <span className="truncate text-sm text-foreground">{entry.actor ?? 'system'}</span>
      ),
    },
    {
      key: 'detail',
      header: 'Detail',
      secondary: true,
      render: (entry) => (
        <span className="block max-w-xl truncate text-sm text-muted-foreground">
          {entry.summary || '—'}
        </span>
      ),
    },
    {
      key: 'inspect',
      header: <span className="sr-only">Inspect</span>,
      align: 'right',
      width: 'w-14',
      render: (entry) => (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={`Inspect the ${entry.event} entry`}
          onClick={(event) => {
            event.stopPropagation()
            setInspecting(entry)
          }}
        >
          <Eye aria-hidden />
        </Button>
      ),
    },
  ]

  return (
    <Page>
      <PageHeader
        title="Audit log"
        description="Every administrative and authentication action, across every customer."
        actions={
          <Button variant="outline" onClick={logs.reload} disabled={logs.loading || logs.refreshing}>
            <RefreshCw className={logs.loading || logs.refreshing ? 'animate-spin' : undefined} aria-hidden />
            Refresh
          </Button>
        }
      />

      <Section flush>
        <DataTable
          data={logs.error ? null : (logs.data?.items ?? null)}
          columns={columns}
          keyOf={(entry) => `${entry.ts}-${entry.event}-${entry.actorId ?? 'x'}`}
          loading={logs.loading}
          error={logs.error}
          onRetry={logs.reload}
          onRowClick={setInspecting}
          searchPlaceholder="Search events, people, details…"
          server={{
            total: logs.data?.total ?? 0,
            query: logs.query,
            onQueryChange: logs.setQuery,
            narrowed: logs.narrowed,
          }}
          empty={{
            title: 'Nothing recorded yet',
            body: 'Entries are written automatically as administrative and sign-in actions happen.',
          }}
        />
      </Section>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{inspecting?.label}</DialogTitle>
            <DialogDescription>
              {inspecting ? new Date(inspecting.ts).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {inspecting && (
            <dl className="divide-y divide-border text-sm">
              {inspectRows(inspecting).map(([key, value]) => (
                <div key={key} className="flex flex-wrap items-baseline justify-between gap-3 py-2">
                  <dt className="shrink-0 text-xs text-muted-foreground">{key}</dt>
                  <dd className="min-w-0 break-all text-right font-medium text-foreground">
                    {value === null || value === undefined ? '—' : String(value)}
                  </dd>
                </div>
              ))}
            </dl>
          )}
        </DialogContent>
      </Dialog>
    </Page>
  )
}
