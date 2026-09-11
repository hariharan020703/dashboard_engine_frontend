import { FunnelChart, Funnel, LabelList, Tooltip, Cell, ResponsiveContainer } from 'recharts'
import type { RenderChart } from '../../types/dashboard'

interface Props {
  spec: RenderChart
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number }> }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-500">{d.name}</p>
      <p className="text-sm font-semibold text-slate-900">{d.value.toLocaleString('en-US')}</p>
    </div>
  )
}

export default function FunnelChartCard({ spec }: Props) {
  const data = (spec.data as unknown as Array<{ name: string; value: number; fill?: string }>) || []
  const colorMap = (spec.options as Record<string, unknown>)?.colorMap as Record<string, string> | undefined

  const colored = data.map((d, i) => ({
    ...d,
    fill: colorMap?.[d.name] || d.fill || PALETTE[i % PALETTE.length],
  }))

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <FunnelChart data={colored}>
          <Tooltip content={<CustomTooltip />} />
          <Funnel dataKey="value" nameKey="name" isAnimationActive lastShapeType="triangle">
            {colored.map((entry, i) => (
              <Cell key={entry.name ?? i} fill={entry.fill} />
            ))}
            <LabelList position="right" fill="#334155" fontSize={12} stroke="none" dataKey="name" />
            <LabelList
              position="center"
              fill="#fff"
              fontSize={12}
              fontWeight={600}
              stroke="none"
              dataKey="value"
              formatter={(v) => Number(v).toLocaleString('en-US')}
            />
          </Funnel>
        </FunnelChart>
      </ResponsiveContainer>
    </div>
  )
}