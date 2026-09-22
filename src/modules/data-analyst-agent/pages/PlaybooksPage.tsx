import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Toaster } from "sonner"
import {
  AlarmClock,
  BookOpen,
  ChartPie,
  CheckCircle2,
  ChevronDown,
  Clock,
  Loader2,
  Pencil,
  Plus,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react"

import { cn } from "@/modules/data-analyst-agent/lib/utils"
import { Badge } from "@/modules/data-analyst-agent/ui/badge"
import { Button } from "@/modules/data-analyst-agent/ui/button"
import { Checkbox } from "@/modules/data-analyst-agent/ui/checkbox"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/modules/data-analyst-agent/ui/alert-dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/modules/data-analyst-agent/ui/dropdown-menu"
import { Skeleton } from "@/modules/data-analyst-agent/ui/skeleton"
import { useAppDispatch, useAppSelector, useAgentUserId } from "@/modules/data-analyst-agent/state/hooks"
import { fetchPlaybooks, removePlaybook, type Playbook } from "@/modules/data-analyst-agent/state/slices/playbooksSlice"
import {
  fetchLatestPlaybookRuns,
  formatPlaybookRunTimestamp,
  type PlaybookRun,
} from "@/modules/data-analyst-agent/state/slices/playbookRunsSlice"
import { fetchScheduleTriggers } from "@/modules/data-analyst-agent/state/slices/scheduleTriggersSlice"
import {
  createBuilderSession,
  createSession,
  findBuilderSessionForPlaybook,
} from "@/modules/data-analyst-agent/state/slices/sessionsSlice"
import { messagesCleared } from "@/modules/data-analyst-agent/state/slices/messagesSlice"

export function PlaybooksPage() {
  const navigate = useNavigate()
  const dispatch = useAppDispatch()
  const userId = useAgentUserId()
  const playbooks = useAppSelector((state) => state.playbooks.items)
  const status = useAppSelector((state) => state.playbooks.status)
  const runs = useAppSelector((state) => state.playbookRuns.latestItems)
  const scheduleTriggers = useAppSelector((state) => state.scheduleTriggers.items)
  const [openingId, setOpeningId] = React.useState<string | null>(null)
  const [editingId, setEditingId] = React.useState<string | null>(null)
  const [actionError, setActionError] = React.useState<string | null>(null)
  const [isStartingBuilder, setIsStartingBuilder] = React.useState(false)
  const [selectedVersions, setSelectedVersions] = React.useState<
    Record<string, number>
  >({})
  const [isSelectMode, setIsSelectMode] = React.useState(false)
  const [selectedIds, setSelectedIds] = React.useState<Set<string>>(new Set())
  const [confirmOpen, setConfirmOpen] = React.useState(false)
  const [isDeleting, setIsDeleting] = React.useState(false)

  React.useEffect(() => {
    dispatch(fetchPlaybooks(userId))
  }, [dispatch, userId])

  React.useEffect(() => {
    dispatch(fetchLatestPlaybookRuns(userId))
  }, [dispatch, userId])

  React.useEffect(() => {
    dispatch(fetchScheduleTriggers(userId))
  }, [dispatch, userId])

  const lastRunByPlaybook = React.useMemo(() => {
    const map = new Map<string, PlaybookRun>()
    for (const run of runs) {
      map.set(run.playbook_name, run)
    }
    return map
  }, [runs])

  const scheduledPlaybookIds = React.useMemo(() => {
    const ids = new Set<string>()
    for (const trigger of scheduleTriggers) {
      if (trigger.is_active) ids.add(trigger.playbook_id)
    }
    return ids
  }, [scheduleTriggers])

  const busyId = openingId ?? editingId

  const handleCreatePlaybook = async () => {
    if (isStartingBuilder) return
    setActionError(null)
    setIsStartingBuilder(true)
    try {
      const session = await dispatch(
        createBuilderSession({ userId })
      ).unwrap()
      dispatch(messagesCleared())
      navigate(`/playbook-builder/${session.id}`)
    } catch {
      setActionError("Couldn't start the Playbook Builder. Please try again.")
      setIsStartingBuilder(false)
    }
  }

  const handleOpenPlaybook = async (playbook: Playbook, version: number) => {
    if (busyId) return
    setActionError(null)
    setOpeningId(playbook.id)
    try {
      const session = await dispatch(
        createSession({
          userId,
          playbook: playbook.id,
          playbookVersion: version,
        })
      ).unwrap()
      dispatch(messagesCleared())
      navigate(`/agent/${session.id}`)
    } catch {
      setActionError(
        `Couldn't start a chat from "${playbook.name}". Please try again.`
      )
      setOpeningId(null)
    }
  }

  const handleEdit = async (playbook: Playbook) => {
    if (busyId) return
    setActionError(null)
    setEditingId(playbook.id)
    try {
      const existing = await dispatch(
        findBuilderSessionForPlaybook({
          userId,
          playbookId: playbook.id,
        })
      ).unwrap()
      const sessionId = existing
        ? existing.id
        : (
            await dispatch(
              createBuilderSession({
                userId,
                skipKickoff: true,
                editingPlaybookId: playbook.id,
              })
            ).unwrap()
          ).id

      dispatch(messagesCleared())
      navigate(`/playbook-builder/${sessionId}`, {
        state: {
          autoSendMessage: `I want a few tweaks in this "${playbook.name}" playbook.`,
        },
      })
    } catch {
      setActionError(
        `Couldn't start an edit session for "${playbook.name}". Please try again.`
      )
    } finally {
      setEditingId(null)
    }
  }

  const handleToggleSelectMode = () => {
    setIsSelectMode((prev) => !prev)
    setSelectedIds(new Set())
  }

  const handleToggleSelected = (playbookId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(playbookId)) {
        next.delete(playbookId)
      } else {
        next.add(playbookId)
      }
      return next
    })
  }

  const selectedPlaybooks = playbooks.filter((playbook) =>
    selectedIds.has(playbook.id)
  )

  const handleConfirmDelete = async () => {
    if (isDeleting || selectedIds.size === 0) return
    setIsDeleting(true)
    setActionError(null)

    const ids = Array.from(selectedIds)
    const results = await Promise.allSettled(
      ids.map((id) =>
        dispatch(removePlaybook({ playbookId: id, userId })).unwrap()
      )
    )

    const failedIds = new Set<string>()
    ids.forEach((id, index) => {
      if (results[index].status === "rejected") failedIds.add(id)
    })

    setSelectedIds(failedIds)
    if (failedIds.size > 0) {
      setActionError(
        `Couldn't delete ${failedIds.size} playbook${failedIds.size === 1 ? "" : "s"}. Please try again.`
      )
    } else {
      setIsSelectMode(false)
    }

    setIsDeleting(false)
    setConfirmOpen(false)
  }

  return (
    <div className="agent-workbench flex flex-col gap-4 p-6 text-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-base font-semibold text-foreground">Playbooks</h1>
          <p className="text-muted-foreground">
            Dataset context available to the agent. Open one to start a chat
            seeded with an analysis of that dataset.
          </p>
        </div>
        {status === "success" && playbooks.length > 0 && (
          <div className="flex shrink-0 items-center gap-2">
            {isSelectMode && selectedIds.size > 0 && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="cursor-pointer gap-1.5"
                onClick={() => setConfirmOpen(true)}
              >
                <Trash2 className="size-3.5 shrink-0" />
                Delete ({selectedIds.size})
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="cursor-pointer gap-1.5"
              onClick={handleToggleSelectMode}
            >
              {isSelectMode ? (
                <X className="size-3.5 shrink-0" />
              ) : (
                <Pencil className="size-3.5 shrink-0" />
              )}
              {isSelectMode ? "Done" : "Edit"}
            </Button>
          </div>
        )}
      </div>

      {actionError && <p className="text-xs text-destructive">{actionError}</p>}

      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedPlaybooks.length} playbook
              {selectedPlaybooks.length === 1 ? "" : "s"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This permanently deletes{" "}
              {selectedPlaybooks.map((p) => p.name).join(", ")} and every saved
              version. This can&apos;t be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <Button
              type="button"
              variant="destructive"
              className="cursor-pointer gap-1.5"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting && (
                <Loader2 className="size-3.5 shrink-0 animate-spin" />
              )}
              {isDeleting ? "Deleting…" : "Delete"}
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(status === "loading" || status === "idle") && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <div
              key={index}
              className="flex flex-col gap-2 rounded-xl border bg-card p-4"
            >
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ))}
        </div>
      )}

      {status === "error" && (
        <p className="text-xs text-destructive">
          Couldn&apos;t load playbooks. Please try again.
        </p>
      )}

      {status === "success" && playbooks.length === 0 && (
        <p className="text-xs text-muted-foreground">No playbooks yet.</p>
      )}

      {status === "success" && playbooks.length > 0 && (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {playbooks.map((playbook) => {
            const isOpening = openingId === playbook.id
            const isEditing = editingId === playbook.id
            const isDisabled = busyId !== null && busyId !== playbook.id
            const selectedVersion =
              selectedVersions[playbook.id] ?? playbook.version_count
            const lastRun = lastRunByPlaybook.get(playbook.name)
            const isSuccess = lastRun?.status === "Completed"
            const isFailed = lastRun?.status === "Failed"
            const lastRunLabel = lastRun
              ? (() => {
                  const { date, time, day } = formatPlaybookRunTimestamp(
                    lastRun.last_run
                  )
                  return `${date} · ${time} · ${day}`
                })()
              : "Not run yet"

            const isSelected = selectedIds.has(playbook.id)
            const isScheduled = scheduledPlaybookIds.has(playbook.id)
            const canOpenLastRun = !isSelectMode && !isDisabled && Boolean(lastRun)

            const handleCardClick = () => {
              if (isSelectMode) {
                handleToggleSelected(playbook.id)
                return
              }
              if (canOpenLastRun && lastRun) {
                navigate(`/agent/${lastRun.session_id}`)
              }
            }

            return (
              <div
                key={playbook.id}
                onClick={handleCardClick}
                className={cn(
                  "group relative flex flex-col gap-2 rounded-xl border p-4 text-left shadow-sm transition-all duration-150 hover:shadow-md",
                  isSuccess && "border-emerald-500/20 bg-emerald-500/5",
                  isFailed && "border-destructive/20 bg-destructive/5",
                  !lastRun && "bg-card",
                  isDisabled && "opacity-50",
                  (isSelectMode || canOpenLastRun) && "cursor-pointer",
                  canOpenLastRun && "hover:-translate-y-0.5 hover:border-link/30",
                  isSelected && "border-link/40 ring-1 ring-link/30"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex min-w-0 items-center gap-2">
                    {isSelectMode ? (
                      <Checkbox
                        checked={isSelected}
                        onCheckedChange={() =>
                          handleToggleSelected(playbook.id)
                        }
                        onClick={(event) => event.stopPropagation()}
                      />
                    ) : (
                      <BookOpen className="size-4 shrink-0 text-muted-foreground" />
                    )}
                    <span className="truncate font-semibold text-card-foreground">
                      {playbook.name}
                    </span>
                    {isScheduled && (
                      <AlarmClock className="size-3.5 shrink-0 text-yellow-500 dark:text-yellow-400">
                        <title>Scheduled to run automatically</title>
                      </AlarmClock>
                    )}
                  </div>
                  <div className="flex shrink-0 items-center gap-1">
                    <Button
                      type="button"
                      size="icon-xs"
                      variant="ghost"
                      aria-label="Edit playbook"
                      onClick={(event) => {
                        event.stopPropagation()
                        handleEdit(playbook)
                      }}
                      disabled={busyId !== null || isSelectMode}
                      className="cursor-pointer"
                    >
                      {isEditing ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Pencil />
                      )}
                    </Button>
                    {lastRun && (
                      <Badge
                        variant={isSuccess ? undefined : "destructive"}
                        className={cn(
                          "shrink-0 gap-1",
                          isSuccess &&
                            "bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400"
                        )}
                      >
                        {isSuccess ? (
                          <CheckCircle2 className="size-3" />
                        ) : (
                          <XCircle className="size-3" />
                        )}
                        {isSuccess ? "Success" : "Failed"}
                      </Badge>
                    )}
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">
                  {playbook.description || "No description available."}
                </p>
                <div
                  className="flex items-center"
                  onClick={(event) => event.stopPropagation()}
                >
                  {playbook.version_count === 1 ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled
                      className="gap-1"
                    >
                      {playbook.name}-v{playbook.version_count}
                    </Button>
                  ) : (
                    <DropdownMenu>
                      <DropdownMenuTrigger
                        render={
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={busyId !== null || isSelectMode}
                            className="cursor-pointer gap-1"
                          >
                            {playbook.name}-v{selectedVersion}
                            <ChevronDown className="size-3.5 shrink-0" />
                          </Button>
                        }
                      />
                      <DropdownMenuContent align="start" className="min-w-40">
                        {Array.from(
                          { length: playbook.version_count },
                          (_, i) => playbook.version_count - i
                        ).map((v) => (
                          <DropdownMenuItem
                            key={v}
                            onClick={() =>
                              setSelectedVersions((prev) => ({
                                ...prev,
                                [playbook.id]: v,
                              }))
                            }
                            className="cursor-pointer"
                          >
                            {playbook.name}-v{v}
                            {v === playbook.version_count && " (latest)"}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
                <div className="mt-1 flex items-center justify-between gap-2 pt-1">
                  <span className="flex min-w-0 items-center gap-1 truncate text-xs text-muted-foreground">
                    <Clock className="size-3 shrink-0" />
                    {canOpenLastRun ? (
                      <>
                        <span className="truncate group-hover:hidden">
                          {lastRunLabel}
                        </span>
                        <span className="hidden truncate font-medium text-foreground group-hover:inline">
                          View last analysis
                        </span>
                      </>
                    ) : (
                      <span className="truncate">{lastRunLabel}</span>
                    )}
                  </span>
                  <Button
                    type="button"
                    size="sm"
                    onClick={(event) => {
                      event.stopPropagation()
                      handleOpenPlaybook(playbook, selectedVersion)
                    }}
                    disabled={busyId !== null || isSelectMode}
                    className="cursor-pointer gap-1.5"
                  >
                    {isOpening ? (
                      <Loader2 className="size-3.5 shrink-0 animate-spin" />
                    ) : (
                      <ChartPie className="size-3.5 shrink-0" />
                    )}
                    {isOpening ? "Analyzing…" : "Analyse"}
                  </Button>
                </div>
              </div>
            )
          })}
        </div>
      )}

      <div className="fixed right-6 bottom-6 z-40 flex flex-col items-end gap-2">
        {isStartingBuilder ? (
          <Button
            type="button"
            size="lg"
            disabled
            className="gap-2 rounded-full px-4 shadow-lg"
          >
            <Loader2 className="size-4 animate-spin" />
            Starting Playbook Builder…
          </Button>
        ) : (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  type="button"
                  size="lg"
                  className="cursor-pointer gap-2 rounded-full px-4 shadow-lg"
                >
                  <Plus className="size-4" />
                  Create Playbook
                </Button>
              }
            />
            <DropdownMenuContent
              side="top"
              align="end"
              sideOffset={8}
              className="w-64 min-w-64 p-2"
            >
              <DropdownMenuItem
                onClick={handleCreatePlaybook}
                className="cursor-pointer gap-2.5 rounded-lg px-3 py-2.5 text-sm"
              >
                <Sparkles className="size-4" />
                Build With Agent
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
      <Toaster />
    </div>
  )
}

