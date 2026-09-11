import { Pencil } from 'lucide-react'
import type { RenderChart } from '../types/dashboard'
import { findRegistration } from './chartRegistry'

function UnknownChart({ chartType, title }: { chartType: string; title: string }) {
  return (
    <div className="flex h-[200px] flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center">
      <span className="text-sm font-medium text-slate-500">{title}</span>
      <span className="text-xs text-slate-400">
        Unsupported chart type &quot;{chartType}&quot;.
      </span>
    </div>
  )
}

export default function ChartRenderer({ spec, onEdit }: { spec: RenderChart; onEdit?: () => void }) {
  const registration = findRegistration(spec.chartType)
  const height = typeof spec.options?.height === 'number' ? spec.options.height : 340

  let body
  if (!spec.data?.length) {
    body = (
      <div style={{ height }} className="flex items-center justify-center text-sm text-slate-400">
        No data
      </div>
    )
  } else if (!registration) {
    body = <UnknownChart chartType={spec.chartType} title={spec.title} />
  } else {
    const Component = registration.component
    body = (
      <div style={{ height, width: '100%', overflow: 'hidden' }}>
        <Component spec={spec} />
      </div>
    )
  }

  return (
    <div className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="min-w-0">
          {spec.title && <h3 className="text-base font-semibold text-slate-800">{spec.title}</h3>}
          {spec.description && <p className="mt-0.5 text-xs text-slate-400">{spec.description}</p>}
        </div>
        {onEdit && (
          <button
            onClick={onEdit}
            title="Edit card"
            className="flex shrink-0 items-center gap-1 rounded-md border border-slate-200 px-2 py-1 text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600"
          >
            <Pencil size={12} />
            Edit
          </button>
        )}
      </div>
      <div className="min-h-0 flex-1">{body}</div>
    </div>
  )
}