/**
 * The ADK Agent Runtime API (adk_agents/api/main.py) — a separate service
 * from this app's own `BACKEND_URL`, reached directly from the browser (see
 * VITE_ADK_API_BASE_URL) the same way data-analyst-agent's old backend is.
 *
 * Every route is scoped under /workspaces/{workspace_id}/agents/{agent_name}.
 * `workspace_id` is NOT a separate concept — that backend has no workspaces
 * table of its own; a context-layer `Connection`'s id doubles as the
 * workspace_id (see that service's db.py `workspace_exists`), so every caller
 * here passes a connection id. `agent_name` is one of the two agents the
 * backend can drive: "data_analyst" or "context_layer_extractor".
 */

const ADK_API_BASE_URL = import.meta.env.VITE_ADK_API_BASE_URL || 'http://127.0.0.1:8300'
const ADK_API_KEY = import.meta.env.VITE_ADK_API_KEY || ''

export type AdkAgentName = 'data_analyst' | 'context_layer_extractor'

export interface AdkSessionSummary {
  sessionId: string
  workspaceId: string
  agentName: AdkAgentName
  lastUpdateTime: number | null
}

export interface AdkChatTurn {
  role: string
  text: string
}

export interface AdkSessionDetail extends AdkSessionSummary {
  state: Record<string, unknown>
  turns: AdkChatTurn[]
}

export interface AdkChatResponse {
  text: string
  toolCalls: string[]
  interrupted: boolean
}

export interface AdkInterruptResponse {
  interrupted: boolean
  reason: string | null
}

export interface AdkArtifactMeta {
  id: string
  filename: string
  mimeType: string
  sizeBytes: number
  createdAt: string
}

export class AdkApiError extends Error {
  readonly status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = 'AdkApiError'
    this.status = status
  }
}

function authHeaders(): Record<string, string> {
  return ADK_API_KEY ? { 'X-API-Key': ADK_API_KEY } : {}
}

function sessionsBase(workspaceId: string, agentName: AdkAgentName): string {
  return `${ADK_API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/agents/${agentName}/sessions`
}

function sessionUrl(workspaceId: string, agentName: AdkAgentName, sessionId: string): string {
  return `${sessionsBase(workspaceId, agentName)}/${encodeURIComponent(sessionId)}`
}

async function readErrorDetail(res: Response): Promise<string> {
  try {
    const body: unknown = await res.json()
    const detail = (body as { detail?: unknown } | null)?.detail
    if (typeof detail === 'string') return detail
    if (Array.isArray(detail) && detail[0] && typeof detail[0].msg === 'string') {
      return String(detail[0].msg)
    }
  } catch {
    // Not JSON — fall through to the generic message below.
  }
  return `Request failed with status ${res.status}`
}

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers as Record<string, string> | undefined) },
  })
  if (!res.ok) throw new AdkApiError(await readErrorDetail(res), res.status)
  if (res.status === 204) return undefined as T
  return (await res.json()) as T
}

interface RawSessionSummary {
  session_id: string
  workspace_id: string
  agent_name: AdkAgentName
  last_update_time: number | null
}

interface RawSessionDetail extends RawSessionSummary {
  state?: Record<string, unknown>
  turns?: { role: string; text: string }[]
}

interface RawArtifactMeta {
  id: string
  filename: string
  mime_type: string
  size_bytes: number
  created_at: string
}

function toSessionSummary(raw: RawSessionSummary): AdkSessionSummary {
  return {
    sessionId: raw.session_id,
    workspaceId: raw.workspace_id,
    agentName: raw.agent_name,
    lastUpdateTime: raw.last_update_time ?? null,
  }
}

function toSessionDetail(raw: RawSessionDetail): AdkSessionDetail {
  return {
    ...toSessionSummary(raw),
    state: raw.state ?? {},
    turns: (raw.turns ?? []).map((turn) => ({ role: turn.role, text: turn.text })),
  }
}

function toArtifactMeta(raw: RawArtifactMeta): AdkArtifactMeta {
  return {
    id: raw.id,
    filename: raw.filename,
    mimeType: raw.mime_type,
    sizeBytes: raw.size_bytes,
    createdAt: raw.created_at,
  }
}

/**
 * One context object: a single fact the extraction agent wrote.
 *
 * `payload` is JSONB and its shape varies by `object_type` — a `column_stats`
 * row carries null rates and distinct values, a `transformation` row carries
 * inputs and outputs. It is deliberately typed as an open record rather than a
 * union: this service owns that shape, it will grow, and a union here would
 * mean a frontend release every time the skill learns to record something new.
 */
export interface AdkContextObject {
  id: string
  bundle_id: string | null
  session_id: string | null
  object_type: string
  qualified_name: string
  source_type: string
  verified: boolean
  confidence: number | null
  payload: Record<string, unknown> | null
  reviewed_by: string | null
  reviewed_at: string | null
  created_at: string | null
  updated_at: string | null
}

export interface AdkContextObjects {
  workspaceId: string
  /**
   * Which run these came from.
   *
   * Null means this workspace has no session-tagged rows at all, in which case
   * `objects` is empty — a different fact from "the run wrote nothing".
   */
  resolvedSessionId: string | null
  count: number
  objects: AdkContextObject[]
}

/**
 * The facts a run wrote, straight from `context_objects`.
 *
 * Omitting `sessionId` resolves to the workspace's most recent run, which is
 * the normal way to ask "what does the Context Layer currently know about this
 * workspace" without having to hold on to a session id.
 *
 * Not under `/agents/{agent_name}/` — these rows are the store's, not any one
 * agent's conversation, so the route is scoped to the workspace alone.
 */
export async function listAdkContextObjects(
  workspaceId: string,
  sessionId?: string
): Promise<AdkContextObjects> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  const raw = await request<{
    workspace_id: string
    resolved_session_id: string | null
    count: number
    objects: AdkContextObject[]
  }>(`${ADK_API_BASE_URL}/workspaces/${encodeURIComponent(workspaceId)}/context-objects${query}`)

  return {
    workspaceId: raw.workspace_id,
    resolvedSessionId: raw.resolved_session_id ?? null,
    count: raw.count ?? 0,
    objects: raw.objects ?? [],
  }
}

export async function createAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  initialState?: Record<string, unknown>
): Promise<AdkSessionSummary> {
  const raw = await request<RawSessionSummary>(sessionsBase(workspaceId, agentName), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ initial_state: initialState ?? null }),
  })
  return toSessionSummary(raw)
}

export async function listAdkSessions(
  workspaceId: string,
  agentName: AdkAgentName
): Promise<AdkSessionSummary[]> {
  const raw = await request<RawSessionSummary[]>(sessionsBase(workspaceId, agentName))
  return raw.map(toSessionSummary)
}

export async function getAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkSessionDetail> {
  const raw = await request<RawSessionDetail>(sessionUrl(workspaceId, agentName, sessionId))
  return toSessionDetail(raw)
}

export async function deleteAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<void> {
  await request<void>(sessionUrl(workspaceId, agentName, sessionId), { method: 'DELETE' })
}

export async function sendAdkMessage(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  body: {
    text: string
    artifactIds?: string[]
    /**
     * The structured extraction path, for `context_layer_extractor` only —
     * the service answers 422 for any other agent rather than ignoring it.
     *
     * Given these, the backend BUILDS the prompt from them, and `text` becomes
     * optional extra instructions appended to it rather than the message
     * itself. So sending dataset ids and an empty `text` is a complete
     * request, not a half-filled one.
     */
    datasetIds?: string[]
    /** Free-text business context folded into that built prompt. */
    domain?: string
  }
): Promise<AdkChatResponse> {
  /*
   * Only the fields the caller actually supplied.
   *
   * Every optional field on this endpoint is nullable server-side, so sending
   * `"domain": null` is accepted — but it is still a claim about a field the
   * caller never mentioned, and it makes the request on the wire differ from
   * the documented one for no reason. An omitted key and an explicit null mean
   * the same thing to the service and different things to anyone reading a
   * network log.
   */
  const payload: Record<string, unknown> = { text: body.text, stream: false }
  if (body.datasetIds) payload.dataset_ids = body.datasetIds
  if (body.domain) payload.domain = body.domain
  if (body.artifactIds) payload.artifact_ids = body.artifactIds

  const raw = await request<{ text: string; tool_calls?: string[]; interrupted?: boolean }>(
    `${sessionUrl(workspaceId, agentName, sessionId)}/messages`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }
  )
  return {
    text: raw.text ?? '',
    toolCalls: raw.tool_calls ?? [],
    interrupted: Boolean(raw.interrupted),
  }
}

/**
 * Same turn as `sendAdkMessage`, but with `stream: true` — the response is
 * Server-Sent Events instead of one JSON body, so `onText`/`onToolCall` fire
 * as the agent produces each chunk instead of only once the whole turn ends.
 * The returned promise resolves once the stream closes, on `event: done` or
 * `event: interrupted` (the latter from a concurrent POST .../interrupt).
 */
export async function streamAdkMessage(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  body: { text: string; artifactIds?: string[] },
  handlers: { onText?: (chunk: string) => void; onToolCall?: (name: string) => void } = {}
): Promise<AdkChatResponse> {
  const res = await fetch(`${sessionUrl(workspaceId, agentName, sessionId)}/messages`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...authHeaders() },
    body: JSON.stringify({
      text: body.text,
      artifact_ids: body.artifactIds ?? null,
      stream: true,
    }),
  })
  if (!res.ok) throw new AdkApiError(await readErrorDetail(res), res.status)
  if (!res.body) throw new AdkApiError('The stream had no body.', res.status)

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let buffer = ''
  const textChunks: string[] = []
  const toolCalls: string[] = []
  let interrupted = false
  let finished = false

  while (!finished) {
    const { done, value } = await reader.read()
    if (done) break
    buffer += decoder.decode(value, { stream: true })

    let boundary = buffer.indexOf('\n\n')
    while (boundary !== -1) {
      const block = buffer.slice(0, boundary)
      buffer = buffer.slice(boundary + 2)
      boundary = buffer.indexOf('\n\n')

      let eventName: string | null = null
      let dataLine = ''
      for (const line of block.split('\n')) {
        if (line.startsWith('event:')) eventName = line.slice('event:'.length).trim()
        else if (line.startsWith('data:')) dataLine = line.slice('data:'.length).trim()
      }

      if (eventName === 'done') {
        finished = true
        break
      }
      if (eventName === 'interrupted') {
        interrupted = true
        finished = true
        break
      }
      if (!dataLine) continue

      const event = JSON.parse(dataLine) as { type?: string; text?: string; name?: string }
      if (event.type === 'text' && event.text) {
        textChunks.push(event.text)
        handlers.onText?.(event.text)
      } else if (event.type === 'tool_call' && event.name) {
        toolCalls.push(event.name)
        handlers.onToolCall?.(event.name)
      }
    }
  }

  return { text: textChunks.join(''), toolCalls, interrupted }
}

export async function interruptAdkSession(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkInterruptResponse> {
  const raw = await request<{ interrupted: boolean; reason: string | null }>(
    `${sessionUrl(workspaceId, agentName, sessionId)}/interrupt`,
    { method: 'POST' }
  )
  return { interrupted: Boolean(raw.interrupted), reason: raw.reason ?? null }
}

export async function uploadAdkArtifact(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  file: File
): Promise<AdkArtifactMeta> {
  const formData = new FormData()
  formData.append('file', file)
  const raw = await request<RawArtifactMeta>(
    `${sessionUrl(workspaceId, agentName, sessionId)}/artifacts`,
    { method: 'POST', body: formData }
  )
  return toArtifactMeta(raw)
}

export async function listAdkArtifacts(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string
): Promise<AdkArtifactMeta[]> {
  const raw = await request<RawArtifactMeta[]>(
    `${sessionUrl(workspaceId, agentName, sessionId)}/artifacts`
  )
  return raw.map(toArtifactMeta)
}

export async function deleteAdkArtifact(
  workspaceId: string,
  agentName: AdkAgentName,
  sessionId: string,
  artifactId: string
): Promise<void> {
  await request<void>(
    `${sessionUrl(workspaceId, agentName, sessionId)}/artifacts/${encodeURIComponent(artifactId)}`,
    { method: 'DELETE' }
  )
}
