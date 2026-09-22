import type { ReactNode } from "react"
import { createColumnHelper } from "@tanstack/react-table"
import { Bell, ListChecks } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { Button } from "@/modules/data-analyst-agent/ui/button"
import { useAppDispatch, useAgentUserId } from "@/modules/data-analyst-agent/state/hooks"
import { addActionTrackerItem } from "@/modules/data-analyst-agent/state/slices/actionTrackerSlice"
import { KpiCard, type KpiCardProps } from "@/modules/data-analyst-agent/tools/kpi"
import { DataTable, type GenericTableFeatures } from "@/modules/data-analyst-agent/tools/table"
import { Chart, type ChartSeries, type ChartType } from "@/modules/data-analyst-agent/tools/chart/chart"
import { Report, type ReportProps } from "@/modules/data-analyst-agent/tools/report"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import { InsightList } from "@/modules/data-analyst-agent/tools/insight-card"
import { FindingList } from "@/modules/data-analyst-agent/tools/finding-card"
import {
  parseRowMetadata,
  rowsHaveMetadata,
  TableActionsCell,
} from "@/modules/data-analyst-agent/tools/table-actions-cell"

export type ToolTableColumn = {
  accessor_key: string
  header: string
}

export type ToolTable = {
  table_name: string
  columns: ToolTableColumn[]
  rows: Record<string, unknown>[]
}

export type ToolChartSeriesSpec = {
  dataKey: string
  fill?: string
  stroke?: string
  name?: string
}

export type ToolChart = {
  chart_name: string
  chart_type: ChartType
  chart_props: {
    data: Record<string, unknown>[] | Record<string, unknown>
    dataKey?: string
    nameKey?: string
    xAxis?: { dataKey?: string }
    yAxis?: { dataKey?: string }
    bars?: ToolChartSeriesSpec[]
    lines?: ToolChartSeriesSpec[]
    areas?: ToolChartSeriesSpec[]
  }
}

export type ToolKpiMetrics = {
  delta?: string | number
  trend?: "up" | "down" | string
  scope?: string
}

export type ToolKpi = {
  kpi_name: string
  kpi_value: string | number
  kpi_description?: string
  kpi_metrics?: ToolKpiMetrics
}

export type ToolActionType = "alert"

export type ToolAction = {
  action_label: string
  action_type: ToolActionType
}

export type ToolInsightPoint = {
  title: string
  detail: string
}

export type ToolInsight = {
  title: string
  reason: string
  points?: ToolInsightPoint[]
}

export type ToolFindingStat = {
  stat_label: string
  stat_value: string | number
  stat_trend?: "up" | "down" | "flat"
  stat_delta?: string
}

export type ToolFinding = {
  finding_title: string
  stats?: ToolFindingStat[]
  summary: string
  reason?: string
  points?: ToolInsightPoint[]
}

export type ToolEngineData = {
  kpi?: ToolKpi[]
  table?: ToolTable[]
  chart?: ToolChart[]
  report?: ReportProps[]
  action?: ToolAction[]
  insight?: ToolInsight[]
  finding?: ToolFinding[]
  text_data?: string
}

function hasRenderableContent(data: ToolEngineData): boolean {
  return (
    Boolean(data.kpi?.length) ||
    Boolean(data.table?.length) ||
    Boolean(data.chart?.length) ||
    Boolean(data.report?.length) ||
    Boolean(data.action?.length) ||
    Boolean(data.insight?.length) ||
    Boolean(data.finding?.length) ||
    Boolean(data.text_data?.trim())
  )
}

function dedupeActions(actions: ToolAction[] | undefined): ToolAction[] | undefined {
  if (!actions || actions.length === 0) return actions
  const seen = new Set<string>()
  const deduped: ToolAction[] = []
  for (const action of actions) {
    if (seen.has(action.action_label)) continue
    seen.add(action.action_label)
    deduped.push(action)
  }
  return deduped
}

export function parseToolEngineData(text: string): ToolEngineData | null {
  try {
    const data = JSON.parse(text) as ToolEngineData
    if (!hasRenderableContent(data)) return null
    return { ...data, action: dedupeActions(data.action) }
  } catch {
    return null
  }
}

export function buildChartSeries(
  chartProps: ToolChart["chart_props"]
): ChartSeries[] | undefined {
  const specs = chartProps.bars ?? chartProps.lines ?? chartProps.areas
  if (!specs?.length) return undefined

  return specs.map((spec) => ({
    key: spec.dataKey,
    label: spec.name,
    color: spec.fill ?? spec.stroke,
  }))
}

export function normalizeChartData(
  data: ToolChart["chart_props"]["data"]
): Record<string, unknown>[] {
  return Array.isArray(data) ? data : [data]
}

const KPI_JARGON_PATTERN = /\b(distinct|aggregate(?:d)?|normalized to|grouped? by)\b\s*/gi

function sanitizeKpiDescription(description: string | undefined): string | undefined {
  if (!description) return description
  const cleaned = description.replace(KPI_JARGON_PATTERN, "").replace(/\s{2,}/g, " ").trim()
  if (!cleaned) return description
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
}

export function mapKpiToCardProps(kpi: ToolKpi): KpiCardProps {
  const metrics = kpi.kpi_metrics
  let metric: string | undefined

  if (metrics?.delta !== undefined && metrics?.delta !== null && metrics.delta !== "") {
    const deltaText = String(metrics.delta)
    const isSigned = deltaText.startsWith("+") || deltaText.startsWith("-")
    const sign = isSigned ? "" : metrics.trend === "down" ? "-" : "+"
    metric = `${sign}${deltaText}`
  }

  return {
    Kpi_Name: kpi.kpi_name,
    Kpi_Value: kpi.kpi_value,
    Kpi_Desc: sanitizeKpiDescription(kpi.kpi_description),
    Kpi_Metric: metric,
  }
}

const columnHelper = createColumnHelper<GenericTableFeatures, Record<string, unknown>>()

const MARKDOWN_LINK_RE = /^\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)$/
const BARE_URL_RE = /^https?:\/\/\S+$/

function renderCellValue(value: unknown): ReactNode {
  if (value === null || value === undefined) return ""
  const text = String(value)

  const markdownMatch = text.match(MARKDOWN_LINK_RE)
  if (markdownMatch) {
    const [, label, url] = markdownMatch
    return (
      <a
        href={url}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-link underline underline-offset-2"
      >
        {label}
      </a>
    )
  }

  if (BARE_URL_RE.test(text)) {
    return (
      <a
        href={text}
        target="_blank"
        rel="noreferrer"
        className="font-medium text-link underline underline-offset-2"
      >
        {text}
      </a>
    )
  }

  return text
}

function buildTableColumns(
  columns: ToolTableColumn[],
  rows: Record<string, unknown>[],
  tableName: string
) {
  const dataColumns = columns.map((column) =>
    columnHelper.accessor(column.accessor_key, {
      header: column.header,
      cell: (info) => renderCellValue(info.getValue()),
    })
  )

  if (!rowsHaveMetadata(rows)) return dataColumns

  return [
    ...dataColumns,
    columnHelper.display({
      id: "actions",
      header: "Actions",
      cell: (info) => (
        <TableActionsCell
          metadata={parseRowMetadata(info.row.original.metadata)}
          title={tableName}
        />
      ),
    }),
  ]
}

export type ToolEngineProps = {
  data: ToolEngineData
  sessionId?: string
}

export function ToolEngine({ data, sessionId }: ToolEngineProps) {
  const dispatch = useAppDispatch()
  const userId = useAgentUserId()

  if (!hasRenderableContent(data)) return null

  return (
    <div className="flex w-full flex-col gap-4">
      {Boolean(data.kpi?.length) && (
        <div
          className={cn(
            "grid gap-3",
            data.kpi!.length === 1 && "grid-cols-1",
            data.kpi!.length === 2 && "grid-cols-2",
            data.kpi!.length >= 3 && "grid-cols-2 sm:grid-cols-3"
          )}
        >
          {data.kpi!.map((kpi, index) => (
            <KpiCard
              key={`${kpi.kpi_name}-${index}`}
              {...mapKpiToCardProps(kpi)}
              index={index}
              large={data.kpi!.length === 1}
            />
          ))}
        </div>
      )}

      {data.chart?.map((chart, index) => (
        <div
          key={`${chart.chart_name}-${index}`}
          className="rounded-xl border bg-transparent p-4"
        >
          <p className="mb-3 text-sm font-semibold text-card-foreground">
            {chart.chart_name}
          </p>
          <Chart
            type={chart.chart_type}
            data={normalizeChartData(chart.chart_props.data)}
            series={buildChartSeries(chart.chart_props)}
            nameKey={chart.chart_props.nameKey}
            valueKey={chart.chart_props.dataKey}
            xKey={
              chart.chart_props.xAxis?.dataKey ??
              chart.chart_props.yAxis?.dataKey
            }
          />
        </div>
      ))}

      {Boolean(data.finding?.length) && <FindingList findings={data.finding!} />}

      {data.table?.map((table, index) => (
        <div
          key={`${table.table_name}-${index}`}
          className="rounded-xl border bg-transparent p-4"
        >
          <DataTable
            title={table.table_name}
            columns={buildTableColumns(table.columns, table.rows, table.table_name)}
            rows={table.rows}
            exportFileName={table.table_name}
          />
        </div>
      ))}

      {data.report?.map((report, index) => (
        <div
          key={`report-${index}`}
          className={cn("w-full min-w-0", !data.action?.length && "max-w-[75%]")}
        >
          <Report {...report} />
        </div>
      ))}

      {data.text_data?.trim() && <MarkdownText text={data.text_data} />}

      {Boolean(data.insight?.length) && <InsightList insights={data.insight!} />}

      {Boolean(data.action?.length) && (
        <div className="flex flex-wrap gap-2">
          {data.action!.map((action, index) => {
            const isNotify = action.action_label === "Notify"

            return (
              <Button
                key={`${action.action_label}-${index}`}
                type="button"
                size="sm"
                variant={isNotify ? "secondary" : "default"}
                className="cursor-pointer gap-1.5"
                onClick={() => {
                  if (isNotify) {
                    toast("Coming soon")
                    return
                  }

                  dispatch(addActionTrackerItem({ action, sessionId, userId }))
                    .unwrap()
                    .then(() => {
                      toast.success("Added to action tracker")
                    })
                    .catch((error) => {
                      console.error("[ToolEngine] failed to track action", error)
                      toast.error("Couldn't add to action tracker")
                    })
                }}
              >
                {isNotify ? (
                  <Bell className="size-3.5" />
                ) : (
                  <ListChecks className="size-3.5" />
                )}
                {action.action_label}
              </Button>
            )
          })}
        </div>
      )}
    </div>
  )
}
