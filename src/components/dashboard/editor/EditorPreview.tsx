import { AlertCircle, Loader2, RotateCw } from 'lucide-react'
import type {
  CardDefinition,
  CardKind,
  PreviewResult,
  RenderChart,
  HydratedKpi,
} from '@/types/dashboard'
import ChartRenderer from '@/components/dashboard/ChartRenderer'
import KpiCard from '@/components/dashboard/KpiCard'
import { CATEGORY_MAPPINGS } from '@/services/cardModel'

interface Props {
  kind: CardKind
  draft: CardDefinition
  preview: PreviewResult | null
  pending: boolean
  autoPreview: boolean
  onToggleAuto: (v: boolean) => void
  onRefresh: () => void
  onJumpToFields: () => void
}

function MappingBar({
  draft,
  kind,
  onJump,
}: {
  draft: CardDefinition
  kind: CardKind
  onJump: () => void
}) {
  const cols = draft.columns ?? []
  const category = cols.find((c) => CATEGORY_MAPPINGS.includes(c.mapping ?? ''))
  const series = cols.find((c) => c.mapping === 'SERIES')
  const values = cols.filter((c) => c.mapping === 'VALUE')
  const grain = draft.dateGrain

  const slots: Array<[string, string]> =
    kind === 'chart'
      ? [
          ['X axis', grain ? `${grain.column} · ${grain.dateTimeElement.toLowerCase()}` : category?.column || '—'],
          ['Y axis', values.length ? values.map((v) => `${v.aggregation ?? 'SUM'} of ${v.column}`).join(', ') : '—'],
          ['Series', series?.column || '—'],
        ]
      : [
          ['Value', values.length ? `${values[0].aggregation ?? 'SUM'} of ${values[0].column}` : '—'],
          ['Period', grain ? `${grain.column} · ${grain.dateTimeElement.toLowerCase()}` : '—'],
        ]

  return (
    <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-4 py-2.5">
      {slots.map(([label, value]) => (
        <button
          key={label}
          type="button"
          onClick={onJump}
          className="group flex min-w-0 items-center gap-2 rounded-md border border-slate-200 bg-white px-2.5 py-1.5 hover:border-blue-400"
        >
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</span>
          <span className="max-w-[200px] truncate text-[12px] font-medium text-slate-700 group-hover:text-blue-700">
            {value}
          </span>
        </button>
      ))}
    </div>
  )
}

export default function EditorPreview({
  kind,
  draft,
  preview,
  pending,
  autoPreview,
  onToggleAuto,
  onRefresh,
  onJumpToFields,
}: Props) {
  const failure = preview?.error || (preview?.visual as { error?: { message?: string } } | null)?.error
  const message = typeof failure === 'object' && failure && 'message' in failure ? String(failure.message) : null
  const rows = kind === 'chart' ? (preview?.visual as RenderChart)?.data?.length : undefined

  return (
    <section className="flex min-w-0 flex-1 flex-col bg-slate-50">
      <MappingBar draft={draft} kind={kind} onJump={onJumpToFields} />

      <div className="flex shrink-0 items-center justify-between gap-3 px-4 pt-3">
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">Preview</span>
          {pending && <Loader2 size={13} className="animate-spin text-blue-500" />}
          {!pending && rows !== undefined && !message && (
            <span className="text-[11px] tabular-nums text-slate-400">{rows} rows</span>
          )}
        </div>
        <div className="flex items-center gap-3">
          <label className="flex cursor-pointer items-center gap-1.5 text-[11px] text-slate-500">
            <input
              type="checkbox"
              checked={autoPreview}
              onChange={(e) => onToggleAuto(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
            />
            Auto
          </label>
          <button
            type="button"
            onClick={onRefresh}
            className="flex items-center gap-1.5 rounded-md border border-slate-300 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-blue-400 hover:text-blue-600"
          >
            <RotateCw size={12} />
            Refresh
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden p-4">
        {message ? (
          <div className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 p-3.5">
            <AlertCircle size={16} className="mt-px shrink-0 text-red-500" />
            <div className="min-w-0">
              <p className="text-[12px] font-semibold text-red-800">This card cannot be rendered</p>
              <p className="mt-1 text-[12px] leading-relaxed text-red-700">{message}</p>
            </div>
          </div>
        ) : !preview ? (
          <div className="grid h-full place-items-center rounded-lg border border-dashed border-slate-300 text-[12px] text-slate-400">
            {autoPreview ? 'Loading' : 'Press Refresh to preview'}
          </div>
        ) : kind === 'chart' ? (
          <div className="h-full overflow-y-auto">
            <ChartRenderer spec={preview.visual as RenderChart} />
          </div>
        ) : (
          <div className="max-w-xs">
            <KpiCard kpi={preview.visual as HydratedKpi} minHeight={130} />
          </div>
        )}
      </div>
    </section>
  )
}
