import type { WorkflowStepId } from '../types'

/**
 * Every path this module calls, in one table.
 *
 * The point is that re-pointing a step at a different route — which is what
 * happens when the real backend contract arrives — is an edit here and nowhere
 * else. No component, hook or service builds a URL by hand.
 *
 * `LIVE` / `PROPOSED` records whether the backend serves the path today.
 * `stepAvailability` below turns that into something the UI can render, so a
 * step whose endpoint does not exist yet says so plainly instead of presenting
 * an error the user cannot act on.
 */

const enc = encodeURIComponent

export const endpoints = {
  /* ---------------------------------------------------- step 1 — connect --- */
  connectors: () => '/context/connectors',
  connections: () => '/context/connections',
  connection: (id: string) => `/context/connections/${enc(id)}`,
  verifyConnection: (id: string) => `/context/connections/${enc(id)}/verify`,

  /* --------------------------------------------------- step 2 — discover --- */
  datasets: (id: string) => `/context/connections/${enc(id)}/datasets`,

  /* ---------------------------------------------------- step 3 — profile --- */
  profileOverview: (id: string) => `/context/connections/${enc(id)}/profile`,
  tableProfile: (id: string, tableId: string) =>
    `/context/connections/${enc(id)}/tables/${enc(tableId)}`,

  /* ------------------------------------------------- step 4 — understand --- */
  understanding: (id: string) => `/context/connections/${enc(id)}/understanding`,
  generateUnderstanding: (id: string) =>
    `/context/connections/${enc(id)}/understanding/generate`,

  /* ------------------------------------------------------ step 5 — model --- */
  model: (id: string) => `/context/connections/${enc(id)}/model`,
  generateModel: (id: string) => `/context/connections/${enc(id)}/model/generate`,
  relationships: (id: string) => `/context/connections/${enc(id)}/model/relationships`,
  relationship: (id: string, relationshipId: string) =>
    `/context/connections/${enc(id)}/model/relationships/${enc(relationshipId)}`,

  /* ----------------------------------------------------- step 6 — review --- */
  reviewQueue: (id: string) => `/context/connections/${enc(id)}/review`,
  reviewItem: (id: string, itemId: string) =>
    `/context/connections/${enc(id)}/review/${enc(itemId)}`,
  reviewItemDecision: (id: string, itemId: string) =>
    `/context/connections/${enc(id)}/review/${enc(itemId)}/decision`,
  reviewBulkDecision: (id: string) => `/context/connections/${enc(id)}/review/decision`,

  /* ---------------------------------------------------- step 7 — publish --- */
  publishSummary: (id: string) => `/context/connections/${enc(id)}/publish/summary`,
  publishValidate: (id: string) => `/context/connections/${enc(id)}/publish/validate`,
  publish: (id: string) => `/context/connections/${enc(id)}/publish`,
} as const

/**
 * Which steps are backed by an endpoint that exists today.
 *
 * Read by the workflow shell to mark a step "pending backend" in the stepper,
 * and by each step to choose between an error state and the honest
 * "this endpoint is not built yet" state. It is a statement of fact about the
 * backend, kept beside the paths it describes so the two cannot drift.
 *
 * Flip a step to `true` when its route ships. Nothing else changes.
 */
export const STEP_ENDPOINT_LIVE: Record<WorkflowStepId, boolean> = {
  connect: true,
  discover: true,
  profile: true,
  understand: false,
  model: false,
  review: false,
  publish: false,
}
