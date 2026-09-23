import { del, get, patch, post } from '@/api/http'
import type {
  HydratedDashboardView,
  CardDefinition,
  ColumnCatalogue,
  PreviewResult,
} from '@/types/dashboard'

/**
 * The dashboard endpoints.
 *
 * These are tenant-scoped - a dashboard is reached only if it is assigned to
 * the caller's company AND the caller holds a grant on it, both checked on the
 * server before any SQL is planned. The query engine behind them is untouched.
 */

export interface CreateDashboardPayload {
  id?: string
  title: string
  description?: string
  companyId?: number | null
  dataSource?: unknown
  layout?: unknown
  slicers?: unknown[]
  cards?: CardDefinition[]
  spec?: unknown
}

export interface CreatedDashboard {
  id: string
  title: string
  description?: string | null
  companyId: number | null
  accessLevel: string
  spec?: unknown
}

/** Creates a new dashboard. Platform admin, Company admin, or Company user. */
export function createDashboard(payload: CreateDashboardPayload): Promise<CreatedDashboard> {
  return post<CreatedDashboard>('/dashboard', payload)
}

/** Deletes a dashboard. Platform admin or Company admin only. */
export function deleteDashboard(dashboardId: string): Promise<{ deleted: boolean; dashboardId: string }> {
  return del<{ deleted: boolean; dashboardId: string }>(`/dashboard/${encodeURIComponent(dashboardId)}`)
}

/**
 * Slicer selections, as the engine expects them: one query parameter per
 * filter, values comma-joined. Passed through axios `params` so the encoding is
 * the transport's job rather than a string built here.
 */
function filterParams(filters: Record<string, string[]>): Record<string, string> {
  return Object.fromEntries(
    Object.entries(filters).map(([id, values]) => [id, values.join(',')])
  )
}

export function fetchView(
  dashboardId: string,
  filters: Record<string, string[]> = {}
): Promise<HydratedDashboardView> {
  return get<HydratedDashboardView>(`/dashboard/${encodeURIComponent(dashboardId)}`, {
    params: filterParams(filters),
  })
}

/** Replaces one card - KPI or chart, they are the same list - by its position. */
export function patchCard(
  dashboardId: string,
  index: number,
  card: CardDefinition,
  filters: Record<string, string[]>
): Promise<HydratedDashboardView> {
  return patch<HydratedDashboardView>(`/dashboard/${encodeURIComponent(dashboardId)}/config`, {
    index,
    card,
    filters,
  })
}

/** The source table's columns, used by the card editor's field catalogue. */
export function fetchColumns(dashboardId: string): Promise<ColumnCatalogue> {
  return get<ColumnCatalogue>('/dashboard/columns', { params: { dashboardId } })
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
  return post<PreviewResult>('/dashboard/preview', { card, filters, dashboardId })
}

