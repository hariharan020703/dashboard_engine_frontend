import { useOutletContext } from 'react-router-dom'
import type { AccessibleDashboard } from '@/types/auth'

export interface AppData {
  dashboards: AccessibleDashboard[]
  reload: () => Promise<void>
}

export function useAppData(): AppData {
  return useOutletContext<AppData>()
}
