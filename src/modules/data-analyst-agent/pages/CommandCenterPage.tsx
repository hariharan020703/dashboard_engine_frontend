import * as React from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { toast, Toaster } from "sonner"
import {
  ArrowDownToLine,
  ArrowRightCircle,
  ArrowUp,
  ArrowUpToLine,
  FlaskConical,
  Info,
  Loader2,
  MessageCircle,
  Paperclip,
  Pencil,
} from "lucide-react"
import ChatBalloon from "@/modules/data-analyst-agent/assets/chat-balloon.png"

import { Button } from "@/modules/data-analyst-agent/ui/button"
import { FileUploadDialog } from "@/modules/data-analyst-agent/dialogs/file-upload-dialog"
import { Input } from "@/modules/data-analyst-agent/ui/input"
import { Skeleton } from "@/modules/data-analyst-agent/ui/skeleton"
import { ApiError } from "@/modules/data-analyst-agent/state/api"
import { useAppDispatch, useAppSelector, useAgentUserId } from "@/modules/data-analyst-agent/state/hooks"
import {
  createBuilderSession,
  createSession,
  fetchBuilderSession,
  fetchSession,
  findBuilderSessionForSandboxFile,
  sessionCleared,
} from "@/modules/data-analyst-agent/state/slices/sessionsSlice"
import {
  fetchMessages,
  historyResolved,
  lastMessagePopped,
  messageAppended,
  messagesCleared,
  sendingStarted,
  sendingStopped,
  sendMessage,
  type ChatMessage,
} from "@/modules/data-analyst-agent/state/slices/messagesSlice"
import { promoteSandboxPlaybook } from "@/modules/data-analyst-agent/state/slices/playbooksSlice"
import { exportToolDataAsPdf } from "@/modules/data-analyst-agent/tools/pdf-export-template"
import type { ToolEngineData } from "@/modules/data-analyst-agent/tools/tool_engine"
import { MessageIdentity, ThinkingSection } from "./thinking-section"
import { downloadTextMessage, MessageRow } from "./message-row"
import { PlaybookAnalysisPanel } from "./playbook-panel"

export type CommandCenterMode = "analyst" | "builder"

const SANDBOX_BLOCK_TURN = 10

const AGENT_SESSION_API = {
  analyst: {
    createSession,
    getSession: fetchSession,
  },
  builder: {
    createSession: createBuilderSession,
    getSession: fetchBuilderSession,
  },
} as const

export function CommandCenterPage({
  mode = "analyst",
}: {
  mode?: CommandCenterMode
}) {
  const isBuilder = mode === "builder"
  const agentApi = AGENT_SESSION_API[mode]
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const dispatch = useAppDispatch()
  const userId = useAgentUserId()
  const [message, setMessage] = React.useState("")
  const messages = useAppSelector((state) => state.messages.items)
  const session = useAppSelector((state) => state.sessions.current)
  const isSandboxTest = Boolean(session?.state?.is_sandbox_test)
  const sandboxUserTurns = isSandboxTest
    ? messages.filter((item) => item.author === "user").length
    : 0
  const isSandboxBlocked =
    isSandboxTest && sandboxUserTurns >= SANDBOX_BLOCK_TURN
  const historyStatus = useAppSelector((state) => state.messages.historyStatus)
  const isSending = useAppSelector((state) => state.messages.isSending)
  const sendingThoughts = useAppSelector((state) => state.messages.thoughts)
  const [exportingKey, setExportingKey] = React.useState<string | null>(null)
  const [fileDialogOpen, setFileDialogOpen] = React.useState(false)
  const [isNearTop, setIsNearTop] = React.useState(true)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)
  const messagesScrollRef = React.useRef<HTMLDivElement>(null)
  const conversationMarkerRef = React.useRef<HTMLDivElement>(null)
  const hasScrolledToConversationRef = React.useRef(false)
  const skipNextHistoryFetchRef = React.useRef<string | null>(null)

  React.useEffect(() => {
    hasScrolledToConversationRef.current = false
    if (!id) {
      dispatch(messagesCleared())
      dispatch(sessionCleared())
      return
    }

    dispatch(agentApi.getSession({ sessionId: id, userId }))

    if (skipNextHistoryFetchRef.current === id) {
      skipNextHistoryFetchRef.current = null
      dispatch(historyResolved(id))
      return
    }

    dispatch(fetchMessages({ sessionId: id, userId, scope: mode }))
  }, [id, agentApi, dispatch, mode, userId])

  const submitMessage = async (
    text: string,
    { onSessionCreateFailure }: { onSessionCreateFailure?: () => void } = {}
  ) => {
    if (!text || isSending || isSandboxBlocked) return

    dispatch(messageAppended({ author: "user", text, timestamp: Date.now() / 1000 }))
    dispatch(sendingStarted())

    let sessionId = id
    if (!sessionId) {
      try {
        const newSession = await dispatch(
          agentApi.createSession({ userId })
        ).unwrap()
        sessionId = newSession.id
        skipNextHistoryFetchRef.current = newSession.id
        navigate(
          isBuilder
            ? `/playbook-builder/${newSession.id}`
            : `/agent/${newSession.id}`,
          { replace: true }
        )
      } catch {
        dispatch(lastMessagePopped())
        dispatch(sendingStopped())
        onSessionCreateFailure?.()
        return
      }
    }

    await dispatch(
      sendMessage({ sessionId, userId, message: text, scope: mode })
    )
      .unwrap()
      .catch(() => {})
  }

  const autoSentRef = React.useRef(false)

  React.useEffect(() => {
    const autoSendMessage = (
      location.state as { autoSendMessage?: string } | null
    )?.autoSendMessage
    if (!autoSendMessage || autoSentRef.current) return
    if (id && historyStatus !== "success" && historyStatus !== "error") return

    autoSentRef.current = true
    submitMessage(autoSendMessage)
  }, [location.state, id, historyStatus])

  const handleSubmit = async (event: React.SubmitEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (!text || isSending) return

    setMessage("")
    await submitMessage(text, {
      onSessionCreateFailure: () => setMessage(text),
    })
  }

  const handleDownload = async (
    key: string,
    item: ChatMessage,
    toolData: ToolEngineData | null,
    isJsonData: boolean
  ) => {
    if (exportingKey) return

    if (toolData) {
      setExportingKey(key)
      try {
        await exportToolDataAsPdf(toolData, `agent-response-${item.timestamp}`)
      } catch (error) {
        console.error("Failed to export message as PDF", error)
      } finally {
        setExportingKey(null)
      }
      return
    }

    downloadTextMessage(item, isJsonData)
  }

  const handleTestPlaybook = async (fileName: string) => {
    try {
      const testSession = await dispatch(
        createSession({ userId, playbook: fileName })
      ).unwrap()
      dispatch(messagesCleared())
      navigate(`/agent/${testSession.id}`)
    } catch {
      toast.error("Couldn't open that playbook for testing.")
    }
  }

  const handleGoToSandbox = () => navigate("/playbooks")
  const handleGoToPlaybooks = () => navigate("/playbooks")

  const [isEditingSandboxPlaybook, setIsEditingSandboxPlaybook] =
    React.useState(false)
  const [isPromotingSandboxPlaybook, setIsPromotingSandboxPlaybook] =
    React.useState(false)
  const sandboxPlaybookBusy =
    isEditingSandboxPlaybook || isPromotingSandboxPlaybook

  const handleEditSandboxPlaybook = async () => {
    const playbookId = session?.state?.playbook_id
    const name = session?.state?.playbook_name
    if (typeof playbookId !== "string" || sandboxPlaybookBusy) return

    setIsEditingSandboxPlaybook(true)
    try {
      const existing = await dispatch(
        findBuilderSessionForSandboxFile({
          userId,
          fileName: playbookId,
        })
      ).unwrap()
      const builderSessionId = existing
        ? existing.id
        : (
            await dispatch(
              createBuilderSession({ userId, skipKickoff: true })
            ).unwrap()
          ).id

      dispatch(messagesCleared())
      navigate(`/playbook-builder/${builderSessionId}`, {
        state: {
          autoSendMessage: `I want a few tweaks in this "${
            typeof name === "string" ? name : playbookId
          }" playbook.`,
        },
      })
    } catch {
      toast.error("Couldn't start an edit session for this playbook.")
    } finally {
      setIsEditingSandboxPlaybook(false)
    }
  }

  const handlePromoteSandboxPlaybook = async () => {
    const playbookId = session?.state?.playbook_id
    const name = session?.state?.playbook_name
    if (typeof playbookId !== "string" || sandboxPlaybookBusy) return

    setIsPromotingSandboxPlaybook(true)
    try {
      await dispatch(
        promoteSandboxPlaybook({ playbookId, userId })
      ).unwrap()
      toast.success(
        `"${typeof name === "string" ? name : playbookId}" moved to Playbooks`
      )
      navigate("/playbooks")
    } catch (error) {
      const message =
        error instanceof ApiError && error.status === 409
          ? `A published playbook already uses the name "${playbookId}" — rename one of them and try again.`
          : "Couldn't move this playbook to Playbooks. Please try again."
      toast.error(message)
    } finally {
      setIsPromotingSandboxPlaybook(false)
    }
  }

  const playbookName =
    typeof session?.state?.playbook_name === "string"
      ? session.state.playbook_name
      : null
  const isPlaybookSeeded =
    Boolean(playbookName) &&
    messages.length > 0 &&
    messages[0].author === "user"
  const pinnedMessage =
    isPlaybookSeeded && messages.length > 1 && messages[1].author !== "user"
      ? messages[1]
      : null
  const displayMessages = isPlaybookSeeded
    ? messages.slice(pinnedMessage ? 2 : 1)
    : messages
  // Treat idle+session as loading so create/edit navigation never paints a blank chat.
  const isHistoryLoading =
    historyStatus === "loading" || (Boolean(id) && historyStatus === "idle")
  const showPlaybookPanel =
    Boolean(playbookName) && (isHistoryLoading || isPlaybookSeeded)
  const showEmptyState =
    !showPlaybookPanel &&
    (historyStatus === "success" || !id) &&
    messages.length === 0 &&
    !isSending

  React.useEffect(() => {
    if (
      !hasScrolledToConversationRef.current &&
      showPlaybookPanel &&
      historyStatus === "success" &&
      conversationMarkerRef.current
    ) {
      conversationMarkerRef.current.scrollIntoView({ block: "start" })
      hasScrolledToConversationRef.current = true
      return
    }
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [messages, isSending, showPlaybookPanel, historyStatus])

  return (
    <div className="agent-workbench flex h-full flex-col bg-background text-sm leading-loose">
      {isSandboxTest && (
        <div className="flex shrink-0 items-center justify-between gap-2 border-b bg-card px-6 py-2.5">
          <div className="flex min-w-0 items-center gap-1.5 text-xs text-muted-foreground">
            <FlaskConical className="size-3.5 shrink-0" />
            <span className="truncate">
              Sandbox test{playbookName ? ` — ${playbookName}` : ""}
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleEditSandboxPlaybook}
              disabled={sandboxPlaybookBusy}
              className="cursor-pointer gap-1.5"
            >
              {isEditingSandboxPlaybook ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : (
                <Pencil className="size-3.5 shrink-0" />
              )}
              {isEditingSandboxPlaybook ? "Opening…" : "Edit"}
            </Button>
            <Button
              type="button"
              size="sm"
              onClick={handlePromoteSandboxPlaybook}
              disabled={sandboxPlaybookBusy}
              className="cursor-pointer gap-1.5"
            >
              {isPromotingSandboxPlaybook ? (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              ) : (
                <ArrowRightCircle className="size-3.5 shrink-0" />
              )}
              {isPromotingSandboxPlaybook ? "Moving…" : "Move to Playbooks"}
            </Button>
          </div>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col overflow-hidden p-6 pb-4">
        <div
          ref={messagesScrollRef}
          className="min-h-0 flex-1 overflow-auto p-4"
          onScroll={(event) =>
            setIsNearTop(event.currentTarget.scrollTop < 80)
          }
        >
          {showPlaybookPanel && (
            <>
              <div className="mb-4 border-b-2 border-black pb-4">
                <PlaybookAnalysisPanel
                  playbookName={playbookName!}
                  message={pinnedMessage}
                  loading={isHistoryLoading}
                  sessionId={id}
                  isSandboxTest={isSandboxTest}
                />
              </div>
              <div
                ref={conversationMarkerRef}
                className="mb-4 flex items-center justify-center gap-1.5"
              >
                <MessageCircle className="size-3.5 text-muted-foreground" />
                <span className="text-xs font-semibold tracking-wide text-muted-foreground uppercase">
                  Conversation
                </span>
              </div>
            </>
          )}
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
              <img
                src={ChatBalloon}
                alt=""
                className="h-auto w-32 opacity-70"
              />
              <div className="flex flex-col gap-1 text-muted-foreground">
                <span className="text-base font-semibold text-card-foreground">
                  {isBuilder
                    ? "What playbook do you want to build?"
                    : "Curious about something?"}
                </span>
                <span>
                  {isBuilder
                    ? "Describe the recurring report or analysis you need — let's turn it into a playbook."
                    : "Ask away — let's dig into the data together."}
                </span>
              </div>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              {isHistoryLoading && messages.length === 0 && (
                <div className="flex flex-col gap-3">
                  <div className="flex flex-col items-start gap-1">
                    <Skeleton className="h-9 w-2/5 rounded-2xl" />
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    <Skeleton className="h-9 w-1/3 rounded-2xl" />
                  </div>
                  <div className="flex flex-col items-start gap-1">
                    <Skeleton className="h-9 w-1/2 rounded-2xl" />
                  </div>
                </div>
              )}
              {historyStatus === "error" && (
                <span className="text-xs text-destructive">
                  Couldn&apos;t load this conversation.
                </span>
              )}
              {displayMessages.map((item, index) => (
                <MessageRow
                  key={`${item.timestamp}-${index}`}
                  item={item}
                  index={index}
                  exportingKey={exportingKey}
                  sessionId={id}
                  interactive={
                    index === displayMessages.length - 1 && !isSending
                  }
                  showDownload={!isBuilder && !isSandboxTest}
                  onSendMessage={(text) => submitMessage(text)}
                  onTestPlaybook={handleTestPlaybook}
                  onGoToSandbox={handleGoToSandbox}
                  onGoToPlaybooks={handleGoToPlaybooks}
                  onDownload={handleDownload}
                />
              ))}
              {isSending && (
                <div className="flex min-w-0 flex-col items-start gap-1">
                  <MessageIdentity isUser={false} />
                  <ThinkingSection thoughts={sendingThoughts} alwaysShow />
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>
      </div>
      <div className="relative z-10 w-full border-t bg-card">
        {showPlaybookPanel && (
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="absolute right-8 -top-11 z-20 cursor-pointer gap-1.5 rounded-full border-link bg-card text-link shadow-md hover:bg-[color-mix(in_oklab,var(--link)_12%,var(--card))] hover:text-link"
            onClick={() =>
              messagesScrollRef.current?.scrollTo({
                top: isNearTop
                  ? messagesScrollRef.current.scrollHeight
                  : 0,
                behavior: "smooth",
              })
            }
          >
            {isNearTop ? (
              <>
                <ArrowDownToLine className="size-3.5" />
                Go to bottom
              </>
            ) : (
              <>
                <ArrowUpToLine className="size-3.5" />
                Go to top
              </>
            )}
          </Button>
        )}
        {isSandboxBlocked ? (
          <div className="flex flex-col gap-3">
            <div className="flex w-full items-center gap-2 border-b border-sky-500/20 bg-sky-500/10 px-4 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <Info className="size-4 shrink-0" />
              <span>
                This sandbox session has reached its testing limit. Edit this
                playbook or move it to Playbooks to keep going.
              </span>
            </div>
            <div className="flex items-center justify-center gap-2 px-4 pb-4">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleEditSandboxPlaybook}
                disabled={sandboxPlaybookBusy}
                className="cursor-pointer gap-1.5"
              >
                {isEditingSandboxPlaybook ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <Pencil className="size-3.5 shrink-0" />
                )}
                {isEditingSandboxPlaybook
                  ? "Opening…"
                  : "Edit sandbox playbook"}
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePromoteSandboxPlaybook}
                disabled={sandboxPlaybookBusy}
                className="cursor-pointer gap-1.5"
              >
                {isPromotingSandboxPlaybook ? (
                  <Loader2 className="size-3.5 shrink-0 animate-spin" />
                ) : (
                  <ArrowRightCircle className="size-3.5 shrink-0" />
                )}
                {isPromotingSandboxPlaybook ? "Moving…" : "Move to Playbooks"}
              </Button>
            </div>
          </div>
        ) : (
          <form className="flex items-center gap-2 p-4" onSubmit={handleSubmit}>
            {!isBuilder && !isSandboxTest && (
              <Button
                type="button"
                variant="outline"
                size="icon"
                className="size-10 shrink-0 cursor-pointer rounded-full"
                aria-label="Add context"
                onClick={() => setFileDialogOpen(true)}
              >
                <Paperclip className="size-4" />
              </Button>
            )}
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder={
                isBuilder
                  ? "Describe the playbook you want to build…"
                  : "Ask a question about this analysis…"
              }
              className="h-10 flex-1 rounded-full px-4"
            />
            <Button
              type="submit"
              size="icon"
              className="size-10 shrink-0 cursor-pointer rounded-full"
              aria-label="Send"
              disabled={isSending || !message.trim()}
            >
              <ArrowUp className="size-4" />
            </Button>
          </form>
        )}
      </div>
      <FileUploadDialog
        open={fileDialogOpen}
        onOpenChange={setFileDialogOpen}
        sessionId={id}
        userId={userId}
      />
      <Toaster />
    </div>
  )
}

