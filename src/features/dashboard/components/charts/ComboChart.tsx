import {
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { RenderChart, RenderSeries } from '../../types/dashboard'
import SeriesTooltip from './SeriesTooltip'
import { tickLabels } from './axisTicks'

interface Props {
  spec: RenderChart
}

export default function ComboChart({ spec }: Props) {
  const dual = !!spec.axes.y2
  const xKey = spec.axes.x?.key || 'label'
  const bars = spec.series.filter((s) => s.kind === 'bar')
  const lines = spec.series.filter((s) => s.kind === 'line')
  const y1 = tickLabels(spec.axes.y?.ticks)
  const y2 = tickLabels(spec.axes.y2?.ticks)

  const renderSeries = (s: RenderSeries, isBar: boolean) =>
    isBar ? (
      <Bar
        key={s.key}
        yAxisId="y1"
        dataKey={s.key}
        name={s.name}
        fill={s.color}
        radius={[4, 4, 0, 0]}
      />
    ) : (
      <Line
        key={s.key}
        yAxisId="y2"
        type="monotone"
        dataKey={s.key}
        name={s.name}
        stroke={s.color}
        strokeWidth={2}
        dot={{ r: 3 }}
      />
    )

  return (
    <ResponsiveContainer width="100%" height="100%">
      <ComposedChart data={spec.data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
        <XAxis dataKey={xKey} tick={{ fontSize: 12 }} />
        <YAxis yAxisId="y1" tick={{ fontSize: 12 }} ticks={y1?.values} tickFormatter={y1?.format} />
        {dual && (
          <YAxis
            yAxisId="y2"
            orientation="right"
            tick={{ fontSize: 12 }}
            ticks={y2?.values}
            tickFormatter={y2?.format}
          />
        )}
        <Tooltip content={<SeriesTooltip />} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        {bars.map((s) => renderSeries(s, true))}
        {lines.map((s) => renderSeries(s, false))}
      </ComposedChart>
    </ResponsiveContainer>
  )
}