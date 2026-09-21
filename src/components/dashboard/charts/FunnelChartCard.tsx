import { useState } from 'react'
import { FunnelChart, Funnel, LabelList, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { RenderChart } from '@/types/dashboard'
import PointTooltip from './PointTooltip'

interface Props {
  spec: RenderChart
}

interface Segment {
  name: string
  value: number
  valueText?: string
  shareText?: string
  fill?: string
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const DEFAULT_SEGMENTS = 5
const MAX_SEGMENTS = 10

export default function FunnelChartCard({ spec }: Props) {
  const [hover, setHover] = useState<number | null>(null)

  const data = (spec.data as unknown as Segment[]) || []
  const options = (spec.options ?? {}) as Record<string, unknown>
  const colorMap = options.colorMap as Record<string, string> | undefined

  // Metadata-driven, clamped so the funnel can never become unreadable again.
  const requested = Number(options.funnelSegments ?? DEFAULT_SEGMENTS)
  const segmentCount = Math.min(
    MAX_SEGMENTS,
    Math.max(1, Number.isFinite(requested) ? requested : DEFAULT_SEGMENTS)
  )

  const colorFor = (name: string, i: number) => colorMap?.[name] || PALETTE[i % PALETTE.length]

  // spec.data arrives sorted by the card's order, so the first N are the top N.
  const drawn = data.slice(0, segmentCount).map((d, i) => ({ ...d, fill: colorFor(d.name, i) }))
  // Only used for the relative bar width; every displayed string comes from the API.
  const max = data.length ? Math.max(...data.map((d) => d.value)) : 0

  return (
    <div className="flex h-full gap-3">
      <div className="flex min-w-0 flex-1 flex-col">
        <ResponsiveContainer width="100%" height="100%">
          <FunnelChart data={drawn} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
            <Tooltip content={<PointTooltip />} />
            <Funnel dataKey="value" nameKey="name" isAnimationActive lastShapeType="triangle">
              {drawn.map((entry, i) => (
                <Cell
                  key={entry.name ?? i}
                  fill={entry.fill}
                  fillOpacity={hover === null || hover === i ? 1 : 0.3}
                />
              ))}
              <LabelList
                position="center"
                fill="#fff"
                fontSize={12}
                fontWeight={600}
                stroke="none"
                dataKey="valueText"
              />
            </Funnel>
          </FunnelChart>
        </ResponsiveContainer>
        {data.length > segmentCount && (
          <p className="shrink-0 pt-1 text-center text-[11px] text-slate-400">
            Top {segmentCount} of {data.length}
          </p>
        )}
      </div>

      <div className="flex w-[196px] shrink-0 flex-col rounded-lg border border-slate-200 bg-slate-50/60">
        <div className="flex shrink-0 items-baseline justify-between gap-2 border-b border-slate-200 px-2.5 py-1.5">
          <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
            All values
          </span>
          <span className="text-[10px] tabular-nums text-slate-400">{data.length}</span>
        </div>
        <ul className="min-h-0 flex-1 overflow-y-auto py-1">
          {data.map((d, i) => {
            const inFunnel = i < segmentCount
            const active = hover === i
            return (
              <li key={d.name ?? i}>
                <div
                  onMouseEnter={() => inFunnel && setHover(i)}
                  onMouseLeave={() => inFunnel && setHover(null)}
                  className={`px-2.5 py-1 ${inFunnel ? 'cursor-default' : ''} ${
                    active ? 'bg-blue-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-1.5">
                    <span className="w-4 shrink-0 text-right text-[10px] tabular-nums text-slate-400">
                      {i + 1}
                    </span>
                    <span
                      className="h-2 w-2 shrink-0 rounded-sm"
                      style={{
                        backgroundColor: inFunnel ? colorFor(d.name, i) : '#cbd5e1',
                      }}
                    />
                    <span
                      className="min-w-0 flex-1 truncate text-[11px] text-slate-700"
                      title={`${d.name} — ${d.valueText ?? ''}`}
                    >
                      {d.name}
                    </span>
                    <span className="shrink-0 text-[11px] font-medium tabular-nums text-slate-600">
                      {d.valueText ?? ''}
                    </span>
                  </div>
                  <div className="ml-[30px] mt-0.5 flex items-center gap-1.5">
                    <span className="h-1 flex-1 overflow-hidden rounded-full bg-slate-200">
                      <span
                        className="block h-full rounded-full"
                        style={{
                          width: max ? `${(d.value / max) * 100}%` : '0%',
                          backgroundColor: inFunnel ? colorFor(d.name, i) : '#94a3b8',
                        }}
                      />
                    </span>
                    <span className="w-9 shrink-0 text-right text-[9px] tabular-nums text-slate-400">
                      {d.shareText ?? ''}
                    </span>
                  </div>
                </div>
              </li>
            )
          })}
          {!data.length && <li className="px-2.5 py-2 text-[11px] text-slate-400">No data</li>}
        </ul>
      </div>
    </div>
  )
}
