import * as React from "react"
import { ResponsiveContainer } from "recharts"

import { chartMapping } from "@/modules/data-analyst-agent/tools/chart/chart_mapping"
import { renderChartBody } from "@/modules/data-analyst-agent/tools/chart/chart-renderers"
import { resolveSeries, resolveXKey } from "@/modules/data-analyst-agent/tools/chart/chart-helpers"

export type ChartType = keyof typeof chartMapping

export type ChartSeries = {
  key: string
  label?: string
  color?: string
  variant?: "area" | "bar" | "line"
}

export type ChartProps<T extends Record<string, unknown>> = {
  type: ChartType
  data: T[]
  series?: ChartSeries[]
  xKey?: string
  nameKey?: string
  valueKey?: string
  height?: number
  className?: string
  animate?: boolean
}

export function Chart<T extends Record<string, unknown>>({
  type,
  data,
  series,
  xKey,
  nameKey = "name",
  valueKey: valueKeyProp,
  height = 300,
  className,
  animate = true,
}: ChartProps<T>) {
  const resolvedSeries = React.useMemo(
    () => resolveSeries(series, data),
    [series, data]
  )
  const valueKey = valueKeyProp ?? resolvedSeries[0]?.key ?? "value"
  const resolvedXKey = React.useMemo(
    () => resolveXKey(xKey, resolvedSeries, data),
    [xKey, resolvedSeries, data]
  )

  if (!data.length) return null

  return (
    <div className={className} style={{ width: "100%", height }}>
      <ResponsiveContainer width="100%" height="100%">
        {renderChartBody({
          type,
          data,
          series: resolvedSeries,
          xKey: resolvedXKey,
          nameKey,
          valueKey,
          animate,
        })}
      </ResponsiveContainer>
    </div>
  )
}

