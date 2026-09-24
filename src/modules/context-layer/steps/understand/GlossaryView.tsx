import { useDeferredValue, useState } from 'react'
import type { ReactNode } from 'react'
import { Search } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Pagination } from '../../components/Pagination'
import { serverPage } from '../../components/usePagination'
import { formatExact } from '../../components/format'
import { DEFAULT_GLOSSARY_QUERY, useUnderstanding } from '../../queries/hooks'
import type { GlossaryFilter, GlossaryTermState, Understanding } from '../../types'

/**
 * Understand's main view: three headline numbers and the business glossary.
 *
 * Every number and every row is the backend's (`GET …/understanding`), and so
 * is the filtering: the chips, the search and the page are query parameters,
 * and only the visible page of terms is sent. This computes no count and
 * invents no term.
 */

const STATE_LABEL: Record<GlossaryTermState, string> = {
  ai_generated: 'AI generated',
  ai_suggested: 'AI suggested',
  human_approved: 'Human approved',
  human_override: 'Human override',
  source_verified: 'Source verified',
  rejected: 'Rejected',
}

const STATE_TONE: Record<GlossaryTermState, string> = {
  ai_generated: 'border-violet-500/25 bg-violet-500/10 text-violet-700 dark:text-violet-300',
  ai_suggested: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300',
  human_approved: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
  human_override: 'border-sky-500/30 bg-sky-500/10 text-sky-700 dark:text-sky-300',
  source_verified: 'border-teal-500/30 bg-teal-500/10 text-teal-700 dark:text-teal-300',
  rejected: 'border-rose-500/30 bg-rose-500/10 text-rose-700 dark:text-rose-300',
}

/**
 * The filter chips. "Needs review" is the low-confidence pending set — the
 * confident ones are "AI generated" — and "Approved" counts the run's own
 * verified structural facts alongside a person's approvals.
 */
const FILTERS: Array<{ id: GlossaryFilter; label: string }> = [
  { id: 'all', label: 'All' },
  { id: 'ai', label: 'AI generated' },
  { id: 'review', label: 'Needs review' },
  { id: 'approved', label: 'Approved' },
  { id: 'override', label: 'Overridden' },
]

export function GlossaryView({ connectionId }: { connectionId: string }) {
  const [filter, setFilter] = useState<GlossaryFilter>('all')
  const [search, setSearch] = useState('')
  const [page, setPage] = useState(1)
  const needle = useDeferredValue(search).trim()

  const glossary = useUnderstanding(connectionId, {
    ...DEFAULT_GLOSSARY_QUERY,
    filter,
    ...(needle ? { search: needle } : {}),
    page,
  })
  const data = glossary.data
  if (!data) return null

  const { stats } = data
  const average =
    stats.averageConfidence === null ? null : Math.round(stats.averageConfidence * 100)

  return (
    <div className="space-y-6">
      <div className="grid gap-5 sm:grid-cols-3">
        <SummaryTile
          label="Terms generated"
          value={formatExact(stats.termsGenerated)}
          hint={`Across ${formatExact(stats.entityCount)} table${stats.entityCount === 1 ? '' : 's'}, ${formatExact(stats.metricCount)} metric${stats.metricCount === 1 ? '' : 's'} and ${formatExact(stats.dimensionCount)} dimension${stats.dimensionCount === 1 ? '' : 's'}`}
        />
        <SummaryTile
          label="Average confidence"
          value={average === null ? '—' : `${average}%`}
          hint={
            <span className="inline-flex rounded-md border border-violet-500/25 bg-violet-500/10 px-2 py-0.5 text-xs font-medium text-violet-700 dark:text-violet-300">
              AI generated
            </span>
          }
        />
        <SummaryTile
          label="Human approved"
          value={formatExact(stats.humanApproved)}
          hint={
            <>
              <span className="font-semibold text-emerald-600 dark:text-emerald-400">
                +{formatExact(stats.approvedThisWeek)}
              </span>{' '}
              this week
            </>
          }
        />
      </div>

      <GlossaryTable
        data={data}
        search={search}
        onSearch={(value) => {
          setSearch(value)
          setPage(1)
        }}
        filter={filter}
        onFilter={(value) => {
          setFilter(value)
          setPage(1)
        }}
        page={page}
        onPage={setPage}
      />
    </div>
  )
}

function SummaryTile({
  label,
  value,
  hint,
}: {
  label: string
  value: string
  hint: ReactNode
}) {
  return (
    <div className="rounded-xl border bg-card px-5 py-4 shadow-xs">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 text-3xl font-semibold tabular-nums tracking-tight">{value}</p>
      <div className="mt-2 text-sm text-muted-foreground">{hint}</div>
    </div>
  )
}

function GlossaryTable({
  data,
  search,
  onSearch,
  filter,
  onFilter,
  page,
  onPage,
}: {
  data: Understanding
  search: string
  onSearch: (value: string) => void
  filter: GlossaryFilter
  onFilter: (value: GlossaryFilter) => void
  page: number
  onPage: (page: number) => void
}) {
  const paging = serverPage(page, DEFAULT_GLOSSARY_QUERY.pageSize, data.matched)

  return (
    <section className="overflow-hidden rounded-xl border bg-card shadow-xs">
      <header className="border-b px-5 py-4">
        <h3 className="text-base font-semibold">Business glossary</h3>
      </header>

      <div className="flex flex-wrap items-center gap-3 px-5 py-3.5">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={search}
            onChange={(e) => onSearch(e.target.value)}
            placeholder="Search terms"
            aria-label="Search terms"
            className="h-9 pl-9"
          />
        </div>

        <div
          role="group"
          aria-label="Filter by state"
          className="inline-flex overflow-hidden rounded-lg border"
        >
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => onFilter(f.id)}
              className={cn(
                'border-l px-3.5 py-1.5 text-sm transition-colors first:border-l-0',
                filter === f.id
                  ? 'bg-foreground font-medium text-background'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-y bg-muted/40 text-left text-xs font-medium text-muted-foreground">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">Term</th>
              <th scope="col" className="px-4 py-3 font-medium">Type</th>
              <th scope="col" className="px-4 py-3 font-medium">Definition</th>
              <th scope="col" className="px-4 py-3 font-medium">Applies to</th>
              <th scope="col" className="px-4 py-3 font-medium">Confidence</th>
              <th scope="col" className="px-4 py-3 font-medium">State</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {data.terms.map((t) => (
              <tr key={t.id} className="align-middle transition-colors hover:bg-muted/30">
                <td className="max-w-[200px] px-5 py-3 font-semibold text-foreground">{t.term}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex rounded-md border bg-muted/60 px-2 py-0.5 text-xs font-medium text-muted-foreground">
                    {t.typeLabel}
                  </span>
                </td>
                <td className="min-w-[260px] max-w-[420px] px-4 py-3 text-muted-foreground">
                  {t.definition ?? <span className="italic">No definition recorded</span>}
                </td>
                <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-muted-foreground">
                  {t.appliesTo ?? '—'}
                </td>
                <td className="px-4 py-3">
                  <Confidence value={t.confidence} />
                </td>
                <td className="whitespace-nowrap px-4 py-3">
                  <span
                    className={cn(
                      'inline-flex rounded-md border px-2 py-0.5 text-xs font-semibold',
                      STATE_TONE[t.state]
                    )}
                  >
                    {STATE_LABEL[t.state]}
                  </span>
                </td>
              </tr>
            ))}
            {data.terms.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-10 text-center text-sm text-muted-foreground">
                  {data.stats.termsGenerated === 0
                    ? 'The run recorded no entities, metrics or dimensions.'
                    : 'No terms match this search or filter.'}
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>

      <Pagination {...paging} setPage={onPage} noun="terms" />
    </section>
  )
}

/** Violet when the run was confident (≥ 80%), amber when it was not. */
function Confidence({ value }: { value: number | null }) {
  if (value === null) return <span className="text-xs text-muted-foreground">—</span>
  const pct = Math.round(value * 100)
  return (
    <span
      className={cn(
        'text-xs font-semibold tabular-nums',
        value >= 0.8 ? 'text-violet-600 dark:text-violet-400' : 'text-amber-600 dark:text-amber-400'
      )}
    >
      {pct}%
    </span>
  )
}
