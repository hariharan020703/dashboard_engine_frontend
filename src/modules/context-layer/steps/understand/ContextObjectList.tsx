import { useDeferredValue, useState } from 'react'
import { Search, ShieldCheck, ShieldQuestion } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { EmptyState } from '../../components/DataStates'
import { Pagination } from '../../components/Pagination'
import { serverPage } from '../../components/usePagination'
import { DEFAULT_FACTS_QUERY, useContextObjects } from '../../queries/hooks'
import type { ContextObject } from '../../api/contextObjectsApi'

/**
 * The facts a run wrote, as they are stored.
 *
 * Every one of these rows came from `context_objects`; nothing here is parsed
 * out of the agent's prose or inferred from it. The distinction matters because
 * the prose is the agent's account of what it did and this is what it actually
 * did — and those can disagree.
 *
 * `payload` is JSONB whose shape varies by `object_type`, and this renders it
 * generically rather than switching on the type. That is deliberate: the set of
 * types and their payload keys belong to the extraction skill, which will grow,
 * and a renderer per type would silently hide anything new. The one key given
 * special treatment is `description`, because every type carries it and it is
 * the human-readable line; everything else is shown as it is stored.
 *
 * The type chips, the search and the paging are the SERVER's: this asks for one
 * page and renders it. A run is mostly column statistics, and the list used to
 * receive every fact with its whole payload to filter and group in the browser.
 */

/** The one payload key promoted to body text. Present on every type so far. */
const DESCRIPTION_KEY = 'description'

export function ContextObjectList({ connectionId }: { connectionId: string }) {
  const [type, setType] = useState<string>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const query = useDeferredValue(search).trim()

  const facts = useContextObjects(connectionId, {
    ...DEFAULT_FACTS_QUERY,
    ...(type !== 'all' ? { type } : {}),
    ...(query ? { search: query } : {}),
    page,
  })
  const data = facts.data

  if (!data) return null

  if (data.count === 0) {
    return (
      <EmptyState
        title="This run wrote no facts"
        detail="The agent completed but recorded nothing in the context layer. Its report above should say why."
      />
    )
  }

  const chooseType = (next: string) => {
    setType(next)
    setPage(1)
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {/* Chips from the types actually present — never a hardcoded list. */}
        <TypeChip
          label="All"
          count={data.count}
          active={type === 'all'}
          onClick={() => chooseType('all')}
        />
        {Object.entries(data.counts).map(([key, count]) => (
          <TypeChip
            key={key}
            label={key}
            count={count}
            active={type === key}
            onClick={() => chooseType(type === key ? 'all' : key)}
          />
        ))}

        <div className="relative ml-auto w-full max-w-[220px]">
          <Search
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value)
              setPage(1)
            }}
            placeholder="Search facts…"
            aria-label="Search context objects by name or content"
            className="h-8 pl-8 text-xs"
          />
        </div>
      </div>

      {data.objects.length === 0 ? (
        <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
          No fact matches “{search}”.
        </p>
      ) : (
        <ul className="space-y-2">
          {data.objects.map((object) => (
            <ObjectCard key={object.id} object={object} />
          ))}
        </ul>
      )}

      <Pagination
        {...serverPage(page, DEFAULT_FACTS_QUERY.pageSize, data.matched)}
        setPage={setPage}
        noun="facts"
      />
    </div>
  )
}

function TypeChip({
  label,
  count,
  active,
  onClick,
}: {
  label: string
  count: number
  active: boolean
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'rounded-full border px-2.5 py-1 font-mono text-xs transition-colors',
        active ? 'border-primary bg-primary text-primary-foreground' : 'bg-card hover:bg-accent'
      )}
    >
      {label} <span className="tabular-nums opacity-70">({count})</span>
    </button>
  )
}

function ObjectCard({ object }: { object: ContextObject }) {
  const payload = object.payload ?? {}
  const description =
    typeof payload[DESCRIPTION_KEY] === 'string' ? (payload[DESCRIPTION_KEY] as string) : null
  const rest = Object.entries(payload).filter(([key]) => key !== DESCRIPTION_KEY)

  return (
    <li
      className={cn(
        'rounded-lg border-l-2 bg-card p-3',
        // `verified` is the skill's own trust flag: true for structural facts,
        // false for anything that needed interpretation. Worth seeing at a
        // glance, because the false ones are what a human has to review.
        object.verified ? 'border-l-emerald-500' : 'border-l-amber-400'
      )}
    >
      <div className="flex flex-wrap items-center gap-2">
        <p className="min-w-0 break-all font-mono text-sm font-medium">
          {object.qualifiedName}
        </p>
        <Badge variant="secondary" className="font-mono text-[10px]">
          {object.objectType}
        </Badge>
        <Badge variant="outline" className="font-mono text-[10px] text-muted-foreground">
          {object.sourceType}
        </Badge>
        <span
          className={cn(
            'ml-auto inline-flex items-center gap-1 text-xs',
            object.verified ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
          )}
        >
          {object.verified ? (
            <>
              <ShieldCheck className="size-3.5" aria-hidden />
              verified
            </>
          ) : (
            <>
              <ShieldQuestion className="size-3.5" aria-hidden />
              needs review
            </>
          )}
        </span>
      </div>

      {description ? (
        <p className="mt-1.5 text-sm text-muted-foreground">{description}</p>
      ) : null}

      {rest.length > 0 ? (
        <dl className="mt-2 grid gap-x-4 gap-y-1 text-xs sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
          {rest.map(([key, value]) => (
            <div key={key} className="contents">
              <dt className="font-mono text-muted-foreground">{key}</dt>
              <dd className="min-w-0 break-words">{renderValue(value)}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </li>
  )
}

/**
 * One payload value, without assuming what it is.
 *
 * Arrays are the common case (`distinct_values`), so they render as chips;
 * objects fall back to JSON rather than being flattened into something that
 * looks like data it is not.
 */
function renderValue(value: unknown) {
  if (value === null || value === undefined) {
    return <span className="text-muted-foreground">—</span>
  }
  if (Array.isArray(value)) {
    return (
      <span className="flex flex-wrap gap-1">
        {value.map((entry, i) => (
          <code key={i} className="rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
            {typeof entry === 'object' ? JSON.stringify(entry) : String(entry)}
          </code>
        ))}
      </span>
    )
  }
  if (typeof value === 'object') {
    return (
      <code className="block overflow-x-auto rounded bg-muted px-1.5 py-0.5 font-mono text-[11px]">
        {JSON.stringify(value)}
      </code>
    )
  }
  return <span className="font-mono">{String(value)}</span>
}
