import { CheckCircle2, LayoutPanelTop } from "lucide-react"

import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { getAnswerId } from "../answers"
import type { CardBlock, FieldState, FieldValue } from "../types"

export function SelectableCardView({
  block,
  interactive,
  values,
  setValue,
  accent = "var(--link)",
}: {
  block: CardBlock
  interactive: boolean
  values: FieldState
  setValue: (id: string, value: FieldValue) => void
  accent?: string
}) {
  const answerId = getAnswerId(block)
  const raw = values[answerId]
  const selected = block.multi
    ? Array.isArray(raw)
      ? raw
      : []
    : typeof raw === "string"
      ? [raw]
      : []
  const isSelected = selected.includes(block.id)

  const toggle = () => {
    if (!interactive) return
    if (block.multi) {
      const next = isSelected
        ? selected.filter((v) => v !== block.id)
        : [...selected, block.id]
      setValue(answerId, next)
    } else {
      setValue(answerId, block.id)
    }
  }

  const descriptionField = block.fields.find(
    (field) => field.label.toLowerCase() === "description"
  )
  const otherFields = block.fields.filter((field) => field !== descriptionField)

  return (
    <label
      className={cn(
        "relative flex h-full min-w-0 cursor-pointer flex-col gap-2 rounded-xl border bg-card p-3.5 shadow-sm transition-all",
        isSelected ? "border-link bg-link/5 shadow-md" : "border-border",
        interactive && "hover:-translate-y-0.5 hover:border-link/50 hover:shadow-md",
        !interactive && "cursor-not-allowed opacity-60"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex min-w-0 items-center gap-2">
          <div
            className="flex size-8 shrink-0 items-center justify-center rounded-lg"
            style={{ backgroundColor: `color-mix(in oklab, ${accent} 16%, transparent)` }}
          >
            <LayoutPanelTop className="size-4" style={{ color: accent }} />
          </div>
          <p className="text-sm font-semibold text-card-foreground">{block.title}</p>
        </div>
        {isSelected ? (
          <CheckCircle2 className="size-5 shrink-0 text-link" />
        ) : (
          <div className="size-5 shrink-0 rounded-full border-2 border-border" />
        )}
        <input
          type={block.multi ? "checkbox" : "radio"}
          name={answerId}
          checked={isSelected}
          disabled={!interactive}
          onChange={toggle}
          className="sr-only"
        />
      </div>
      {descriptionField && (
        <p className="text-xs text-muted-foreground">{descriptionField.value}</p>
      )}
      {otherFields.length > 0 && (
        <dl className="mt-1 flex flex-col gap-2 border-t border-border/60 pt-2">
          {otherFields.map((field, index) => (
            <div key={index} className="flex flex-col gap-0.5">
              <dt className="text-[10px] font-semibold tracking-wide text-muted-foreground uppercase">
                {field.label}
              </dt>
              <dd className="text-xs text-card-foreground">{field.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </label>
  )
}
