import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RenderChart } from '../../types/dashboard'
import SeriesTooltip from './SeriesTooltip'
import { tickLabels } from './axisTicks'

interface Props {
  spec: RenderChart
}

export default function AreaChartCard({ spec }: Props) {
  const options = spec.options || {}
  const xKey = spec.axes.x?.key || 'label'
  const id = spec.id
  const data = spec.data
  const series = spec.series.filter((s) => s.kind === 'area')

  const keys = series.map((s) => s.key)
  const y = tickLabels(spec.axes.y?.ticks)

  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <defs>
          {keys.map((k) => {
            const s = series.find((x) => x.key === k)!
            return (
              <linearGradient key={k} id={`${id}-${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={s.color} stopOpacity={0.5} />
                <stop offset="100%" stopColor={s.color} stopOpacity={0.05} />
              </linearGradient>
            )
          })}
        </defs>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis tick={{ fontSize: 12 }} ticks={y?.values} tickFormatter={y?.format} />
        <Tooltip content={<SeriesTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {series.map((s) => (
          <Area
            key={s.key}
            type="monotone"
            dataKey={s.key}
            name={s.name}
            stackId={s.stackId}
            stroke={s.color}
            fill={options.gradient ? `url(#${id}-${s.key})` : s.color}
            fillOpacity={options.gradient ? 1 : s.fillOpacity}
          />
        ))}
      </AreaChart>
    </ResponsiveContainer>
  )
}