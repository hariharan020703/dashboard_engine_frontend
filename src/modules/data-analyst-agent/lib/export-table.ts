export type ExportColumn = {
  key: string
  header: string
}

export function slugifyFilename(value: string): string {
  const slug = value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
  return slug || "table"
}

function csvEscape(value: unknown): string {
  if (value === null || value === undefined) return ""
  const str = String(value)
  return /[",\r\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str
}

function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export function exportTableAsCsv(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[]
) {
  const headerLine = columns.map((column) => csvEscape(column.header)).join(",")
  const bodyLines = rows.map((row) =>
    columns.map((column) => csvEscape(row[column.key])).join(",")
  )
  const csv = [headerLine, ...bodyLines].join("\r\n")
  triggerDownload(
    new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" }),
    `${filename}.csv`
  )
}

export async function exportTableAsExcel(
  filename: string,
  columns: ExportColumn[],
  rows: Record<string, unknown>[]
) {
  const XLSX = await import("xlsx")
  const data = rows.map((row) =>
    Object.fromEntries(columns.map((column) => [column.header, row[column.key] ?? ""]))
  )
  const worksheet = XLSX.utils.json_to_sheet(data, {
    header: columns.map((column) => column.header),
  })
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1")
  XLSX.writeFile(workbook, `${filename}.xlsx`)
}
