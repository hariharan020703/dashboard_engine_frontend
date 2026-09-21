import type { AccessibleDashboard } from '@/types/auth'

/**
 * The registry addresses the default dashboard by two ids — the file name
 * (`default`) and whatever `id` the file itself declares — and reports both,
 * because a grant may name either. Listing the same dashboard twice in the
 * navigation is just confusing, so the alias collapses into the entry it
 * duplicates.
 *
 * Only entries the registry marked `alias` are dropped, and only when a
 * dashboard of that title has already been listed. Two real dashboard files
 * that happen to share a title stay separate, and an alias with nothing to
 * collapse into is kept rather than lost.
 *
 * The surviving entry keeps its own access level, which is the level actually
 * granted on the id the navigation links to — the same answer the backend gives
 * for that id.
 */
export function dedupeDashboards(dashboards: AccessibleDashboard[]): AccessibleDashboard[] {
  const seen = new Set<string>()
  return dashboards.filter((d) => {
    const key = d.title || d.id
    if (d.source === 'alias' && seen.has(key)) return false
    seen.add(key)
    return true
  })
}
