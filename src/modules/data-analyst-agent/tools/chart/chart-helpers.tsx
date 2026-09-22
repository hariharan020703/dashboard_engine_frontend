import { DefaultLegendContent, Legend } from "recharts"
import type { SunburstData } from "recharts"

import type { ChartSeries } from "@/modules/data-analyst-agent/tools/chart/chart"

export const DEFAULT_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
]

export const AXIS_STYLE = { stroke: "var(--muted-foreground)", fontSize: 12 }
export const TOOLTIP_STYLE = {
  background: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius-md)",
  color: "var(--popover-foreground)",
  fontSize: 12,
}
export const LEGEND_STYLE = { fontSize: 12, color: "var(--muted-foreground)" }

export function computeSunburstValues(node: SunburstData): SunburstData {
  if (!node.children?.length) return node

  const children = node.children.map(computeSunburstValues)
  const value = children.reduce((sum, child) => sum + (child.value ?? 0), 0)

  return { ...node, children, value }
}

function colorizeSunburstBranch(node: SunburstData, color: string): SunburstData {
  const children = node.children?.map((child) =>
    colorizeSunburstBranch(child, color)
  )
  return { ...node, fill: node.fill ?? color, children }
}

export function applySunburstColors(node: SunburstData): SunburstData {
  const children = node.children?.map((child, index) =>
    colorizeSunburstBranch(child, DEFAULT_COLORS[index % DEFAULT_COLORS.length])
  )
  return { ...node, children }
}

export function resolveSeries(
  series: ChartSeries[] | undefined,
  data: Record<string, unknown>[]
): ChartSeries[] {
  if (series?.length) return series

  const sample = data[0] ?? {}
  return Object.keys(sample)
    .filter((key) => typeof sample[key] === "number")
    .map((key, index) => ({
      key,
      color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
    }))
}

export function resolveXKey(
  xKey: string | undefined,
  series: ChartSeries[],
  data: Record<string, unknown>[]
): string | undefined {
  if (xKey) return xKey

  const sample = data[0] ?? {}
  const seriesKeys = new Set(series.map((s) => s.key))
  return Object.keys(sample).find(
    (key) => !seriesKeys.has(key) && typeof sample[key] !== "object"
  )
}

function buildCategoryLegendPayload(
  data: Record<string, unknown>[],
  nameKey: string
) {
  return data.map((d, index) => ({
    value: String(d[nameKey] ?? index),
    type: "circle" as const,
    color: DEFAULT_COLORS[index % DEFAULT_COLORS.length],
  }))
}

export function CategoryLegend({
  data,
  nameKey,
}: {
  data: Record<string, unknown>[]
  nameKey: string
}) {
  return (
    <Legend
      wrapperStyle={LEGEND_STYLE}
      content={(props) => (
        <DefaultLegendContent
          {...props}
          payload={buildCategoryLegendPayload(data, nameKey)}
        />
      )}
    />
  )
}
