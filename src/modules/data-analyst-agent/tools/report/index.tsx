import * as React from "react"
import { Download, FileText } from "lucide-react"

import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { Button } from "@/modules/data-analyst-agent/ui/button"
import { exportElementAsPdf } from "@/modules/data-analyst-agent/lib/export-pdf"

export type ReportProps = {
  report_name?: string
  title?: string
  report_content?: string
  content?: string
  summary?: string
  className?: string
}

function slugify(value: string) {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "report"
}

export function Report({
  report_name,
  title,
  report_content,
  content,
  summary,
  className,
}: ReportProps) {
  const heading = report_name ?? title
  const html = report_content
  const plainText = !html ? (content ?? summary) : undefined
  const [isExporting, setIsExporting] = React.useState(false)
  const [exportError, setExportError] = React.useState<string | null>(null)

  const handleDownloadPdf = async () => {
    if (!html || isExporting) return
    setIsExporting(true)
    setExportError(null)

    const exportRoot = document.createElement("div")
    exportRoot.style.position = "fixed"
    exportRoot.style.top = "-10000px"
    exportRoot.style.left = "-10000px"
    exportRoot.style.width = "800px"
    exportRoot.style.background = "#ffffff"
    exportRoot.style.color = "#000000"
    exportRoot.style.padding = "24px"
    exportRoot.style.fontFamily = "sans-serif"
    exportRoot.innerHTML = html
    document.body.appendChild(exportRoot)

    try {
      await exportElementAsPdf(exportRoot, `${slugify(heading ?? "report")}.pdf`)
    } catch (error) {
      console.error("Failed to export report as PDF", error)
      setExportError("Couldn't export this report. Please try again.")
    } finally {
      document.body.removeChild(exportRoot)
      setIsExporting(false)
    }
  }

  if (!heading && !html && !plainText) return null

  return (
    <div
      className={cn(
        "overflow-hidden rounded-xl border bg-card shadow-sm",
        className
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b bg-standard px-4 py-3">
        <div className="flex items-center gap-2">
          <FileText className="size-4 text-standard-foreground" />
          <p className="text-sm font-semibold text-standard-foreground">
            {heading ?? "Report"}
          </p>
        </div>
        {html && (
          <Button
            variant="secondary"
            size="sm"
            className="cursor-pointer gap-1.5 rounded-full"
            onClick={handleDownloadPdf}
            disabled={isExporting}
          >
            <Download className="size-3.5" />
            {isExporting ? "Exporting…" : "Download PDF"}
          </Button>
        )}
      </div>
      {exportError && (
        <p className="border-b bg-destructive/10 px-4 py-2 text-xs text-destructive">
          {exportError}
        </p>
      )}
      {html && (
        <div className="scrollbar-thin max-h-96 overflow-auto bg-white p-4 text-sm text-neutral-900">
          <div
            className="mx-auto max-w-3xl"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
      )}
      {plainText && (
        <p className="bg-white p-4 text-sm whitespace-pre-wrap text-neutral-600">
          {plainText}
        </p>
      )}
    </div>
  )
}

