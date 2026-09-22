import { ChevronDownIcon } from "lucide-react"

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/modules/data-analyst-agent/ui/dialog"
import { Input } from "@/modules/data-analyst-agent/ui/input"
import { Textarea } from "@/modules/data-analyst-agent/ui/textarea"
import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"

export type RowMetadataItem = {
  type: string
  content: string
}

export type RowMetadataDialogProps = {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  items: RowMetadataItem[]
}

function splitListLines(content: string): string[] {
  return content
    .split("\n")
    .map((line) => line.replace(/^[-*]\s*/, "").trim())
    .filter(Boolean)
}

function RowMetadataField({ item }: { item: RowMetadataItem }) {
  switch (item.type) {
    case "textarea":
      return (
        <Textarea
          readOnly
          value={item.content}
          className="min-h-24 resize-none text-sm"
        />
      )
    case "input":
      return <Input readOnly value={item.content} className="text-sm" />
    case "dropdown":
    case "select":
      return (
        <div className="flex h-9 w-full items-center justify-between rounded-lg border border-input bg-transparent px-2.5 text-sm text-foreground">
          <span className="truncate">{item.content}</span>
          <ChevronDownIcon className="size-4 shrink-0 text-muted-foreground" />
        </div>
      )
    case "badge":
    case "tag":
    case "status":
      return (
        <span
          className={cn(
            "inline-flex w-fit items-center rounded-full px-2.5 py-1 text-xs font-medium",
            "bg-secondary text-secondary-foreground"
          )}
        >
          {item.content}
        </span>
      )
    case "list":
      return (
        <ul className="list-disc space-y-1 pl-5 text-sm text-foreground">
          {splitListLines(item.content).map((line, index) => (
            <li key={index}>{line}</li>
          ))}
        </ul>
      )
    case "code":
      return (
        <pre className="overflow-x-auto rounded-lg bg-muted px-3 py-2 font-mono text-xs text-foreground">
          <code>{item.content}</code>
        </pre>
      )
    case "text":
    default:
      return <MarkdownText text={item.content} />
  }
}

export function RowMetadataDialog({
  open,
  onOpenChange,
  title = "Details",
  items,
}: RowMetadataDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
        </DialogHeader>
        <div className="flex max-h-[60vh] flex-col gap-4 overflow-y-auto">
          {items.map((item, index) => (
            <RowMetadataField key={index} item={item} />
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}

