import { useCallback, useEffect, useRef, useState, type ReactElement } from 'react'
import { createPortal } from 'react-dom'
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
  PreviewResult,
  SourceColumn,
} from '@/types/dashboard'
import { fetchColumns, previewCard } from '@/api/dashboardApi'
import ColumnCataloguePanel from './ColumnCatalogue'
import EditorPreview from './EditorPreview'
import { CloseButton } from './editorUi'
import {
  CardTypeSection,
  ColorSection,
  DataSourceSection,
  DateGrainSection,
  FieldsSection,
  PropertiesSection,
  SortSection,
  type Ctx,
} from './EditorSections'
import { deriveGroupBy } from '@/services/cardModel'
import { cardKindOf, cardTypeLabel } from '@/components/dashboard/cardRegistry'

interface Props {
  dashboardId: string
  card: CardDefinition
  filters?: Record<string, string[]>
  onSave: (updated: CardDefinition) => void
  onClose: () => void
}

type TabId = 'fields' | 'sort' | 'period' | 'type' | 'color' | 'properties' | 'source'

const TABS: Array<{ id: TabId; label: string; icon: LucideIcon }> = [
  { id: 'fields', label: 'Fields', icon: Table2 },
  { id: 'type', label: 'Type', icon: BarChart3 },
  { id: 'sort', label: 'Sort', icon: ArrowUpDown },
  { id: 'period', label: 'Period', icon: CalendarClock },
  { id: 'color', label: 'Colours', icon: Palette },
  { id: 'properties', label: 'Format', icon: SlidersHorizontal },
  { id: 'source', label: 'Source', icon: Database },
]

const PREVIEW_DEBOUNCE_MS = 500

function normalise(draft: CardDefinition): CardDefinition {
  const next = structuredClone(draft)
  const cols = (next.columns ?? []).filter((c) => (c.column ?? '').trim())
  next.columns = cols

  const groupBy = deriveGroupBy(cols)
  if (groupBy.length) next.groupBy = groupBy
  else delete next.groupBy

  return next
}

export default function CardEditor({ dashboardId, card, filters = {}, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CardDefinition>(() => structuredClone(card))
  const [tab, setTab] = useState<TabId>('fields')
  const [catalogue, setCatalogue] = useState<ColumnCatalogue | null>(null)
  const [catalogueLoading, setCatalogueLoading] = useState(true)
  const [preview, setPreview] = useState<PreviewResult | null>(null)
  const [previewPending, setPreviewPending] = useState(false)
  const [autoPreview, setAutoPreview] = useState(true)
  const requestId = useRef(0)

  // Derived, never stored: the card type is the single source of truth.
  const kind = cardKindOf(draft.chartType)

  useEffect(() => {
    let active = true
    fetchColumns(dashboardId)
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
  }, [dashboardId])

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
      previewCard(dashboardId, normalise(candidate), filters)
        .then((r) => {
          if (id === requestId.current) {
            setPreview(r)
            setPreviewPending(false)
          }
        })
        .catch((e) => {
          if (id === requestId.current) {
            setPreview({
              kind: cardKindOf(candidate.chartType),
              visual: null,
              error: { stage: 'request', message: e.message },
            })
            setPreviewPending(false)
          }
        })
    },
    [dashboardId, filters]
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

  const setColumn = (idx: number, field: keyof ColumnDef, value: unknown) =>
    setDraft((prev) => {
      const cols = [...(prev.columns ?? [])]
      cols[idx] = { ...(cols[idx] ?? { column: '' }), [field]: value }
      return { ...prev, columns: cols }
    })

  const addColumn = () =>
    setDraft((prev) => ({
      ...prev,
      columns: [...(prev.columns ?? []), { column: '', mapping: 'VALUE', aggregation: 'SUM' }],
    }))

  const removeColumn = (idx: number) =>
    setDraft((prev) => ({ ...prev, columns: (prev.columns ?? []).filter((_, i) => i !== idx) }))

  const setDateGrain = (grain: DateGrain | undefined) =>
    setDraft((prev) => {
      const next = { ...prev }
      if (grain) next.dateGrain = grain
      else delete next.dateGrain
      return next
    })

  const pickColumn = (col: SourceColumn) => {
    let entry: ColumnDef
    if (col.role === 'measure') entry = { column: col.name, mapping: 'VALUE', aggregation: 'SUM' }
    else if (kind === 'kpi') entry = { column: col.name, mapping: 'VALUE', aggregation: 'COUNTDISTINCT' }
    else entry = { column: col.name, mapping: 'XTIME' }

    setDraft((prev) => {
      const cols = [...(prev.columns ?? [])]
      const empty = cols.findIndex((c) => !(c.column ?? '').trim())
      if (empty >= 0) cols[empty] = entry
      else cols.push(entry)
      return { ...prev, columns: cols }
    })
    setTab('fields')
  }

  const columns = draft.columns ?? []
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
    type: <CardTypeSection {...ctx} />,
    sort: <SortSection {...ctx} />,
    period: <DateGrainSection {...ctx} />,
    color: <ColorSection {...ctx} />,
    properties: <PropertiesSection {...ctx} />,
    source: <DataSourceSection {...ctx} />,
  }

  const dirty = JSON.stringify(normalise(draft)) !== JSON.stringify(normalise(card))
  const blocked = Boolean(preview?.error)

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 p-4">
      <div className="flex h-[calc(100vh-2rem)] max-h-[860px] w-full max-w-[1320px] flex-col overflow-hidden rounded-xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        <header className="flex shrink-0 items-center gap-4 border-b border-slate-200 px-4 py-3">
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-[15px] font-semibold leading-tight text-slate-900">
              {draft.title || draft.name || draft.id}
            </h2>
            <p className="text-[11px] leading-tight text-slate-400">{cardTypeLabel(draft.chartType)}</p>
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
            onClick={() => onSave(normalise(draft))}
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

          <nav className="flex w-[132px] shrink-0 flex-col gap-0.5 border-r border-slate-200 bg-slate-50 p-2">
            {TABS.map((t) => {
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
            kind={preview?.kind ?? kind}
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
    </div>,
    document.body
  )
}
