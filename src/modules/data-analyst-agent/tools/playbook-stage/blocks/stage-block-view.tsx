import { Wrench } from "lucide-react"
import type { FocusEvent } from "react"

import { Input } from "@/modules/data-analyst-agent/ui/input"
import { Textarea } from "@/modules/data-analyst-agent/ui/textarea"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import type { FieldState, FieldValue, StageBlock } from "../types"
import { ConfirmBlockView } from "./confirm-block"
import { FieldLabel } from "./field-label"
import { FinalBlockView } from "./final-block"
import { PickerHeading } from "./picker-heading"
import { PreviewBlockView } from "./preview-block"
import { SelectableCardView } from "./selectable-card"
import { SelectableItemsView } from "./selectable-items"

export function StageBlockView({
  block,
  interactive,
  values,
  setValue,
  onSubmit,
  onTestPlaybook,
  onGoToSandbox,
  onGoToPlaybooks,
  suppressConfirm,
}: {
  block: StageBlock
  interactive: boolean
  values: FieldState
  setValue: (id: string, value: FieldValue) => void
  onSubmit: (text: string) => void
  onTestPlaybook?: (fileName: string) => void | Promise<void>
  onGoToSandbox?: () => void
  onGoToPlaybooks?: () => void
  suppressConfirm: boolean
}) {
  switch (block.display_type) {
    case "markdown":
      return <MarkdownText text={block.display_value} className="text-card-foreground" />

    case "input":
      return (
        <label className="flex flex-col gap-1">
          <FieldLabel label={block.label} required={block.required} />
          <Input
            value={(values[block.id] as string | undefined) ?? ""}
            onChange={(event) => setValue(block.id, event.target.value)}
            placeholder={block.placeholder}
            disabled={!interactive}
          />
        </label>
      )

    case "textarea": {
      const isPlaybookDescription = block.id === "playbook_description"
      const placeholderText = block.placeholder
      const label = isPlaybookDescription ? "What should this playbook do?" : block.label
      const hint = isPlaybookDescription
        ? "Describe the analysis or report you want this playbook to generate."
        : undefined

      const handleFocus = (event: FocusEvent<HTMLTextAreaElement>) => {
        if (!interactive || !placeholderText) return
        const current = (values[block.id] as string | undefined) ?? ""
        if (current) return
        setValue(block.id, placeholderText)
        const textarea = event.currentTarget
        requestAnimationFrame(() => {
          const length = placeholderText.length
          textarea.setSelectionRange(length, length)
        })
      }

      return (
        <label className="flex flex-col gap-1">
          <FieldLabel label={label} hint={hint} required={block.required} />
          <Textarea
            value={(values[block.id] as string | undefined) ?? ""}
            onChange={(event) => setValue(block.id, event.target.value)}
            onFocus={handleFocus}
            placeholder={placeholderText}
            disabled={!interactive}
          />
        </label>
      )
    }

    case "list":
      if (block.selectable) {
        return (
          <SelectableItemsView
            id={block.id}
            items={block.items}
            multi={block.multi}
            required={block.required}
            interactive={interactive}
            values={values}
            setValue={setValue}
          />
        )
      }
      return (
        <ul className="flex flex-col gap-1.5 rounded-lg border bg-background/40 p-2">
          {block.items.map((item, index) => (
            <li key={index} className="flex flex-col gap-0.5 px-1.5 py-1 text-sm">
              <span className="font-medium text-card-foreground">{item.label}</span>
              {item.description && (
                <span className="text-xs text-muted-foreground">
                  {item.description}
                </span>
              )}
            </li>
          ))}
        </ul>
      )

    case "chips": {
      const hasOwnHeading = block.id !== "schedule_frequency"
      return (
        <div className="flex flex-col gap-2">
          {block.label && hasOwnHeading && <PickerHeading label={block.label} />}
          {block.label && !hasOwnHeading && (
            <FieldLabel label={block.label} required={block.required} />
          )}
          <SelectableItemsView
            id={block.id}
            items={block.items}
            multi={block.multi}
            required={block.required}
            interactive={interactive}
            values={values}
            setValue={setValue}
          />
        </div>
      )
    }

    case "card":
      if (block.selectable) {
        return (
          <SelectableCardView
            block={block}
            interactive={interactive}
            values={values}
            setValue={setValue}
          />
        )
      }
      return (
        <div className="rounded-lg border bg-background/40 p-3">
          <p className="mb-1.5 text-sm font-semibold text-card-foreground">
            {block.title}
          </p>
          <dl className="flex flex-col gap-1">
            {block.fields.map((field, index) => (
              <div
                key={index}
                className="flex items-baseline justify-between gap-3 text-xs"
              >
                <dt className="text-muted-foreground">{field.label}</dt>
                <dd className="text-right font-medium text-card-foreground">
                  {field.value}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      )

    case "preview":
      return <PreviewBlockView block={block} interactive={interactive} onSubmit={onSubmit} />

    case "confirm":
      if (suppressConfirm) return null
      return <ConfirmBlockView interactive={interactive} onAnswer={onSubmit} />

    case "final":
      return (
        <FinalBlockView
          block={block}
          onGoToSandbox={onGoToSandbox}
          onGoToPlaybooks={onGoToPlaybooks}
          onTestPlaybook={onTestPlaybook}
        />
      )

    case "tool_call":
      return (
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Wrench className="size-3" />
          Looked up {block.tool_name}
        </div>
      )

    default:
      return null
  }
}
