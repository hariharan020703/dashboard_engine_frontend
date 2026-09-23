import * as React from 'react'
import { useNavigate } from 'react-router-dom'
import { usePaths } from '@/app/usePaths'
import { useAsync } from '@/hooks/useAsync'
import { notify } from '@/components/common/notify'
import { listConnections } from '@/modules/context-layer/api'
import {
  createAdkSession,
  deleteAdkArtifact,
  deleteAdkSession,
  getAdkSession,
  interruptAdkSession,
  listAdkArtifacts,
  listAdkSessions,
  streamAdkMessage,
  uploadAdkArtifact,
  type AdkArtifactMeta,
  type AdkChatTurn,
} from '@/api/adkAgentApi'

const AGENT_NAME = 'data_analyst' as const

/**
 * Everything the Data Analyst chat page needs, against the ADK Agent Runtime
 * API (see src/api/adkAgentApi.ts).
 *
 * The workspace_id every call needs IS a context-layer connection's id — that
 * backend has no workspace concept of its own — so this hook resolves one
 * (this company's connected warehouse) before anything else can happen. A
 * session is created lazily, on the first message or upload, exactly like the
 * older Mojo-backed chat did — there is no value in a session that was never
 * talked to.
 *
 * Loaded history (turns, artifacts) comes from `useAsync`. What a chat turn or
 * an upload adds is layered on top as an "override" TAGGED with the
 * (workspace, session) it belongs to — the same derive-don't-sync-effects
 * shape `ConnectionDatasetsPage` uses for its dataset selection. That tag is
 * what lets switching sessions fall back to the freshly loaded history
 * without an effect ever having to reset anything.
 */
export function useAnalystChat(sessionId: string | undefined) {
  const navigate = useNavigate()
  const paths = usePaths()

  const workspace = useAsync(() => listConnections(), [])
  const connection = workspace.data
    ? workspace.data.find((c) => c.status === 'connected') ?? workspace.data[0] ?? null
    : null
  const workspaceId = connection?.id ?? null
  const workspaceStatus = workspace.loading ? 'loading' : workspace.error ? 'error' : 'success'

  const sessions = useAsync(
    () => (workspaceId ? listAdkSessions(workspaceId, AGENT_NAME) : Promise.resolve([])),
    [workspaceId]
  )
  const sessionList = React.useMemo(
    () => [...(sessions.data ?? [])].sort((a, b) => (b.lastUpdateTime ?? 0) - (a.lastUpdateTime ?? 0)),
    [sessions.data]
  )

  const historyKey = `${workspaceId ?? ''}:${sessionId ?? ''}`
  const history = useAsync(
    () => {
      if (!workspaceId || !sessionId) return Promise.resolve({ turns: [], artifacts: [] })
      return Promise.all([
        getAdkSession(workspaceId, AGENT_NAME, sessionId),
        listAdkArtifacts(workspaceId, AGENT_NAME, sessionId),
      ]).then(([detail, artifacts]) => ({ turns: detail.turns, artifacts }))
    },
    [workspaceId, sessionId]
  )
  const historyStatus = !sessionId ? 'success' : history.loading ? 'loading' : history.error ? 'error' : 'success'

  const [turnsOverride, setTurnsOverride] = React.useState<{ key: string; turns: AdkChatTurn[] } | null>(
    null
  )
  const [artifactsOverride, setArtifactsOverride] = React.useState<{
    key: string
    artifacts: AdkArtifactMeta[]
  } | null>(null)
  const [stagedOverride, setStagedOverride] = React.useState<{ key: string; ids: string[] } | null>(
    null
  )

  const turns = React.useMemo(
    () => (turnsOverride && turnsOverride.key === historyKey ? turnsOverride.turns : history.data?.turns ?? []),
    [turnsOverride, historyKey, history.data]
  )
  const artifacts = React.useMemo(
    () =>
      artifactsOverride && artifactsOverride.key === historyKey
        ? artifactsOverride.artifacts
        : history.data?.artifacts ?? [],
    [artifactsOverride, historyKey, history.data]
  )
  const stagedArtifactIds = React.useMemo(
    () => (stagedOverride && stagedOverride.key === historyKey ? stagedOverride.ids : []),
    [stagedOverride, historyKey]
  )

  const [uploading, setUploading] = React.useState(false)
  const [sending, setSending] = React.useState(false)
  const [streamingText, setStreamingText] = React.useState('')
  const [streamingToolCalls, setStreamingToolCalls] = React.useState<string[]>([])

  const ensureSession = React.useCallback(async (): Promise<string> => {
    if (sessionId) return sessionId
    if (!workspaceId) throw new Error('No connected warehouse to chat against yet.')
    const created = await createAdkSession(workspaceId, AGENT_NAME)
    navigate(paths.dataAnalyst(created.sessionId), { replace: true })
    return created.sessionId
  }, [sessionId, workspaceId, navigate, paths])

  const sendMessage = React.useCallback(
    async (text: string) => {
      const trimmed = text.trim()
      if (!trimmed || sending || !workspaceId) return

      let sid: string
      try {
        sid = await ensureSession()
      } catch (err) {
        notify.failure('start a chat session', err)
        return
      }
      const key = `${workspaceId}:${sid}`

      // Attached to THIS message only — see ChatMessage.artifact_ids.
      const attachIds = stagedOverride && stagedOverride.key === key ? stagedOverride.ids : []
      setStagedOverride({ key, ids: [] })

      const baseTurns = turnsOverride && turnsOverride.key === key ? turnsOverride.turns : turns
      setTurnsOverride({ key, turns: [...baseTurns, { role: 'user', text: trimmed }] })
      setSending(true)
      setStreamingText('')
      setStreamingToolCalls([])

      try {
        const result = await streamAdkMessage(
          workspaceId,
          AGENT_NAME,
          sid,
          { text: trimmed, artifactIds: attachIds },
          {
            onText: (chunk) => setStreamingText((current) => current + chunk),
            onToolCall: (name) => setStreamingToolCalls((current) => [...current, name]),
          }
        )
        setTurnsOverride((current) => ({
          key,
          turns: [
            ...(current && current.key === key ? current.turns : baseTurns),
            { role: 'model', text: result.interrupted && !result.text ? 'Stopped.' : result.text },
          ],
        }))
        sessions.reload()
      } catch (err) {
        notify.failure('send that message', err)
        setTurnsOverride((current) => ({
          key,
          turns: [
            ...(current && current.key === key ? current.turns : baseTurns),
            { role: 'model', text: 'Something went wrong sending that message. Please try again.' },
          ],
        }))
      } finally {
        setSending(false)
        setStreamingText('')
        setStreamingToolCalls([])
      }
    },
    [sending, workspaceId, ensureSession, stagedOverride, turnsOverride, turns, sessions]
  )

  const interrupt = React.useCallback(() => {
    if (!workspaceId || !sessionId || !sending) return
    interruptAdkSession(workspaceId, AGENT_NAME, sessionId).catch((err) => {
      notify.failure('stop this response', err)
    })
  }, [workspaceId, sessionId, sending])

  const uploadFile = React.useCallback(
    async (file: File) => {
      if (!workspaceId) return
      setUploading(true)
      try {
        const sid = await ensureSession()
        const key = `${workspaceId}:${sid}`
        const meta = await uploadAdkArtifact(workspaceId, AGENT_NAME, sid, file)
        const baseArtifacts =
          artifactsOverride && artifactsOverride.key === key ? artifactsOverride.artifacts : artifacts
        setArtifactsOverride({ key, artifacts: [...baseArtifacts, meta] })
        const baseStaged = stagedOverride && stagedOverride.key === key ? stagedOverride.ids : stagedArtifactIds
        setStagedOverride({ key, ids: [...baseStaged, meta.id] })
      } catch (err) {
        notify.failure('upload that file', err)
      } finally {
        setUploading(false)
      }
    },
    [workspaceId, ensureSession, artifactsOverride, artifacts, stagedOverride, stagedArtifactIds]
  )

  const removeArtifact = React.useCallback(
    async (artifactId: string) => {
      if (!workspaceId || !sessionId) return
      const key = `${workspaceId}:${sessionId}`
      try {
        await deleteAdkArtifact(workspaceId, AGENT_NAME, sessionId, artifactId)
        const baseArtifacts =
          artifactsOverride && artifactsOverride.key === key ? artifactsOverride.artifacts : artifacts
        setArtifactsOverride({
          key,
          artifacts: baseArtifacts.filter((artifact) => artifact.id !== artifactId),
        })
        const baseStaged = stagedOverride && stagedOverride.key === key ? stagedOverride.ids : stagedArtifactIds
        setStagedOverride({ key, ids: baseStaged.filter((id) => id !== artifactId) })
      } catch (err) {
        notify.failure('remove that file', err)
      }
    },
    [workspaceId, sessionId, artifactsOverride, artifacts, stagedOverride, stagedArtifactIds]
  )

  const startNewChat = React.useCallback(() => {
    navigate(paths.dataAnalyst())
  }, [navigate, paths])

  const removeSession = React.useCallback(
    async (targetId: string) => {
      if (!workspaceId) return
      try {
        await deleteAdkSession(workspaceId, AGENT_NAME, targetId)
        sessions.reload()
        if (targetId === sessionId) navigate(paths.dataAnalyst())
      } catch (err) {
        notify.failure('delete that chat', err)
      }
    },
    [workspaceId, sessionId, navigate, paths, sessions]
  )

  return {
    connection,
    workspaceStatus,
    sessions: sessionList,
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
  }
}
