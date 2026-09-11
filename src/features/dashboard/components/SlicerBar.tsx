import type { DashboardLayout, HydratedSlicer } from '../types/dashboard'
import { GAP_CLASSES, SPAN_CLASSES } from '../utils/grid'
import SlicerCard from './SlicerCard'

interface Props {
  slicers: HydratedSlicer[]
  layout?: DashboardLayout
  selections: Record<string, Set<string>>
  onChange: (id: string, selected: Set<string>) => void
  onClearAll: () => void
}

export default function SlicerBar({ slicers, layout, selections, onChange, onClearAll }: Props) {
  const gap = GAP_CLASSES[layout?.gap || 'md'] || GAP_CLASSES.md
  const defaultSpan = layout?.slicer?.span ?? 3
  const minHeight = layout?.slicer?.minHeight

  const anyActive = Object.values(selections).some((s) => s && s.size > 0)

  if (!slicers.length) return null

  return (
    <section className={`mb-6 grid grid-cols-1 ${gap} sm:grid-cols-2 lg:grid-cols-12`}>
      {slicers.map((slicer) => {
        const span = slicer.span ?? defaultSpan
        const values = slicer.options.map((o) => o.value)
        const counts = Object.fromEntries(slicer.options.map((o) => [o.value, o.count]))
        return (
          <div key={slicer.id} className={SPAN_CLASSES[span] || SPAN_CLASSES[defaultSpan]}>
            <SlicerCard
              slicer={slicer}
              values={values}
              counts={counts}
              selected={selections[slicer.id] || new Set<string>()}
              onChange={(sel) => onChange(slicer.id, sel)}
              minHeight={minHeight}
            />
          </div>
        )
      })}
      {anyActive && (
        <div className="flex items-center justify-end sm:col-span-2 lg:col-span-12">
          <button
            type="button"
            onClick={onClearAll}
            className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 shadow-sm hover:border-rose-300 hover:text-rose-600"
          >
            ✕ Clear all filters
          </button>
        </div>
      )}
    </section>
  )
}