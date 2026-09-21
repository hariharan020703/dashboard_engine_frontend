import type { AccessibleDashboard } from '@/types/auth'

export function dedupeDashboards(dashboards: AccessibleDashboard[]): AccessibleDashboard[] {
  const seen = new Set<string>()
  return dashboards.filter((d) => {
    const key = d.title || d.id
    if (d.source === 'alias' && seen.has(key)) return false
    seen.add(key)
    return true
  })
}
