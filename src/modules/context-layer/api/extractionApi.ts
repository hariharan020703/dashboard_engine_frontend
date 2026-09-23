import {
  createAdkSession,
  getAdkSession,
  listAdkSessions,
  sendAdkMessage,
} from '@/api/adkAgentApi'

/**
 * The context extraction run — the one part of this workflow that does NOT
 * talk to the Node backend.
 *
 * Steps 1 to 3 (Connect, Discover, Profile) are source data and belong to the
 * Node API. Extraction is an AI job, and it lives in the Context Layer service
 * (`Elze-backend/adk_agents/api`, `VITE_ADK_API_BASE_URL`, default :8300).
 * That service is reached directly from the browser, which is why this file
 * goes through `@/api/adkAgentApi` rather than this module's own
 * `api/client.ts` — two different backends, two different transports, and the
 * boundary stated in one place instead of discovered in a component.
 *
 * Two things make the wiring simpler than it looks:
 *
 *   workspace_id IS the connection id. That service has no workspaces table;
 *   `adk_agents/api/db.py:workspace_exists` checks
 *   `SELECT 1 FROM connections WHERE id = %s`, against the same `connections`
 *   rows this application writes. So the id from step 1 is the id used here.
 *
 *   The PROMPT is built server-side from `dataset_ids`. The caller does not
 *   write the extraction instructions; it names the datasets and the service
 *   composes the rest (see `_build_extraction_prompt`). `text` is therefore
 *   empty on purpose - it is a slot for EXTRA instructions appended after the
 *   built prompt, not the message itself.
 */

const AGENT = 'context_layer_extractor' as const

export interface ExtractionResult {
  /** The ADK session the run happened in. Also how the run is found again. */
  sessionId: string
  /** The agent's answer, as it wrote it. Markdown in practice. */
  text: string
  /** Which tools it called, in order. The audit trail of what it did. */
  toolCalls: string[]
  /** True when a concurrent interrupt cut the turn short. */
  interrupted: boolean
}

/**
 * Creates a session, then runs the extraction in it.
 *
 * Two calls rather than one because the service models them separately: a
 * session is the unit conversation history and artifacts hang off, and the
 * message is the turn. A fresh session per run keeps one run's transcript from
 * being read as part of the next.
 *
 * `stream: false` means this request stays open until the agent has finished,
 * which for a real extraction is minutes rather than seconds. The caller is
 * expected to show that it is running.
 */
export async function runExtraction(
  connectionId: string,
  datasetIds: string[],
  options: { domain?: string } = {}
): Promise<ExtractionResult> {
  const session = await createAdkSession(connectionId, AGENT)

  const response = await sendAdkMessage(connectionId, AGENT, session.sessionId, {
    // Empty on purpose: the service builds the prompt from `datasetIds`, and
    // anything here would be appended to it as further instructions.
    text: '',
    datasetIds,
    ...(options.domain ? { domain: options.domain } : {}),
  })

  return {
    sessionId: session.sessionId,
    text: response.text,
    toolCalls: response.toolCalls,
    interrupted: response.interrupted,
  }
}

/**
 * The most recent completed run for a connection, or null.
 *
 * Read back from the service rather than remembered in the browser, so the
 * result survives a reload and is still there tomorrow. The alternative -
 * keeping it only in the query cache - loses an expensive run to a refresh.
 *
 * The answer is the last non-user turn: a session's transcript is the user's
 * prompt followed by whatever the agent said, and it is the latter that is the
 * result.
 */
export async function fetchLatestExtraction(
  connectionId: string
): Promise<ExtractionResult | null> {
  const sessions = await listAdkSessions(connectionId, AGENT)
  if (!sessions.length) return null

  const latest = [...sessions].sort(
    (a, b) => (b.lastUpdateTime ?? 0) - (a.lastUpdateTime ?? 0)
  )[0]

  const detail = await getAdkSession(connectionId, AGENT, latest.sessionId)
  const answer = [...detail.turns].reverse().find((turn) => turn.role !== 'user')
  if (!answer || !answer.text.trim()) return null

  return {
    sessionId: latest.sessionId,
    text: answer.text,
    // A replayed transcript does not carry the tool calls; the live run's
    // response did. Reported as empty rather than invented.
    toolCalls: [],
    interrupted: false,
  }
}
