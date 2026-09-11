import type { HydratedDashboardView, CardDefinition } from '../types/dashboard'

/**
 * The dashboard API. The frontend never sends table or column names — only
 * slicer ids and the values the user picked; everything structural comes from
 * the dashboard JSON, resolved server-side.
 */

export async function fetchView(
  filters: Record<string, string[]> = {}
): Promise<HydratedDashboardView> {
  const qs = Object.entries(filters)
    .map(([k, v]) => `${k}=${encodeURIComponent(v.join(','))}`)
    .join('&')
  const res = await fetch('/api/dashboard/view' + (qs ? `?${qs}` : ''))
  if (!res.ok) throw new Error('failed to load dashboard view')
  return res.json()
}

export async function patchCard(
  kind: 'kpi' | 'chart',
  index: number,
  card: CardDefinition,
  filters: Record<string, string[]>
): Promise<HydratedDashboardView> {
  const res = await fetch('/api/dashboard/config', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ kind, index, card, filters }),
  })
  if (!res.ok) throw new Error('failed to save')
  const json = await res.json()
  return json.view as HydratedDashboardView
}
