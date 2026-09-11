import { Treemap, ResponsiveContainer, Tooltip } from 'recharts'
import type { RenderChart } from '../../types/dashboard'

interface Props {
  spec: RenderChart
}

const PALETTE = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16']

const CustomTooltip = ({ active, payload }: { active?: boolean; payload?: Array<{ name: string; value: number; payload?: { fill?: string } }> }) => {
  if (!active || !payload?.length) return null
  const d = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-500">{d.name}</p>
      <p className="text-sm font-semibold text-slate-900">{d.value.toLocaleString('en-US')}</p>
    </div>
  )
}

const CustomContent = (props: {
  x: number
  y: number
  width: number
  height: number
  name: string
  value: number
  fill?: string
  index: number
}) => {
  const { x, y, width, height, name, fill } = props
  if (width < 40 || height < 24) return null
  return (
    <g>
      <rect x={x} y={y} width={width} height={height} fill={fill} rx={4} stroke="#fff" strokeWidth={2} />
      {width > 60 && height > 30 && (
        <>
          <text x={x + 8} y={y + 18} fill="#fff" fontSize={12} fontWeight={600}>
            {name.length > Math.floor(width / 8) ? name.slice(0, Math.floor(width / 8)) + '…' : name}
          </text>
          <text x={x + 8} y={y + 34} fill="rgba(255,255,255,0.8)" fontSize={11}>
            {props.value?.toLocaleString('en-US')}
          </text>
        </>
      )}
    </g>
  )
}

export default function TreemapChartCard({ spec }: Props) {
  const data = (spec.data as unknown as Array<{ name: string; value: number; fill?: string }>) || []
  const colorMap = (spec.options as Record<string, unknown>)?.colorMap as Record<string, string> | undefined

  const colored = data.map((d, i) => ({
    ...d,
    fill: colorMap?.[d.name] || d.fill || PALETTE[i % PALETTE.length],
  }))

  return (
    <div className="flex h-full flex-col">
      <ResponsiveContainer width="100%" height="100%">
        <Treemap
          data={colored}
          dataKey="value"
          aspectRatio={4 / 3}
          content={<CustomContent x={0} y={0} width={0} height={0} name="" value={0} index={0} />}
        >
          <Tooltip content={<CustomTooltip />} />
        </Treemap>
      </ResponsiveContainer>
    </div>
  )
}