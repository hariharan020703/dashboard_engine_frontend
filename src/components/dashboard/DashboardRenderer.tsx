import { useState } from 'react'
import type {
  DashboardLayout,
  HydratedChart,
  HydratedDashboardView,
  HydratedKpi,
  CardDefinition,
} from '@/types/dashboard'
import KpiCard from './KpiCard'
import ChartRenderer from './ChartRenderer'
import CardEditor from '@/components/dashboard/editor/CardEditor'
import SlicerBar from './SlicerBar'
import { cardKindOf } from './cardRegistry'
import { GRID_COLS, SPAN_CLASSES, GAP_CLASSES } from '@/services/grid'
import { buildFilters } from '@/services/filters'

interface Props {
  dashboardId: string
  view: HydratedDashboardView
  selections: Record<string, Set<string>>
  canEdit: boolean
  onSlicerChange: (id: string, selected: Set<string>) => void
  onClearAll: () => void
  onCardEdit: (index: number, card: CardDefinition) => void
}

export default function DashboardRenderer({
  dashboardId,
  view,
  selections,
  canEdit,
  onSlicerChange,
  onClearAll,
  onCardEdit,
}: Props) {
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
    <div className="p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">{dashboard?.title || 'Dashboard'}</h1>
        {dashboard?.description && (
          <p className="mt-0.5 text-sm text-slate-500">{dashboard?.description}</p>
        )}
      </header>

      <SlicerBar
        slicers={slicers}
        layout={layout}
        selections={selections}
        onChange={onSlicerChange}
        onClearAll={onClearAll}
      />

      <section className={`grid grid-cols-1 ${gap} sm:grid-cols-2 ${gridClass}`}>
        {cards.map((card, i) => {
          const isKpi = cardKindOf(card.chartType) === 'kpi'
          const fallbackSpan = isKpi ? kpiSpan : chartSpan
          const span = card.spec?.layout?.span ?? fallbackSpan
          // Withheld entirely rather than shown-and-refused: a user without a
          // developer grant has no edit affordance to click.
          const onEdit = canEdit ? () => setEditing({ index: i, card: card.spec! }) : undefined
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
          dashboardId={dashboardId}
          card={editing.card}
          filters={activeFilters}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}
