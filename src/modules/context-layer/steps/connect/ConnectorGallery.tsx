import { useMemo, useState } from 'react'
import { Lock, Search } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import type { Connector } from '../../types'
import { connectorGroups, connectorPresentation, isConnectable } from '../../connectors/registry'

/**
 * The connector gallery.
 *
 * The list comes from the backend. Which of them can be configured comes from
 * each one's `status`, tested through `isConnectable` — no component in this
 * module compares a provider id to a string.
 *
 * Planned connectors are shown rather than hidden, because the question this
 * screen answers is "can I bring my data in", and a page listing one option
 * answers it wrongly. They are visibly inert: not focusable, no click handler,
 * no form, and the backend refuses them too — so nothing here can be mistaken
 * for a working integration, and there is no fake connection flow to stumble
 * into.
 */
export function ConnectorGallery({
  connectors,
  selectedId,
  onSelect,
}: {
  connectors: Connector[]
  selectedId: string | null
  onSelect: (connector: Connector) => void
}) {
  const [search, setSearch] = useState('')

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return connectors
    return connectors.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.description ?? '').toLowerCase().includes(q)
    )
  }, [connectors, search])

  const { available, planned } = connectorGroups(filtered)

  return (
    <div className="space-y-6">
      <div className="relative max-w-sm">
        <Search
          className="pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search connectors…"
          className="pl-8"
          aria-label="Search connectors"
        />
      </div>

      {available.length > 0 ? (
        <section>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Available
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((connector) => (
              <ConnectorTile
                key={connector.id}
                connector={connector}
                selected={connector.id === selectedId}
                onSelect={() => onSelect(connector)}
              />
            ))}
          </div>
        </section>
      ) : null}

      {planned.length > 0 ? (
        <section>
          <h3 className="mb-2.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Planned
          </h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {planned.map((connector) => (
              <ConnectorTile key={connector.id} connector={connector} />
            ))}
          </div>
        </section>
      ) : null}

      {filtered.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">
          No connector matches “{search}”.
        </p>
      ) : null}
    </div>
  )
}

function ConnectorTile({
  connector,
  selected,
  onSelect,
}: {
  connector: Connector
  selected?: boolean
  onSelect?: () => void
}) {
  const presentation = connectorPresentation(connector.id)
  const Icon = presentation.icon
  const connectable = isConnectable(connector)

  /*
   * A planned connector renders as a div with no handler and no tabindex,
   * rather than a disabled button. There is nothing to activate, so there is
   * nothing for a keyboard or a screen reader to land on and be refused by.
   */
  const Wrapper = connectable ? 'button' : 'div'

  return (
    <Wrapper
      {...(connectable
        ? { type: 'button' as const, onClick: onSelect, 'aria-pressed': selected }
        : { 'aria-disabled': true })}
      className={cn(
        'relative flex w-full flex-col items-start gap-2.5 rounded-lg border p-4 text-left transition-all',
        connectable
          ? 'cursor-pointer bg-card hover:border-primary/50 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring'
          : 'cursor-default border-dashed bg-muted/30',
        selected && 'border-primary ring-1 ring-primary'
      )}
    >
      <div className="flex w-full items-start justify-between gap-2">
        <span
          className={cn(
            'flex size-9 items-center justify-center rounded-md',
            connectable ? presentation.accentClass : 'bg-muted text-muted-foreground/60'
          )}
        >
          <Icon className="size-4.5" aria-hidden />
        </span>
        {connectable ? null : (
          <Badge variant="outline" className="gap-1 text-muted-foreground">
            <Lock className="size-3" aria-hidden />
            Planned
          </Badge>
        )}
      </div>

      <div className="min-w-0">
        <p
          className={cn(
            'text-sm font-medium',
            !connectable && 'text-muted-foreground'
          )}
        >
          {connector.name}
        </p>
        <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
          {connector.description || presentation.tagline}
        </p>
      </div>
    </Wrapper>
  )
}
