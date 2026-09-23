import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type {
  PublishResult,
  PublishSummary,
  PublishValidation,
  PublishedVersion,
} from '../types'

/**
 * Step 7 — Publish. LIVE.
 *
 * The counts on this screen are read from the backend, not tallied from
 * whatever the UI happens to be holding. That is the whole point of the step:
 * it tells somebody what is about to become visible to chat, dashboards,
 * reports and agents, and a number derived from client state would be
 * describing the browser's idea of the context rather than the one that will
 * actually be published.
 *
 * Validation is its own call for the same reason. "Is this publishable" depends
 * on required metadata, unresolved review items and invalid relationships — all
 * facts the backend holds. The frontend asks, and renders the answer.
 */

export function fetchPublishSummary(connectionId: string): Promise<PublishSummary> {
  return contextHttp.get<PublishSummary>(endpoints.publishSummary(connectionId))
}

/** Run the backend's pre-flight checks without publishing anything. */
export function validatePublish(connectionId: string): Promise<PublishValidation> {
  return contextHttp.post<PublishValidation>(endpoints.publishValidate(connectionId))
}

/**
 * Publishes. The backend performs the operation and owns the version number
 * and the timestamp — a client-generated version would disagree with the
 * server's the moment two people publish at once.
 */
export function publishContext(
  connectionId: string,
  body: { name: string; notifyTeam?: boolean }
): Promise<PublishResult> {
  return contextHttp.post<PublishResult>(endpoints.publish(connectionId), body)
}

/** Every version published under this connection, newest first. */
export function listPublications(connectionId: string): Promise<PublishedVersion[]> {
  return contextHttp.get<PublishedVersion[]>(endpoints.publish(connectionId))
}
