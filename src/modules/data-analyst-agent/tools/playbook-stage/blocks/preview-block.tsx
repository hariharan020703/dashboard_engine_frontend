import * as React from "react"
import { Maximize2, Pencil } from "lucide-react"

import { Button } from "@/modules/data-analyst-agent/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/modules/data-analyst-agent/ui/dialog"
import { Textarea } from "@/modules/data-analyst-agent/ui/textarea"
import type { PreviewBlock } from "../types"

export function PreviewBlockView({
  block,
  interactive,
  onSubmit,
}: {
  block: PreviewBlock
  interactive: boolean
  onSubmit: (text: string) => void
}) {
  const [editing, setEditing] = React.useState(false)
  const [fullscreen, setFullscreen] = React.useState(false)
  const [submitted, setSubmitted] = React.useState(false)
  const [values, setValues] = React.useState<Record<string, string>>(() =>
    Object.fromEntries(block.sections.map((section) => [section.label, section.value]))
  )

  const valueFor = (label: string, fallback: string) => values[label] ?? fallback

  const handleCancel = () => {
    setValues(
      Object.fromEntries(block.sections.map((section) => [section.label, section.value]))
    )
    setEditing(false)
  }

  const handleContinue = () => {
    setSubmitted(true)
    if (editing) {
      const text = block.sections
        .map((section) => `${section.label}: ${valueFor(section.label, section.value).trim()}`)
        .join("\n")
      onSubmit(text || "Continue.")
      setEditing(false)
    } else {
      onSubmit("Continue.")
    }
  }

  return (
    <>
      <div
        className="rounded-lg p-3 shadow-sm"
        style={{
          backgroundImage:
            "linear-gradient(180deg, color-mix(in oklab, var(--primary) 10%, var(--card)) 0%, var(--card) 100%)",
        }}
      >
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <p className="text-sm font-semibold text-card-foreground">{block.title}</p>
          {interactive && (
            <div className="flex shrink-0 items-center gap-1">
              {!editing && (
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  className="cursor-pointer"
                  aria-label="Edit preview"
                  onClick={() => setEditing(true)}
                >
                  <Pencil />
                </Button>
              )}
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="cursor-pointer"
                aria-label="View full screen"
                onClick={() => setFullscreen(true)}
              >
                <Maximize2 />
              </Button>
            </div>
          )}
        </div>
        <dl className="flex flex-col gap-1.5">
          {block.sections.map((section, index) => (
            <div key={index} className="flex flex-col gap-1 text-xs">
              <dt className="font-medium tracking-wide text-muted-foreground uppercase">
                {section.label}
              </dt>
              {editing ? (
                <Textarea
                  value={valueFor(section.label, section.value)}
                  onChange={(event) =>
                    setValues((prev) => ({ ...prev, [section.label]: event.target.value }))
                  }
                  className="text-xs"
                />
              ) : (
                <dd className="text-card-foreground">
                  {valueFor(section.label, section.value)}
                </dd>
              )}
            </div>
          ))}
        </dl>
        {interactive && (
          <div className="mt-2 flex gap-2">
            {editing && (
              <Button
                type="button"
                size="sm"
                variant="outline"
                className="cursor-pointer"
                onClick={handleCancel}
              >
                Cancel
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              className="cursor-pointer"
              disabled={submitted}
              onClick={handleContinue}
            >
              Continue
            </Button>
          </div>
        )}
      </div>

      <Dialog open={fullscreen} onOpenChange={setFullscreen}>
        <DialogContent className="max-h-[85vh] w-full max-w-2xl overflow-y-auto sm:max-w-2xl">
          <DialogHeader className="flex-row items-center justify-between gap-2 space-y-0">
            <DialogTitle className="font-semibold">{block.title}</DialogTitle>
            {interactive && !editing && (
              <Button
                type="button"
                size="icon-xs"
                variant="ghost"
                className="mr-6 cursor-pointer"
                aria-label="Edit preview"
                onClick={() => setEditing(true)}
              >
                <Pencil />
              </Button>
            )}
          </DialogHeader>
          <dl className="flex flex-col gap-3">
            {block.sections.map((section, index) => (
              <div key={index} className="flex flex-col gap-1 text-sm">
                <dt className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  {section.label}
                </dt>
                {editing ? (
                  <Textarea
                    value={valueFor(section.label, section.value)}
                    onChange={(event) =>
                      setValues((prev) => ({
                        ...prev,
                        [section.label]: event.target.value,
                      }))
                    }
                  />
                ) : (
                  <dd className="whitespace-pre-wrap text-card-foreground">
                    {valueFor(section.label, section.value)}
                  </dd>
                )}
              </div>
            ))}
          </dl>
          {interactive && (
            <DialogFooter>
              {editing && (
                <Button
                  type="button"
                  variant="outline"
                  className="cursor-pointer"
                  onClick={handleCancel}
                >
                  Cancel
                </Button>
              )}
              <Button
                type="button"
                className="cursor-pointer"
                disabled={submitted}
                onClick={() => {
                  handleContinue()
                  setFullscreen(false)
                }}
              >
                Continue
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
