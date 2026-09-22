import * as React from "react"
import { createColumnHelper } from "@tanstack/react-table"

import { DataTable, type GenericTableFeatures } from "@/modules/data-analyst-agent/tools/table"

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value)
}

function isTabularArray(value: unknown[]): value is Record<string, unknown>[] {
  return value.length > 0 && value.every((item) => isPlainObject(item))
}

function humanizeKey(key: string): string {
  const spaced = key.replace(/_/g, " ").trim()
  return spaced.replace(/\b\w/g, (char) => char.toUpperCase()) || key
}

export function parseGenericJson(text: string): unknown | null {
  const trimmed = text.trim()
  if (!trimmed) return null

  try {
    const data = JSON.parse(trimmed)
    if (data === null || typeof data !== "object") return null
    if (Array.isArray(data) ? data.length === 0 : Object.keys(data).length === 0) {
      return null
    }
    return data
  } catch {
    return null
  }
}

const columnHelper = createColumnHelper<GenericTableFeatures, Record<string, unknown>>()

function GenericTable({ rows }: { rows: Record<string, unknown>[] }) {
  const keys = React.useMemo(() => {
    const seen = new Set<string>()
    rows.forEach((row) => Object.keys(row).forEach((key) => seen.add(key)))
    return Array.from(seen)
  }, [rows])

  const columns = React.useMemo(
    () =>
      keys.map((key) =>
        columnHelper.accessor(key, {
          header: humanizeKey(key),
          cell: (info) => <GenericValue value={info.getValue()} />,
        })
      ),
    [keys]
  )

  return (
    <DataTable
      columns={columns}
      rows={rows}
      enableColumnFilter={false}
      className="min-w-0"
    />
  )
}

function GenericList({ items }: { items: unknown[] }) {
  return (
    <ul className="flex flex-col gap-1.5">
      {items.map((item, index) => (
        <li key={index} className="text-sm text-foreground">
          <GenericValue value={item} />
        </li>
      ))}
    </ul>
  )
}

function GenericObject({ data }: { data: Record<string, unknown> }) {
  return (
    <dl className="flex flex-col gap-3">
      {Object.entries(data).map(([key, value]) => (
        <div key={key} className="flex flex-col gap-1">
          <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
            {humanizeKey(key)}
          </dt>
          <dd className="text-sm text-foreground">
            <GenericValue value={value} />
          </dd>
        </div>
      ))}
    </dl>
  )
}

function GenericValue({ value }: { value: unknown }) {
  if (value === null || value === undefined || value === "") {
    return <span className="text-muted-foreground">—</span>
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return <span className="text-muted-foreground">—</span>
    return isTabularArray(value) ? <GenericTable rows={value} /> : <GenericList items={value} />
  }
  if (isPlainObject(value)) {
    return <GenericObject data={value} />
  }
  if (typeof value === "boolean") {
    return <span>{value ? "Yes" : "No"}</span>
  }
  return (
    <span className="wrap-break-word whitespace-pre-wrap">{String(value)}</span>
  )
}

export type GenericJsonViewProps = {
  data: unknown
}

export function GenericJsonView({ data }: GenericJsonViewProps) {
  return (
    <div className="scrollbar-thin w-full max-w-full overflow-x-auto rounded-xl border bg-card p-4">
      <GenericValue value={data} />
    </div>
  )
}

