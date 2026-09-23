import * as React from "react"
import { useNavigate, useParams } from "react-router-dom"
import {
  ArrowUp,
  Database,
  Loader2,
  MessageSquarePlus,
  Paperclip,
  Square,
  Trash2,
  X,
} from "lucide-react"

import { usePaths } from "@/app/usePaths"
import { Button } from "@/modules/data-analyst-agent/ui/button"
import { Input } from "@/modules/data-analyst-agent/ui/input"
import { Skeleton } from "@/modules/data-analyst-agent/ui/skeleton"
import { Badge } from "@/modules/data-analyst-agent/ui/badge"
import { MarkdownText } from "@/modules/data-analyst-agent/tools/markdown-text"
import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { useAnalystChat } from "@/modules/data-analyst-agent/state/useAnalystChat"
import type { AdkSessionSummary } from "@/api/adkAgentApi"

function formatSessionLabel(session: AdkSessionSummary): string {
  if (session.lastUpdateTime) {
    return new Date(session.lastUpdateTime * 1000).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    })
  }
  return session.sessionId.slice(0, 8)
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

/**
 * The Data Analyst chat — talks to the ADK Agent Runtime API's "data_analyst"
 * agent, not the older Mojo backend Playbook Builder still uses.
 *
 * A session's workspace_id is a context-layer connection's id, so there is
 * nothing to pick here beyond this company's one connected warehouse; see
 * useAnalystChat for how that's resolved.
 */
export function AnalystChatPage() {
  const { id: sessionId } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const paths = usePaths()
  const [message, setMessage] = React.useState("")
  const fileInputRef = React.useRef<HTMLInputElement>(null)
  const messagesEndRef = React.useRef<HTMLDivElement>(null)

  const {
    connection,
    workspaceStatus,
    sessions,
    turns,
    historyStatus,
    artifacts,
    stagedArtifactIds,
    uploading,
    sending,
    streamingText,
    streamingToolCalls,
    sendMessage,
    interrupt,
    uploadFile,
    removeArtifact,
    startNewChat,
    removeSession,
  } = useAnalystChat(sessionId)

  React.useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: "end" })
  }, [turns, streamingText, sending])

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault()
    const text = message.trim()
    if (!text || sending) return
    setMessage("")
    void sendMessage(text)
  }

  const handleFilePicked = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    event.target.value = ""
    if (file) void uploadFile(file)
  }

  const stagedArtifacts = artifacts.filter((artifact) => stagedArtifactIds.includes(artifact.id))
  const savedArtifacts = artifacts.filter((artifact) => !stagedArtifactIds.includes(artifact.id))
  const isHistoryLoading = historyStatus === "loading"
  const showEmptyState = !isHistoryLoading && turns.length === 0 && !sending

  if (workspaceStatus === "loading") {
    return (
      <div className="agent-workbench flex h-full flex-col gap-3 bg-background p-6">
        <Skeleton className="h-9 w-2/5 rounded-2xl" />
        <Skeleton className="h-9 w-1/3 rounded-2xl" />
        <Skeleton className="h-9 w-1/2 rounded-2xl" />
      </div>
    )
  }

  if (workspaceStatus === "error" || !connection) {
    return (
      <div className="agent-workbench flex h-full flex-col items-center justify-center gap-3 bg-background p-6 text-center text-sm">
        <Database className="size-8 text-muted-foreground" aria-hidden />
        <p className="font-medium text-card-foreground">No connected warehouse yet</p>
        <p className="max-w-sm text-muted-foreground">
          The Data Analyst agent needs a connected warehouse to analyse. Connect one from the
          context layer, then come back here.
        </p>
        <Button type="button" size="sm" onClick={() => navigate(paths.context)}>
          Go to Context layer
        </Button>
      </div>
    )
  }

  return (
    <div className="agent-workbench flex h-full bg-background text-sm leading-loose">
      {/* Sessions — the session-based store: past chats for this warehouse. */}
      <aside className="hidden w-56 shrink-0 flex-col border-r bg-card sm:flex">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <span className="truncate text-xs font-medium text-muted-foreground">
            {connection.name}
          </span>
        </div>
        <div className="p-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full cursor-pointer gap-1.5"
            onClick={startNewChat}
          >
            <MessageSquarePlus className="size-3.5" />
            New chat
          </Button>
        </div>
        <div className="min-h-0 flex-1 overflow-auto px-2 pb-2">
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-muted-foreground">No chats yet.</p>
          ) : (
            <ul className="flex flex-col gap-0.5">
              {sessions.map((session) => {
                const active = session.sessionId === sessionId
                return (
                  <li key={session.sessionId} className="group flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => navigate(paths.dataAnalyst(session.sessionId))}
                      className={cn(
                        "flex-1 truncate rounded-md px-2 py-1.5 text-left text-xs transition-colors",
                        active
                          ? "bg-accent text-accent-foreground"
                          : "text-muted-foreground hover:bg-muted/60 hover:text-foreground"
                      )}
                    >
                      {formatSessionLabel(session)}
                    </button>
                    <button
                      type="button"
                      aria-label="Delete chat"
                      onClick={() => void removeSession(session.sessionId)}
                      className="cursor-pointer rounded-md p-1.5 text-muted-foreground opacity-0 transition-opacity hover:text-destructive group-hover:opacity-100"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="min-h-0 flex-1 overflow-auto p-4">
          {showEmptyState ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 text-center text-muted-foreground">
              <span className="text-base font-semibold text-card-foreground">
                Curious about something?
              </span>
              <span>Ask away — let's dig into {connection.name}'s data together.</span>
            </div>
          ) : (
            <div className="flex min-w-0 flex-col gap-3">
              {isHistoryLoading ? (
                <div className="flex flex-col gap-3">
                  <Skeleton className="h-9 w-2/5 rounded-2xl" />
                  <Skeleton className="ml-auto h-9 w-1/3 rounded-2xl" />
                  <Skeleton className="h-9 w-1/2 rounded-2xl" />
                </div>
              ) : (
                turns.map((turn, index) => {
                  const isUser = turn.role === "user"
                  return (
                    <div
                      key={index}
                      className={cn("flex flex-col gap-1", isUser ? "items-end" : "items-start")}
                    >
                      <div
                        className={cn(
                          "max-w-[85%] rounded-2xl px-3.5 py-2",
                          isUser
                            ? "bg-primary text-primary-foreground"
                            : "bg-muted text-foreground"
                        )}
                      >
                        {isUser ? (
                          <span className="whitespace-pre-wrap">{turn.text}</span>
                        ) : (
                          <MarkdownText text={turn.text} />
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              {sending && (
                <div className="flex flex-col items-start gap-1">
                  <div className="max-w-[85%] rounded-2xl bg-muted px-3.5 py-2 text-foreground">
                    {streamingToolCalls.map((name, index) => (
                      <Badge key={`${name}-${index}`} variant="outline" className="mr-1.5 mb-1.5">
                        {name}
                      </Badge>
                    ))}
                    {streamingText ? (
                      <MarkdownText text={streamingText} />
                    ) : (
                      <Loader2 className="size-4 animate-spin text-muted-foreground" aria-hidden />
                    )}
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        <div className="border-t bg-card p-4">
          {(stagedArtifacts.length > 0 || savedArtifacts.length > 0) && (
            <div className="mb-2 flex flex-wrap gap-1.5">
              {stagedArtifacts.map((artifact) => (
                <span
                  key={artifact.id}
                  className="flex items-center gap-1.5 rounded-full border border-primary/30 bg-primary/10 px-2.5 py-1 text-xs text-primary"
                >
                  <Paperclip className="size-3" aria-hidden />
                  {artifact.filename}
                  <span className="text-primary/70">({formatFileSize(artifact.sizeBytes)})</span>
                  <button
                    type="button"
                    aria-label={`Remove ${artifact.filename}`}
                    onClick={() => void removeArtifact(artifact.id)}
                    className="cursor-pointer text-primary/70 hover:text-primary"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
              {savedArtifacts.map((artifact) => (
                <span
                  key={artifact.id}
                  className="flex items-center gap-1.5 rounded-full border bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                >
                  <Paperclip className="size-3" aria-hidden />
                  {artifact.filename}
                  <button
                    type="button"
                    aria-label={`Delete ${artifact.filename}`}
                    onClick={() => void removeArtifact(artifact.id)}
                    className="cursor-pointer hover:text-destructive"
                  >
                    <X className="size-3" />
                  </button>
                </span>
              ))}
            </div>
          )}
          <form className="flex items-center gap-2" onSubmit={handleSubmit}>
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-10 shrink-0 cursor-pointer rounded-full"
              aria-label="Attach a file"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Paperclip className="size-4" />
              )}
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              className="hidden"
              onChange={handleFilePicked}
            />
            <Input
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask a question about this data…"
              className="h-10 flex-1 rounded-full px-4"
              disabled={sending}
            />
            {sending ? (
              <Button
                type="button"
                size="icon"
                variant="outline"
                className="size-10 shrink-0 cursor-pointer rounded-full"
                aria-label="Stop"
                onClick={interrupt}
              >
                <Square className="size-4" />
              </Button>
            ) : (
              <Button
                type="submit"
                size="icon"
                className="size-10 shrink-0 cursor-pointer rounded-full"
                aria-label="Send"
                disabled={!message.trim()}
              >
                <ArrowUp className="size-4" />
              </Button>
            )}
          </form>
        </div>
      </div>
    </div>
  )
}
