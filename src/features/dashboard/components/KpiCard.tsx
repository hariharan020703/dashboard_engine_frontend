interface Props {
  kpi: {
    id: string
    title: string
    value: number
    text: string
    comparison: {
      label: string
      delta: number
      deltaText: string
      previousText?: string
      period?: string
      previousPeriod?: string
    }
  }
  accent?: string
  minHeight?: number
  onEdit?: () => void
}

export default function KpiCard({ kpi, accent = 'from-blue-500 to-emerald-500', minHeight, onEdit }: Props) {
  const { text, comparison } = kpi

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
            className="shrink-0 rounded-md border border-slate-200 px-2 py-0.5 text-xs text-slate-500 hover:border-blue-300 hover:text-blue-600"
          >
            ✎
          </button>
        )}
      </div>
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
      <div className={`absolute inset-x-0 bottom-0 h-1 bg-gradient-to-r ${accent}`} />
    </div>
  )
}