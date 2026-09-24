import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type {
  ContextSettings,
  ContextVersion,
  ContextVersionState,
  WorkflowStepId,
} from '../types'

/**
 * Draft / published state, and the deployment settings the builder reads.
 *
 * Drafts are opened by the BACKEND, on writes — saving a selection, running
 * an extraction, deciding a review item. Nothing here creates one. The only
 * write is `trackStep`, which moves an already-open draft's step marker and
 * is refused nothing: with no draft open it simply returns null.
 */

export function fetchSettings(): Promise<ContextSettings> {
  return contextHttp.get<ContextSettings>(endpoints.settings())
}

export function fetchVersions(connectionId: string): Promise<ContextVersionState> {
  return contextHttp.get<ContextVersionState>(endpoints.versions(connectionId))
}

export function trackStep(
  connectionId: string,
  step: WorkflowStepId
): Promise<{ draft: ContextVersion | null }> {
  return contextHttp.patch<{ draft: ContextVersion | null }>(endpoints.draft(connectionId), {
    step,
  })
}
