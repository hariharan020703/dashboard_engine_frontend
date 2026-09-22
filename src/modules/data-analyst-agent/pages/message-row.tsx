import {
  BotMessageSquare,
  CircleUserRound,
  Download,
  Loader2,
} from "lucide-react"

import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { ThinkingSection } from "./thinking-section"
import { parseToolEngineData, ToolEngine } from "@/modules/data-analyst-agent/tools/tool_engine"
import { parseGenericJson, GenericJsonView } from "@/modules/data-analyst-agent/tools/generic_json_view"
import { parsePlaybookStage, PlaybookStage } from "@/modules/data-analyst-agent/tools/playbook-stage"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import type { ChatMessage } from "@/modules/data-analyst-agent/state/slices/messagesSlice"
import type { ToolEngineData } from "@/modules/data-analyst-agent/tools/tool_engine"

export function formatMessageTime(timestamp: number) {
  return new Date(timestamp * 1000).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  })
}

export function downloadTextMessage(item: ChatMessage, isJsonData: boolean) {
  const extension = isJsonData ? "json" : "txt"
  const blob = new Blob([item.text], {
    type: isJsonData ? "application/json" : "text/plain",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `agent-response-${item.timestamp}.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

export type MessageRowProps = {
  item: ChatMessage
  index: number
  exportingKey: string | null
  sessionId?: string
  interactive?: boolean
  showDownload?: boolean
  onSendMessage?: (text: string) => void
  onTestPlaybook?: (fileName: string) => void | Promise<void>
  onGoToSandbox?: () => void
  onGoToPlaybooks?: () => void
  onDownload: (
    key: string,
    item: ChatMessage,
    toolData: ToolEngineData | null,
    isJsonData: boolean
  ) => void
}

export function MessageRow({
  item,
  index,
  exportingKey,
  sessionId,
  interactive = false,
  showDownload = true,
  onSendMessage,
  onTestPlaybook,
  onGoToSandbox,
  onGoToPlaybooks,
  onDownload,
}: MessageRowProps) {
  const stageData =
    item.author !== "user" ? parsePlaybookStage(item.text) : null
  const toolData =
    !stageData && item.author !== "user" ? parseToolEngineData(item.text) : null
  const genericData =
    !stageData && !toolData && item.author !== "user"
      ? parseGenericJson(item.text)
      : null
  const isJsonData = Boolean(toolData) || Boolean(stageData) || genericData !== null
  const downloadKey = `${item.timestamp}-${index}`
  const isDownloading = exportingKey === downloadKey
  const isUser = item.author === "user"
  const bubbleClass = cn(
    "min-w-0 rounded-3xl px-4 py-3",
    isUser
      ? "rounded-tr-none border border-primary-foreground/20 text-primary-foreground"
      : "rounded-tl-none pt-4 text-foreground"
  )
  const bubbleStyle = isUser
    ? {
        backgroundImage:
          "linear-gradient(135deg, var(--primary) 0%, color-mix(in oklab, var(--primary) 78%, black) 100%)",
      }
    : {
        backgroundColor: "color-mix(in oklab, var(--primary) 8%, var(--popover))",
      }

  const bubbleWidthClass = stageData
    ? "w-full max-w-[85%]"
    : toolData
      ? cn("w-full", !toolData.action?.length && "max-w-[75%]")
      : genericData !== null
        ? "w-full max-w-[75%]"
        : cn("max-w-[75%] text-sm break-words", isUser && "whitespace-pre-wrap")

  return (
    <div
      className={cn(
        "flex min-w-0 flex-col gap-1",
        isUser ? "items-end" : "items-start"
      )}
    >
      {item.author !== "user" && (
        <ThinkingSection
          thoughts={item.thoughts ?? []}
          seconds={item.thinkingSeconds}
        />
      )}
      <div className={cn(bubbleClass, bubbleWidthClass)} style={bubbleStyle}>
        <div className="mb-1.5 flex items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span
              className={cn(
                "flex size-6 shrink-0 items-center justify-center rounded-full",
                isUser
                  ? "bg-primary-foreground/20 text-primary-foreground"
                  : "bg-foreground/10 text-foreground"
              )}
            >
              {isUser ? (
                <CircleUserRound className="size-4" />
              ) : (
                <BotMessageSquare className="size-4" />
              )}
            </span>
            <span className="text-[11px] font-semibold opacity-70">
              {isUser ? "You" : "Agent"}
            </span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="text-[10px] opacity-60">
              {formatMessageTime(item.timestamp)}
            </span>
            {item.author !== "user" && showDownload && (
              <button
                type="button"
                onClick={() => onDownload(downloadKey, item, toolData, isJsonData)}
                disabled={isDownloading}
                className="flex cursor-pointer items-center opacity-60 transition-opacity hover:opacity-100 disabled:cursor-not-allowed disabled:opacity-40"
                aria-label={toolData ? "Download response as PDF" : "Download response"}
              >
                {isDownloading ? (
                  <Loader2 className="size-3 animate-spin" />
                ) : (
                  <Download className="size-3" />
                )}
              </button>
            )}
          </div>
        </div>
        {stageData ? (
          <PlaybookStage
            data={stageData}
            interactive={interactive}
            isFirstMessage={index === 0}
            onSubmit={(text) => onSendMessage?.(text)}
            onTestPlaybook={onTestPlaybook}
            onGoToSandbox={onGoToSandbox}
            onGoToPlaybooks={onGoToPlaybooks}
          />
        ) : toolData ? (
          <ToolEngine data={toolData} sessionId={sessionId} />
        ) : genericData !== null ? (
          <GenericJsonView data={genericData} />
        ) : isUser ? (
          item.text
        ) : (
          <MarkdownText text={item.text} className="text-foreground" />
        )}
      </div>
    </div>
  )
}
