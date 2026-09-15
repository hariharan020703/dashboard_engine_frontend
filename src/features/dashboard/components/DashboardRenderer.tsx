import { useState } from 'react'
import type {
  DashboardLayout,
  HydratedChart,
  HydratedDashboardView,
  HydratedKpi,
  CardDefinition,
} from '../types/dashboard'
import KpiCard from './KpiCard'
import ChartRenderer from './ChartRenderer'
import CardEditor from './editor/CardEditor'
import SlicerBar from './SlicerBar'
import { cardKindOf } from './cardRegistry'
import { GRID_COLS, SPAN_CLASSES, GAP_CLASSES } from '../utils/grid'
import { buildFilters } from '../utils/filters'

interface Props {
  view: HydratedDashboardView
  selections: Record<string, Set<string>>
  onSlicerChange: (id: string, selected: Set<string>) => void
  onClearAll: () => void
  onCardEdit: (index: number, card: CardDefinition) => void
}

export default function DashboardRenderer({ view, selections, onSlicerChange, onClearAll, onCardEdit }: Props) {
  const { dashboard, cards, slicers, layout: rawLayout } = view
  const layout: DashboardLayout = rawLayout ?? {}
  const gap = GAP_CLASSES[layout.gap || 'md'] || GAP_CLASSES.md
  const kpiSpan = layout.kpi?.span ?? 3
  const kpiMinHeight = layout.kpi?.minHeight ?? 130
  const chartSpan = layout.chart?.span ?? 6
  const gridClass = GRID_COLS[layout.cols || 12] || GRID_COLS[12]

  const [editing, setEditing] = useState<{ index: number; card: CardDefinition } | null>(null)
  // The editor previews against the same filters the dashboard is showing.
  const activeFilters = buildFilters(selections)

  const handleSave = (updated: CardDefinition) => {
    if (!editing) return
    onCardEdit(editing.index, updated)
    setEditing(null)
  }

  return (
    <div className="min-h-screen bg-slate-100 p-6">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{dashboard?.title || 'Dashboard'}</h1>
          {dashboard?.description && <p className="text-sm text-slate-500">{dashboard?.description}</p>}
        </div>
      </header>

      <SlicerBar
        slicers={slicers}
        layout={layout}
        selections={selections}
        onChange={onSlicerChange}
        onClearAll={onClearAll}
      />

      {/*
        One grid for the whole dashboard: KPIs and charts are the same list, and
        each card's chartType decides which renderer it gets. Below `lg` the
        spans collapse, so badges pair up two per row and charts take the width.
      */}
      <section className={`grid grid-cols-1 ${gap} sm:grid-cols-2 ${gridClass}`}>
        {cards.map((card, i) => {
          const isKpi = cardKindOf(card.chartType) === 'kpi'
          const fallbackSpan = isKpi ? kpiSpan : chartSpan
          const span = card.spec?.layout?.span ?? fallbackSpan
          const onEdit = () => setEditing({ index: i, card: card.spec! })
          return (
            <div
              key={card.id}
              className={`${isKpi ? 'sm:col-span-1' : 'sm:col-span-2'} ${
                SPAN_CLASSES[span] || SPAN_CLASSES[fallbackSpan]
              }`}
            >
              {isKpi ? (
                <KpiCard kpi={card as HydratedKpi} minHeight={kpiMinHeight} onEdit={onEdit} />
              ) : (
                <ChartRenderer spec={card as HydratedChart} onEdit={onEdit} />
              )}
            </div>
          )
        })}
      </section>

      {editing && (
        <CardEditor
          card={editing.card}
          filters={activeFilters}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
