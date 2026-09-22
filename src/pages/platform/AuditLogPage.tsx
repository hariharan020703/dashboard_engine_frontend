import { useState } from 'react'
import { Eye, RefreshCw } from 'lucide-react'
import { fetchAuditLogs } from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
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
 * Tone for an event, from what the event did rather than from a list of names.
 *
 * Matching on the verb means a new event type - and they are added whenever a
 * capability is - is coloured sensibly without this file being edited. The
 * badge always carries the event's own words too, so a miscategorised tone
 * misleads nobody.
 */
function toneFor(event: string): string {
  const name = event.toLowerCase()
  if (name.includes('denied') || name.includes('fail') || name.includes('block')) {
    return 'border-destructive/25 bg-destructive/10 text-destructive'
  }
  if (name.includes('deleted') || name.includes('revoked') || name.includes('deactivated')) {
    return 'border-warning/30 bg-warning/15 text-warning-foreground'
  }
  if (name.includes('created') || name.includes('granted') || name.includes('activated')) {
    return 'border-success/25 bg-success/10 text-success'
  }
  return 'border-border bg-muted text-muted-foreground'
}

/** The fields every entry has, so the rest can be shown as "what changed". */
const ENVELOPE_KEYS = new Set(['ts', 'event', 'actor', 'actorId', 'actorCompanyId'])

function summarise(entry: AuditLogEntry): string {
  const parts = Object.entries(entry)
    .filter(([key, value]) => !ENVELOPE_KEYS.has(key) && value !== null && value !== undefined)
    .map(([key, value]) => `${key}: ${String(value)}`)
  return parts.join(' · ')
}

/**
 * The audit trail.
 *
 * Append-only on the server and read-only here. Platform-only, both because the
 * endpoint is inside /api/platform and because it records actions across every
 * customer - it is the one view that is deliberately not tenant-scoped.
 */
export default function AuditLogPage() {
  const logs = useAsync(() => fetchAuditLogs(200), [])
  const [inspecting, setInspecting] = useState<AuditLogEntry | null>(null)

  const columns: ColumnDef<AuditLogEntry>[] = [
    {
      key: 'ts',
      header: 'When',
      width: 'w-44',
      sortValue: (entry) => entry.ts,
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
      sortValue: (entry) => entry.event,
      render: (entry) => (
        <Badge variant="outline" className={cn('font-medium', toneFor(entry.event))}>
          {entry.event.replace(/_/g, ' ').toLowerCase()}
        </Badge>
      ),
    },
    {
      key: 'actor',
      header: 'Who',
      width: 'w-40',
      sortValue: (entry) => entry.actor ?? '',
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
          {summarise(entry) || '—'}
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
          <Button variant="outline" onClick={logs.reload} disabled={logs.loading}>
            <RefreshCw className={logs.loading ? 'animate-spin' : undefined} aria-hidden />
            Refresh
          </Button>
        }
      />

      <Section flush>
        <DataTable
          data={logs.data}
          columns={columns}
          keyOf={(entry) => `${entry.ts}-${entry.event}-${entry.actorId ?? 'x'}`}
          loading={logs.loading}
          error={logs.error}
          onRetry={logs.reload}
          onRowClick={setInspecting}
          searchPlaceholder="Search events, people, details…"
          searchFilter={(entry, query) =>
            entry.event.toLowerCase().includes(query) ||
            String(entry.actor ?? '').toLowerCase().includes(query) ||
            summarise(entry).toLowerCase().includes(query)
          }
          empty={{
            title: 'Nothing recorded yet',
            body: 'Entries are written automatically as administrative and sign-in actions happen.',
          }}
          pageSize={25}
        />
      </Section>

      <Dialog open={inspecting !== null} onOpenChange={(open) => !open && setInspecting(null)}>
        <DialogContent className="sm:max-w-xl">
          <DialogHeader>
            <DialogTitle>{inspecting?.event.replace(/_/g, ' ').toLowerCase()}</DialogTitle>
            <DialogDescription>
              {inspecting ? new Date(inspecting.ts).toLocaleString() : ''}
            </DialogDescription>
          </DialogHeader>

          {inspecting && (
            <dl className="divide-y divide-border text-sm">
              {Object.entries(inspecting).map(([key, value]) => (
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
