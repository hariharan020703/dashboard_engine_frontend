import * as React from "react"
import {
  BookOpen,
  CheckCircle2,
  ClipboardList,
  Database,
  Eye,
  LayoutPanelTop,
  Lightbulb,
  Sparkles,
  Users,
  type LucideIcon,
} from "lucide-react"

import { Button } from "@/modules/data-analyst-agent/ui/button"
import { ACCENT_COLORS } from "@/modules/data-analyst-agent/tools/kpi"
import { formatAnswers, getInitialValues, isBlockAnswered, uniqueAnswerableBlocks } from "./answers"
import { StageBlockView } from "./blocks/stage-block-view"
import { SelectableCardView } from "./blocks/selectable-card"
import { groupCardRuns } from "./segments"
import type { FieldValue, FieldState, PlaybookStageData } from "./types"

export { parsePlaybookStage } from "./parse"
export type {
  PlaybookStageData,
  StageBlock,
  MarkdownBlock,
  InputBlock,
  TextareaBlock,
  ListBlock,
  ChipsBlock,
  CardBlock,
  PreviewBlock,
  ConfirmBlock,
  FinalBlock,
  ToolCallBlock,
} from "./types"

const STAGE_ICONS: Record<string, LucideIcon> = {
  metadata: ClipboardList,
  dataset: Database,
  scenario: Lightbulb,
  business_context: Users,
  templates: LayoutPanelTop,
  preview: Eye,
  final: CheckCircle2,
}

function iconForStage(stage: string): LucideIcon {
  return STAGE_ICONS[stage] ?? BookOpen
}

export type PlaybookStageProps = {
  data: PlaybookStageData
  interactive: boolean
  isFirstMessage?: boolean
  onSubmit: (text: string) => void
  onTestPlaybook?: (fileName: string) => void | Promise<void>
  onGoToSandbox?: () => void
  onGoToPlaybooks?: () => void
}

export function PlaybookStage({
  data,
  interactive,
  isFirstMessage = false,
  onSubmit,
  onTestPlaybook,
  onGoToSandbox,
  onGoToPlaybooks,
}: PlaybookStageProps) {
  const [values, setValues] = React.useState<FieldState>(() =>
    getInitialValues(data.blocks)
  )

  const setValue = React.useCallback((id: string, value: FieldValue) => {
    setValues((prev) => ({ ...prev, [id]: value }))
  }, [])

  const hasConfirm = data.blocks.some((block) => block.display_type === "confirm")
  const hasPreview = data.blocks.some((block) => block.display_type === "preview")
  const answerableBlocks = uniqueAnswerableBlocks(data.blocks)
  const canSubmit = answerableBlocks.every((block) => isBlockAnswered(block, values))

  const handleContinue = () => {
    onSubmit(formatAnswers(data.blocks, values) || "Continue.")
  }
  const isWelcomeStage = data.stage === "metadata" && isFirstMessage
  const welcomeMarkdownIndex = isWelcomeStage
    ? data.blocks.findIndex((block) => block.display_type === "markdown")
    : -1
  const hiddenStageTitleStages = new Set(["dataset", "scenario", "templates"])
  const showStageTitle = !isWelcomeStage && !hiddenStageTitleStages.has(data.stage)

  return (
    <div
      className="flex w-full min-w-0 flex-col gap-3 rounded-xl border p-4 shadow-sm"
      style={{
        backgroundColor: "color-mix(in oklab, var(--primary) 4%, var(--card))",
      }}
    >
      {isWelcomeStage ? (
        <div className="flex flex-col gap-1 border-b pb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="size-5 text-link" />
            <p className="text-lg font-semibold text-link">
              Welcome to the Playbook Builder!
            </p>
          </div>
          <p className="text-sm text-muted-foreground">
            I&apos;ll guide you through a step-by-step process to set up your
            automated analyst playbook.
          </p>
        </div>
      ) : (
        showStageTitle &&
        (() => {
          const StageIcon = iconForStage(data.stage)
          return (
            <div className="flex items-center gap-2 border-b pb-3">
              <StageIcon className="size-5 shrink-0 text-link" />
              <p className="text-lg font-semibold text-link">
                {data.stage_title}
              </p>
            </div>
          )
        })()
      )}
      {groupCardRuns(data.blocks).map((segment, segIndex) => {
        if (segment.kind === "card-row") {
          return (
            <div
              key={segIndex}
              className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
            >
              {segment.entries.map(({ index, block }, cardIndex) => (
                <SelectableCardView
                  key={index}
                  block={block}
                  interactive={interactive}
                  values={values}
                  setValue={setValue}
                  accent={ACCENT_COLORS[cardIndex % ACCENT_COLORS.length]}
                />
              ))}
            </div>
          )
        }
        if (segment.index === welcomeMarkdownIndex) return null
        return (
          <StageBlockView
            key={segment.index}
            block={segment.block}
            interactive={interactive}
            values={values}
            setValue={setValue}
            onSubmit={onSubmit}
            onTestPlaybook={onTestPlaybook}
            onGoToSandbox={onGoToSandbox}
            onGoToPlaybooks={onGoToPlaybooks}
            suppressConfirm={hasPreview}
          />
        )
      })}
      {interactive && !hasConfirm && answerableBlocks.length > 0 && (
        <Button
          type="button"
          size="sm"
          className="cursor-pointer self-start"
          disabled={!canSubmit}
          onClick={handleContinue}
        >
          Continue
        </Button>
      )}
    </div>
  )
}
