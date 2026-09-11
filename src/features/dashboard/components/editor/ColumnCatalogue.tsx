import { useMemo, useState } from 'react'
import { ChevronDown, ChevronRight, Database, Hash, Loader2, Search, Type } from 'lucide-react'
import type { ColumnCatalogue as Catalogue, SourceColumn } from '../../types/dashboard'
import { ROLE_STYLE } from './editorStyles'

interface Props {
  catalogue: Catalogue | null
  loading: boolean
  usedColumns: string[]
  onPick: (column: SourceColumn) => void
}

function Group({
  title,
  columns,
  used,
  onPick,
  openDefault,
}: {
  title: string
  columns: SourceColumn[]
  used: Set<string>
  onPick: (c: SourceColumn) => void
  openDefault: boolean
}) {
  const [open, setOpen] = useState(openDefault)
  const Chevron = open ? ChevronDown : ChevronRight
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-1.5 px-3 py-2 text-left hover:bg-slate-50"
      >
        <Chevron size={14} className="shrink-0 text-slate-400" />
        <span className="flex-1 text-[12px] font-semibold text-slate-700">{title}</span>
        <span className="text-[11px] tabular-nums text-slate-400">{columns.length}</span>
      </button>
      {open && (
        <ul className="pb-1">
          {columns.map((c) => {
            const Icon = c.role === 'measure' ? Hash : Type
            return (
              <li key={c.name}>
                <button
                  type="button"
                  onClick={() => onPick(c)}
                  title={c.columnType}
                  className="group flex w-full items-center gap-2 py-1 pl-7 pr-3 text-left hover:bg-blue-50"
                >
                  <Icon size={13} className={`shrink-0 rounded p-px ${ROLE_STYLE[c.role].badge}`} />
                  <span className="min-w-0 flex-1 truncate text-[12px] text-slate-700 group-hover:text-blue-700">
                    {c.name}
                  </span>
                  {used.has(c.name.toLowerCase()) && (
                    <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-blue-500" />
                  )}
                </button>
              </li>
            )
          })}
          {!columns.length && <li className="px-3 py-1.5 pl-7 text-[12px] text-slate-400">No matches</li>}
        </ul>
      )}
    </div>
  )
}

/**
 * Source table and its columns, split by role using the database types.
 * Clicking a column adds it to the card.
 */
export default function ColumnCatalogue({ catalogue, loading, usedColumns, onPick }: Props) {
  const [q, setQ] = useState('')
  const used = useMemo(() => new Set(usedColumns.map((c) => c.toLowerCase())), [usedColumns])

  const { dimensions, measures } = useMemo(() => {
    const term = q.trim().toLowerCase()
    const cols = (catalogue?.columns ?? []).filter((c) => !term || c.name.toLowerCase().includes(term))
    return {
      dimensions: cols.filter((c) => c.role === 'dimension'),
      measures: cols.filter((c) => c.role === 'measure'),
    }
  }, [catalogue, q])

  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-slate-200 bg-white">
      <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-2.5">
        <Database size={15} className="shrink-0 text-slate-400" />
        <div className="min-w-0">
          {loading ? (
            <Loader2 size={14} className="animate-spin text-slate-300" />
          ) : (
            <>
              <p className="truncate text-[13px] font-semibold leading-tight text-slate-800">
                {catalogue?.table ?? '—'}
              </p>
              <p className="text-[11px] leading-tight text-slate-400">
                {catalogue ? `${catalogue.rowCountText} rows` : ''}
              </p>
            </>
          )}
        </div>
      </div>

      <div className="border-b border-slate-200 p-2">
        <div className="relative">
          <Search size={13} className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search"
            className="h-8 w-full rounded-md border border-slate-300 bg-white pl-7 pr-2 text-[12px] text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="min-h-0 flex-1 divide-y divide-slate-100 overflow-y-auto">
        <Group title="Dimensions" columns={dimensions} used={used} onPick={onPick} openDefault />
        <Group title="Measures" columns={measures} used={used} onPick={onPick} openDefault={false} />
      </div>
    </aside>
  )
}
