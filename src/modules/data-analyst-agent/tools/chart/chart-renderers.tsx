import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ComposedChart,
  Funnel,
  FunnelChart,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  PolarAngleAxis,
  PolarGrid,
  PolarRadiusAxis,
  Radar,
  RadarChart,
  RadialBar,
  RadialBarChart,
  Sankey,
  Scatter,
  ScatterChart,
  SunburstChart,
  Tooltip,
  Treemap,
  XAxis,
  YAxis,
  type SankeyData,
  type SunburstData,
} from "recharts"

import type { ChartSeries, ChartType } from "@/modules/data-analyst-agent/tools/chart/chart"
import {
  applySunburstColors,
  AXIS_STYLE,
  CategoryLegend,
  computeSunburstValues,
  DEFAULT_COLORS,
  LEGEND_STYLE,
  TOOLTIP_STYLE,
} from "@/modules/data-analyst-agent/tools/chart/chart-helpers"

export function renderChartBody<T extends Record<string, unknown>>({
  type,
  data,
  series,
  xKey,
  nameKey,
  valueKey,
  animate,
}: {
  type: ChartType
  data: T[]
  series: ChartSeries[]
  xKey?: string
  nameKey: string
  valueKey: string
  animate: boolean
}) {
  switch (type) {
    case "area":
      return (
        <AreaChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {xKey && <XAxis dataKey={xKey} {...AXIS_STYLE} />}
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {series.map((s) => (
            <Area
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.2}
              isAnimationActive={animate}
            />
          ))}
        </AreaChart>
      )

    case "bar":
      return (
        <BarChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {xKey && <XAxis dataKey={xKey} {...AXIS_STYLE} />}
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ fill: "var(--muted)" }} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {series.map((s) => (
            <Bar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              fill={s.color}
              radius={[4, 4, 0, 0]}
              isAnimationActive={animate}
            />
          ))}
        </BarChart>
      )

    case "line":
      return (
        <LineChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {xKey && <XAxis dataKey={xKey} {...AXIS_STYLE} />}
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {series.map((s) => (
            <Line
              key={s.key}
              type="monotone"
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.color}
              strokeWidth={2}
              dot={false}
              isAnimationActive={animate}
            />
          ))}
        </LineChart>
      )

    case "composed":
      return (
        <ComposedChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {xKey && <XAxis dataKey={xKey} {...AXIS_STYLE} />}
          <YAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {series.map((s) => {
            const name = s.label ?? s.key
            if (s.variant === "bar") {
              return (
                <Bar
                  key={s.key}
                  dataKey={s.key}
                  name={name}
                  fill={s.color}
                  radius={[4, 4, 0, 0]}
                  isAnimationActive={animate}
                />
              )
            }
            if (s.variant === "area") {
              return (
                <Area
                  key={s.key}
                  type="monotone"
                  dataKey={s.key}
                  name={name}
                  stroke={s.color}
                  fill={s.color}
                  fillOpacity={0.2}
                  isAnimationActive={animate}
                />
              )
            }
            return (
              <Line
                key={s.key}
                type="monotone"
                dataKey={s.key}
                name={name}
                stroke={s.color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={animate}
              />
            )
          })}
        </ComposedChart>
      )

    case "scatter":
      return (
        <ScatterChart data={data}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
          {xKey && <XAxis dataKey={xKey} type="number" {...AXIS_STYLE} />}
          <YAxis type="number" {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} cursor={{ strokeDasharray: "3 3" }} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {series.map((s) => (
            <Scatter
              key={s.key}
              name={s.label ?? s.key}
              data={data}
              dataKey={s.key}
              fill={s.color}
              isAnimationActive={animate}
            />
          ))}
        </ScatterChart>
      )

    case "radar":
      return (
        <RadarChart data={data}>
          <PolarGrid stroke="var(--border)" />
          {xKey && <PolarAngleAxis dataKey={xKey} {...AXIS_STYLE} />}
          <PolarRadiusAxis {...AXIS_STYLE} />
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          {series.length > 1 && <Legend wrapperStyle={LEGEND_STYLE} />}
          {series.map((s) => (
            <Radar
              key={s.key}
              dataKey={s.key}
              name={s.label ?? s.key}
              stroke={s.color}
              fill={s.color}
              fillOpacity={0.3}
              isAnimationActive={animate}
            />
          ))}
        </RadarChart>
      )

    case "radialBar":
      return (
        <RadialBarChart data={data} innerRadius="20%" outerRadius="90%">
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <CategoryLegend data={data} nameKey={nameKey} />
          <RadialBar
            dataKey={valueKey}
            background
            cornerRadius={4}
            isAnimationActive={animate}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </RadialBar>
        </RadialBarChart>
      )

    case "pie":
      return (
        <PieChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <CategoryLegend data={data} nameKey={nameKey} />
          <Pie
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            label
            isAnimationActive={animate}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Pie>
        </PieChart>
      )

    case "funnel":
      return (
        <FunnelChart>
          <Tooltip contentStyle={TOOLTIP_STYLE} />
          <CategoryLegend data={data} nameKey={nameKey} />
          <Funnel
            data={data}
            dataKey={valueKey}
            nameKey={nameKey}
            isAnimationActive={animate}
          >
            {data.map((_, index) => (
              <Cell
                key={`cell-${index}`}
                fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
              />
            ))}
          </Funnel>
        </FunnelChart>
      )

    case "treemap":
      return (
        <Treemap
          data={data}
          dataKey={valueKey}
          nameKey={nameKey}
          stroke="var(--background)"
          fill="var(--chart-1)"
          isAnimationActive={animate}
        >
          {data.map((_, index) => (
            <Cell
              key={`cell-${index}`}
              fill={DEFAULT_COLORS[index % DEFAULT_COLORS.length]}
            />
          ))}
        </Treemap>
      )

    case "sankey": {
      const graph = data[0] as unknown as SankeyData | undefined
      if (!graph) return <></>
      return (
        <Sankey
          data={graph}
          nodePadding={24}
          margin={{ left: 16, right: 16, top: 16, bottom: 16 }}
          link={{ stroke: "var(--border)" }}
          node={{ fill: "var(--chart-1)" }}
        />
      )
    }

    case "sunburst": {
      const graph = data[0] as unknown as SunburstData | undefined
      if (!graph) return <></>
      return (
        <SunburstChart
          data={applySunburstColors(computeSunburstValues(graph))}
          dataKey={valueKey}
          nameKey={nameKey}
          stroke="var(--background)"
        >
          <Tooltip contentStyle={TOOLTIP_STYLE} />
        </SunburstChart>
      )
    }

    default:
      return <></>
  }
}
