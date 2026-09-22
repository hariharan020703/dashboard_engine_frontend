import * as React from "react"

import {
  RowMetadataDialog,
  type RowMetadataItem,
} from "@/modules/data-analyst-agent/dialogs/row-metadata-dialog"

export function parseRowMetadata(value: unknown): RowMetadataItem[] {
  if (!Array.isArray(value)) return []

  const items: RowMetadataItem[] = []
  for (const entry of value) {
    if (typeof entry !== "object" || entry === null) continue
    const record = entry as Record<string, unknown>
    if (typeof record.type !== "string" || record.content === undefined) continue
    items.push({ type: record.type, content: String(record.content) })
  }
  return items
}

export function rowsHaveMetadata(rows: Record<string, unknown>[]): boolean {
  return rows.some((row) => parseRowMetadata(row.metadata).length > 0)
}

export function TableActionsCell({
  metadata,
  title,
}: {
  metadata: RowMetadataItem[]
  title?: string
}) {
  const [open, setOpen] = React.useState(false)

  if (!metadata.length) return null

  return (
    <>
      <button
        type="button"
        className="cursor-pointer text-sm font-medium text-foreground hover:text-blue-600 hover:underline"
        onClick={() => setOpen(true)}
      >
        Details
      </button>
      <RowMetadataDialog
        open={open}
        onOpenChange={setOpen}
        title={title}
        items={metadata}
      />
    </>
  )
}

