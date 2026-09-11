import { useState } from 'react'
import type { DashboardLayout, HydratedDashboardView, CardDefinition } from '../types/dashboard'
import KpiCard from './KpiCard'
import ChartRenderer from './ChartRenderer'
import CardEditor from './CardEditor'
import SlicerBar from './SlicerBar'
import { GRID_COLS, SPAN_CLASSES, GAP_CLASSES } from '../utils/grid'

interface Props {
  view: HydratedDashboardView
  selections: Record<string, Set<string>>
  onSlicerChange: (id: string, selected: Set<string>) => void
  onClearAll: () => void
  onCardEdit: (kind: 'kpi' | 'chart', index: number, card: CardDefinition) => void
}

export default function DashboardRenderer({ view, selections, onSlicerChange, onClearAll, onCardEdit }: Props) {
  const { dashboard, kpis, cards, slicers, layout: rawLayout } = view
  const layout: DashboardLayout = rawLayout ?? {}
  const gap = GAP_CLASSES[layout.gap || 'md'] || GAP_CLASSES.md
  const kpiSpan = layout.kpi?.span ?? 3
  const kpiMinHeight = layout.kpi?.minHeight ?? 130
  const chartSpan = layout.chart?.span ?? 6
  const gridClass = GRID_COLS[layout.cols || 12] || GRID_COLS[12]

  const [editing, setEditing] = useState<{ kind: 'kpi' | 'chart'; index: number; card: CardDefinition } | null>(null)

  const handleSave = (updated: CardDefinition) => {
    if (!editing) return
    onCardEdit(editing.kind, editing.index, updated)
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

      {kpis.length > 0 && (
        <section className={`mb-6 grid grid-cols-1 ${gap} sm:grid-cols-2 ${gridClass}`}>
          {kpis.map((kpi, i) => {
            const span = kpi.spec?.layout?.span ?? kpiSpan
            return (
              <div key={kpi.id} className={SPAN_CLASSES[span] || SPAN_CLASSES[kpiSpan]}>
                <KpiCard
                  kpi={kpi}
                  minHeight={kpiMinHeight}
                  onEdit={() => setEditing({ kind: 'kpi', index: i, card: kpi.spec! })}
                />
              </div>
            )
          })}
        </section>
      )}

      <section className={`grid grid-cols-1 ${gap} ${gridClass}`}>
        {cards.map((card, i) => {
          const span = card.spec?.layout?.span ?? chartSpan
          return (
            <div key={card.id} className={SPAN_CLASSES[span] || SPAN_CLASSES[chartSpan]}>
              <ChartRenderer
                spec={card}
                onEdit={() => setEditing({ kind: 'chart', index: i, card: card.spec! })}
              />
            </div>
          )
        })}
      </section>

      {editing && (
        <CardEditor
          card={editing.card}
          kind={editing.kind}
          onSave={handleSave}
          onClose={() => setEditing(null)}
        />
      )}
    </div>
  )
}