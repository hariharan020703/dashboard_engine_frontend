import { useCallback, useEffect, useMemo, useRef, useState, type ReactElement } from 'react'
import {
  ArrowUpDown,
  BarChart3,
  CalendarClock,
  Database,
  Palette,
  SlidersHorizontal,
  Table2,
  type LucideIcon,
} from 'lucide-react'
import type {
  CardDefinition,
  ColumnCatalogue,
  ColumnDef,
  DateGrain,
  Mapping,
  PreviewResult,
  SeriesDef,
  SourceColumn,
} from '../../types/dashboard'
import { fetchColumns, previewCard } from '../../services/dashboardApi'
import ColumnCataloguePanel from './ColumnCatalogue'
import EditorPreview from './EditorPreview'
import { CloseButton } from './editorUi'
import {
  ChartTypeSection,
  ColorSection,
  DataSourceSection,
  DateGrainSection,
  FieldsSection,
  PropertiesSection,
  SortSection,
  type Ctx,
} from './EditorSections'
import { deriveGroupBy } from './cardModel'
import { findRegistration } from '../chartRegistry'

interface Props {
  card: CardDefinition
  kind: 'kpi' | 'chart'
  filters?: Record<string, string[]>
  onSave: (updated: CardDefinition) => void
  onClose: () => void
}

type TabId = 'fields' | 'sort' | 'period' | 'chart' | 'color' | 'properties' | 'source'

const TABS: Array<{ id: TabId; label: string; icon: LucideIcon; kinds: Array<'kpi' | 'chart'> }> = [
  { id: 'fields', label: 'Fields', icon: Table2, kinds: ['kpi', 'chart'] },
  { id: 'chart', label: 'Chart', icon: BarChart3, kinds: ['chart'] },
  { id: 'sort', label: 'Sort', icon: ArrowUpDown, kinds: ['chart'] },
  { id: 'period', label: 'Period', icon: CalendarClock, kinds: ['kpi', 'chart'] },
  { id: 'color', label: 'Colours', icon: Palette, kinds: ['chart'] },
  { id: 'properties', label: 'Format', icon: SlidersHorizontal, kinds: ['kpi', 'chart'] },
  { id: 'source', label: 'Source', icon: Database, kinds: ['kpi', 'chart'] },
]

const PREVIEW_DEBOUNCE_MS = 500

function columnsOf(card: CardDefinition, kind: 'kpi' | 'chart'): ColumnDef[] {
  return (kind === 'kpi' ? card.series?.main?.columns : card.columns) ?? []
}

/**
 * Normalises the draft before it leaves the editor: groupBy is rederived from the
 * field roles and empty fields are dropped, so the saved JSON is always
 * internally consistent.
 */
function normalise(draft: CardDefinition, kind: 'kpi' | 'chart'): CardDefinition {
  const next = structuredClone(draft)
  const cols = columnsOf(next, kind).filter((c) => (c.column ?? '').trim())

  if (kind === 'kpi') {
    next.series = {
      ...(next.series ?? {}),
      main: { ...(next.series?.main ?? {}), columns: cols } as SeriesDef,
    }
  } else {
    next.columns = cols
    const groupBy = deriveGroupBy(cols)
    if (groupBy.length) next.groupBy = groupBy
    else delete next.groupBy
  }
  return next
}

export default function CardEditor({ card, kind, filters = {}, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CardDefinition>(() => structuredClone(card))
  const [tab, setTab] = useState<TabId>('fields')
  const [catalogue, setCatalogue] = useState<ColumnCatalogue | null>(null)
  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewPending, setPreviewPending] = useState(false)
  const [autoPreview, setAutoPreview] = useState(true)
  const requestId = useRef(0)

  const tabs = useMemo(() => TABS.filter((t) => t.kinds.includes(kind)), [kind])

  useEffect(() => {
    let active = true
    fetchColumns()
      .then((c) => {
        if (active) {
          setCatalogue(c)
          setCatalogueLoading(false)
        }
      })
      .catch(() => {
        if (active) setCatalogueLoading(false)
      })
    return () => {
      active = false
    }
  }, [])

  // Escape closes the dialog.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  const runPreview = useCallback(
    (candidate: CardDefinition) => {
      const id = ++requestId.current
      setPreviewPending(true)
      previewCard(kind, normalise(candidate, kind), filters)
        .then((r) => {
          if (id === requestId.current) {
            setPreview(r)
            setPreviewPending(false)
          }
        })
        .catch((e) => {
          if (id === requestId.current) {
            setPreview({ kind, visual: null, error: { stage: 'request', message: e.message } })
            setPreviewPending(false)
          }
        })
    },
    [kind, filters]
  )

  // Debounced so typing in a text field does not fire a query per keystroke.
  useEffect(() => {
    if (!autoPreview) return
    const t = setTimeout(() => runPreview(draft), PREVIEW_DEBOUNCE_MS)
    return () => clearTimeout(t)
  }, [draft, autoPreview, runPreview])

  const setCard = (patch: Partial<CardDefinition>) => setDraft((prev) => ({ ...prev, ...patch }))

  const setOption = (key: string, value: unknown) =>
    setDraft((prev) => ({ ...prev, options: { ...(prev.options ?? {}), [key]: value } }))

  const writeColumns = (prev: CardDefinition, cols: ColumnDef[]): CardDefinition => {
    if (kind === 'kpi') {
      const main: Partial<SeriesDef> = prev.series?.main ?? {}
      return { ...prev, series: { ...(prev.series ?? {}), main: { ...main, columns: cols } as SeriesDef } }
    }
    return { ...prev, columns: cols }
  }

  const setColumn = (idx: number, field: keyof ColumnDef, value: unknown) =>
    setDraft((prev) => {
      const cols = [...columnsOf(prev, kind)]
      cols[idx] = { ...(cols[idx] ?? { column: '' }), [field]: value }
      return writeColumns(prev, cols)
    })

  const addColumn = () =>
    setDraft((prev) =>
      writeColumns(prev, [
        ...columnsOf(prev, kind),
        { column: '', mapping: 'VALUE' as Mapping, aggregation: 'SUM' },
      ])
    )

  const removeColumn = (idx: number) =>
    setDraft((prev) => writeColumns(prev, columnsOf(prev, kind).filter((_, i) => i !== idx)))

  const setDateGrain = (grain: DateGrain | undefined) =>
    setDraft((prev) => {
      if (kind === 'kpi') {
        const nextMain = { ...(prev.series?.main ?? {}) } as SeriesDef
        if (grain) nextMain.dateGrain = grain
        else delete nextMain.dateGrain
        return { ...prev, series: { ...(prev.series ?? {}), main: nextMain } }
      }
      const next = { ...prev }
      if (grain) next.dateGrain = grain
      else delete next.dateGrain
      return next
    })

  /** Clicking a column in the catalogue adds it with a role matching its type. */
  const pickColumn = (col: SourceColumn) => {
    const entry: ColumnDef =
      col.role === 'measure'
        ? { column: col.name, mapping: 'VALUE', aggregation: 'SUM' }
        : { column: col.name, mapping: kind === 'kpi' ? 'VALUE' : 'XTIME' }
    setDraft((prev) => {
      const cols = [...columnsOf(prev, kind)]
      const empty = cols.findIndex((c) => !(c.column ?? '').trim())
      if (empty >= 0) cols[empty] = entry
      else cols.push(entry)
      return writeColumns(prev, cols)
    })
    setTab('fields')
  }

  const columns = columnsOf(draft, kind)
  const ctx: Ctx = {
    kind,
    draft,
    catalogue,
    columns,
    setCard,
    setColumn,
    addColumn,
    removeColumn,
    setDateGrain,
    setOption,
  }

  const panels: Record<TabId, ReactElement | null> = {
    fields: <FieldsSection {...ctx} />,
    chart: <ChartTypeSection {...ctx} />,
    sort: <SortSection {...ctx} />,
    period: <DateGrainSection {...ctx} />,
    color: <ColorSection {...ctx} />,
    properties: <PropertiesSection {...ctx} />,
    source: <DataSourceSection {...ctx} />,
  }

  const dirty = JSON.stringify(normalise(draft, kind)) !== JSON.stringify(normalise(card, kind))
  const blocked = Boolean(preview?.error)

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[calc(100vh-2rem)] max-h-[860px] w-full max-w-[1320px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold leading-tight text-slate-900">
              {draft.title || draft.name || draft.id}
            </h2>
            <p className="text-[11px] leading-tight text-slate-400">
              {kind === 'kpi' ? 'KPI' : findRegistration(draft.chartType ?? '')?.label ?? draft.chartType}
            </p>
          </div>
          {dirty && (
            <span className="flex shrink-0 items-center gap-1.5 text-[11px] font-medium text-amber-600">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
              Unsaved
            </span>
          )}
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-md border border-slate-300 px-3 py-1.5 text-[13px] font-medium text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={blocked}
            onClick={() => onSave(normalise(draft, kind))}
            className="shrink-0 rounded-md bg-blue-600 px-4 py-1.5 text-[13px] font-semibold text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            Save
          </button>
          <CloseButton onClick={onClose} />
        </header>

        <div className="flex min-h-0 flex-1">
          <ColumnCataloguePanel
            catalogue={catalogue}
            loading={catalogueLoading}
            usedColumns={columns.map((c) => c.column ?? '')}
            onPick={pickColumn}
          />

          {/* Vertical section nav keeps each panel short enough to avoid scrolling. */}
          <nav className="flex w-[132px] shrink-0 flex-col gap-0.5 border-r border-slate-200 bg-slate-50 p-2">
            {tabs.map((t) => {
              const active = tab === t.id
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTab(t.id)}
                  className={`flex items-center gap-2 rounded-md px-2.5 py-2 text-left text-[13px] font-medium transition-colors ${
                    active
                      ? 'bg-white text-blue-700 shadow-sm ring-1 ring-slate-200'
                      : 'text-slate-600 hover:bg-white/70 hover:text-slate-900'
                  }`}
                >
                  <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
                  {t.label}
                </button>
              )
            })}
          </nav>

          <div className="w-[400px] shrink-0 space-y-2.5 overflow-y-auto border-r border-slate-200 bg-slate-50 p-3">
            {panels[tab]}
          </div>

          <EditorPreview
            kind={kind}
            draft={draft}
            preview={preview}
            pending={previewPending}
            autoPreview={autoPreview}
            onToggleAuto={(v) => {
              setAutoPreview(v)
              if (v) runPreview(draft)
            }}
            onRefresh={() => runPreview(draft)}
            onJumpToFields={() => setTab('fields')}
          />
        </div>
      </div>
    </div>
  )
}
