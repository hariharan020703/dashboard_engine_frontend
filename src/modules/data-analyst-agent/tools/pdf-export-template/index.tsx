import type { CSSProperties } from "react"
import { createRoot } from "react-dom/client"

import { exportElementsAsPdf } from "@/modules/data-analyst-agent/lib/export-pdf"
import { slugifyFilename } from "@/modules/data-analyst-agent/lib/export-table"
import { KpiCard } from "@/modules/data-analyst-agent/tools/kpi"
import { Chart } from "@/modules/data-analyst-agent/tools/chart/chart"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import {
  buildChartSeries,
  mapKpiToCardProps,
  normalizeChartData,
  type ToolEngineData,
  type ToolTable,
} from "@/modules/data-analyst-agent/tools/tool_engine"

const blockStyle: CSSProperties = {
  width: 800,
  boxSizing: "border-box",
  padding: "0 24px",
  background: "#ffffff",
  color: "#000000",
  fontFamily: "sans-serif",
}

const sectionHeadingStyle: CSSProperties = {
  fontSize: 14,
  fontWeight: 700,
  marginBottom: 12,
  paddingBottom: 6,
  borderBottom: "1px solid #dddddd",
  color: "#000000",
}

function PrintTable({ table }: { table: ToolTable }) {
  return (
    <div style={blockStyle}>
      <p style={{ fontSize: 12, fontWeight: 600, marginBottom: 8, color: "#000000" }}>
        {table.table_name}
      </p>
      <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 10 }}>
        <thead>
          <tr>
            {table.columns.map((column) => (
              <th
                key={column.accessor_key}
                style={{
                  border: "1px solid #dddddd",
                  padding: "5px 7px",
                  textAlign: "left",
                  background: "#f5f5f5",
                  color: "#000000",
                }}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {table.rows.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {table.columns.map((column) => (
                <td
                  key={column.accessor_key}
                  style={{ border: "1px solid #dddddd", padding: "5px 7px", color: "#000000" }}
                >
                  {String(row[column.accessor_key] ?? "")}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export type PdfExportTemplateProps = {
  data: ToolEngineData
  title?: string
}

export function PdfExportTemplate({ data, title }: PdfExportTemplateProps) {
  return (
    <>
      {title && (
        <div style={blockStyle}>
          <h1 style={{ fontSize: 20, fontWeight: 700, color: "#000000" }}>{title}</h1>
        </div>
      )}
      {Boolean(data.kpi?.length) && (
        <div style={blockStyle}>
          <p style={sectionHeadingStyle}>Key Metrics</p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12 }}>
            {data.kpi!.map((kpi, index) => (
              <KpiCard
                key={index}
                {...mapKpiToCardProps(kpi)}
                colored={false}
                className="border border-neutral-300 shadow-none"
              />
            ))}
          </div>
        </div>
      )}
      {data.chart?.map((chart, index) => (
        <div key={index} style={blockStyle}>
          {index === 0 && <p style={sectionHeadingStyle}>Charts</p>}
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16 }}>
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 12, color: "#000000" }}>
              {chart.chart_name}
            </p>
            <Chart
              type={chart.chart_type}
              data={normalizeChartData(chart.chart_props.data)}
              series={buildChartSeries(chart.chart_props)}
              nameKey={chart.chart_props.nameKey}
              valueKey={chart.chart_props.dataKey}
              xKey={chart.chart_props.xAxis?.dataKey ?? chart.chart_props.yAxis?.dataKey}
              animate={false}
            />
          </div>
        </div>
      ))}
      {data.finding?.map((finding, index) => (
        <div key={`finding-${index}`} style={blockStyle}>
          {index === 0 && <p style={sectionHeadingStyle}>Priority Insights</p>}
          <div style={{ border: "1px solid #e5e5e5", borderRadius: 8, padding: 16, marginBottom: 12 }}>
            <p style={{ fontSize: 14, fontWeight: 700, marginBottom: 8, color: "#000000" }}>
              {finding.finding_title}
            </p>
            {Boolean(finding.stats?.length) && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                {finding.stats!.map((stat, statIndex) => (
                  <div
                    key={statIndex}
                    style={{
                      border: "1px solid #e5e5e5",
                      borderRadius: 6,
                      padding: "6px 10px",
                      minWidth: 100,
                    }}
                  >
                    <p style={{ fontSize: 8.5, color: "#52606d", marginBottom: 2 }}>
                      {stat.stat_label}
                    </p>
                    <p style={{ fontSize: 16, fontWeight: 700, color: "#000000" }}>
                      {stat.stat_value}
                      {stat.stat_delta && (
                        <span style={{ fontSize: 10, fontWeight: 600, marginLeft: 6, color: "#52606d" }}>
                          {stat.stat_delta}
                        </span>
                      )}
                    </p>
                  </div>
                ))}
              </div>
            )}
            <MarkdownText text={finding.summary} className="text-black" />
            {finding.reason?.trim() && (
              <div style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid #dddddd" }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "#000000" }}>
                  Why This Was Flagged
                </p>
                <MarkdownText text={finding.reason} className="text-black" />
                {finding.points?.map((point, pointIndex) => (
                  <div
                    key={pointIndex}
                    style={{ marginTop: 6, paddingLeft: 10, borderLeft: "2px solid #eeeeee" }}
                  >
                    <p style={{ fontSize: 11, fontWeight: 600, color: "#000000" }}>{point.title}</p>
                    <MarkdownText text={point.detail} className="text-black" />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ))}
      {data.table?.map((table, index) => <PrintTable key={index} table={table} />)}
      {data.text_data?.trim() && (
        <div style={blockStyle}>
          <p style={sectionHeadingStyle}>Summary</p>
          <MarkdownText text={data.text_data} className="text-black" />
        </div>
      )}
      {data.insight?.map((insight, index) => (
        <div key={`insight-${index}`} style={blockStyle}>
          {index === 0 && <p style={sectionHeadingStyle}>Why</p>}
          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "#000000" }}>
            {insight.title}
          </p>
          <MarkdownText text={insight.reason} className="text-black" />
          {insight.points?.map((point, pointIndex) => (
            <div
              key={pointIndex}
              style={{ marginTop: 8, paddingLeft: 12, borderLeft: "2px solid #dddddd" }}
            >
              <p style={{ fontSize: 12, fontWeight: 600, color: "#000000" }}>{point.title}</p>
              <MarkdownText text={point.detail} className="text-black" />
            </div>
          ))}
        </div>
      ))}
      {data.report?.map((report, index) => (
        <div key={index} style={blockStyle}>
          {!data.text_data?.trim() && index === 0 && (
            <p style={sectionHeadingStyle}>Summary</p>
          )}
          {(report.report_name ?? report.title) && (
            <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 8, color: "#000000" }}>
              {report.report_name ?? report.title}
            </p>
          )}
          {report.report_content && (
            <div dangerouslySetInnerHTML={{ __html: report.report_content }} />
          )}
        </div>
      ))}
    </>
  )
}

export async function exportToolDataAsPdf(data: ToolEngineData, title: string) {
  const container = document.createElement("div")
  container.style.position = "fixed"
  container.style.top = "-10000px"
  container.style.left = "-10000px"
  document.body.appendChild(container)

  const root = createRoot(container)
  try {
    await new Promise<void>((resolve) => {
      root.render(<PdfExportTemplate data={data} title={title} />)
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()))
    })
    await new Promise((resolve) => setTimeout(resolve, 300))
    const blocks = Array.from(container.children) as HTMLElement[]
    await exportElementsAsPdf(blocks, `${slugifyFilename(title)}.pdf`)
  } finally {
    root.unmount()
    document.body.removeChild(container)
  }
}
