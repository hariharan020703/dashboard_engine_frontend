import { apiFetch } from '@/api/client'
import type {
  HydratedDashboardView,
  CardDefinition,
  ColumnCatalogue,
  PreviewResult,
} from '@/types/dashboard'

/**
 * The dashboard API. The frontend never sends table or column names - only a
 * dashboard id, slicer ids and the values the user picked; everything
 * structural comes from the dashboard JSON, resolved server-side by the
 * unchanged query engine.
 *
 * These endpoints are authenticated and access-checked now. A dashboard the
 * caller's company has not been assigned, or that they hold no grant on, comes
 * back as a 404 before any SQL is planned - so there is no id to guess that
 * would reach another company's data.
 */

function filterQuery(filters: Record<string, string[]>): string {
  const qs = Object.entries(filters)
    .map(([k, v]) => `${encodeURIComponent(k)}=${encodeURIComponent(v.join(','))}`)
    .join('&')
  return qs ? `?${qs}` : ''
}

export function fetchView(
  dashboardId: string,
  filters: Record<string, string[]> = {}
): Promise<HydratedDashboardView> {
  return apiFetch<HydratedDashboardView>(
    `/api/dashboard/${encodeURIComponent(dashboardId)}${filterQuery(filters)}`
  )
}

/** Replaces one card - KPI or chart, they are the same list - by its position. */
export function patchCard(
  dashboardId: string,
  index: number,
  card: CardDefinition,
  filters: Record<string, string[]>
): Promise<HydratedDashboardView> {
  return apiFetch<HydratedDashboardView>(
    `/api/dashboard/${encodeURIComponent(dashboardId)}/config`,
    { method: 'PATCH', body: { index, card, filters } }
  )
}

/** The source table's columns, used by the card editor's field catalogue. */
export function fetchColumns(dashboardId: string): Promise<ColumnCatalogue> {
  return apiFetch<ColumnCatalogue>(
    `/api/dashboard/columns?dashboardId=${encodeURIComponent(dashboardId)}`
  )
}

/**
 * Runs a draft card through the engine without saving it. The response says
 * whether the draft came back as a badge or a chart, read off its chartType.
 */
export function previewCard(
  dashboardId: string,
  card: CardDefinition,
  filters: Record<string, string[]> = {}
): Promise<PreviewResult> {
  return apiFetch<PreviewResult>('/api/dashboard/preview', {
    method: 'POST',
    body: { card, filters, dashboardId },
  })
}
