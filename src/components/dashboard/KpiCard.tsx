import { AlertCircle, Pencil } from 'lucide-react'
import type { HydratedKpi } from '@/types/dashboard'

interface Props {
  kpi: HydratedKpi
  /** Gradient used when the card declares no colour of its own. */
  accent?: string
  minHeight?: number
  onEdit?: () => void
}

function errorMessage(error: unknown): string | null {
  if (!error || typeof error !== 'object' || !('message' in error)) return null
  return String((error as { message: unknown }).message)
}

export default function KpiCard({ kpi, accent = 'from-blue-500 to-emerald-500', minHeight, onEdit }: Props) {
  const { text, comparison, color } = kpi
  const message = errorMessage(kpi.error)

  return (
    <div
      className="relative flex h-full flex-col overflow-hidden rounded-xl border border-slate-200 bg-white p-5 shadow-sm"
      style={minHeight ? { minHeight } : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-500">{kpi.title}</p>
        {onEdit && (
          <button
            onClick={onEdit}
            title="Edit card"
            className="grid h-6 w-6 shrink-0 place-items-center rounded-md border border-slate-200 text-slate-500 hover:border-blue-300 hover:text-blue-600"
          >
            <Pencil size={12} />
          </button>
        )}
      </div>

      {message ? (
        <p className="mt-2 flex items-start gap-1.5 text-xs leading-snug text-red-600">
          <AlertCircle size={13} className="mt-px shrink-0" />
          <span>{message}</span>
        </p>
      ) : (
        <>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-slate-900">{text}</p>
          {comparison.period && <p className="mt-1 text-xs text-slate-400">{comparison.period}</p>}
          {comparison.label && (
            <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-500">{comparison.deltaText}</span>
              <span className="text-slate-400">
                {comparison.label}
                {comparison.previousPeriod ? ` (${comparison.previousPeriod}` : ''}
                {comparison.previousText ? `: ${comparison.previousText}` : ''}
                {comparison.previousPeriod ? ')' : ''}
              </span>
            </div>
          )}
        </>
      )}

      {/* The Colours tab sets this; without one the card keeps its gradient. */}
      <div
        className={`absolute inset-x-0 bottom-0 h-1 ${color ? '' : `bg-gradient-to-r ${accent}`}`}
        style={color ? { backgroundColor: color } : undefined}
      />
    </div>
  )
}
