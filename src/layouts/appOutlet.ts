import { useOutletContext } from 'react-router-dom'
import type { AccessibleDashboard } from '@/types/auth'

/**
 * What the shell hands every routed page.
 *
 * The dashboard list arrives with the profile and is shared from there: the
 * sidebar, the home screen and the dashboard itself all need it, and three
 * copies of the same question would be three chances to disagree about what the
 * user may open.
 */
export interface AppData {
  /**
   * Dashboards the signed-in user holds a grant on, exactly as the registry
   * reports them - including the aliases of the default dashboard, so looking a
   * route's id up in this list always matches. Screens that LIST them collapse
   * the aliases first with `dedupeDashboards`.
   */
  dashboards: AccessibleDashboard[]
  /** Re-reads the profile, and with it the grants. Call after changing access. */
  reload: () => Promise<void>
}

export function useAppData(): AppData {
  return useOutletContext<AppData>()
}
