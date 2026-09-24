import { useId, useState } from 'react'
import { Loader2, Plus } from 'lucide-react'
import { listAccessLevels } from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ACCESS_LEVEL_LABELS } from '@/components/common/labels'
import type { AccessLevel } from '@/types/auth'
import type { DashboardSummary } from '@/types/admin'

/**
 * Granting a dashboard to somebody.
 *
 * `dashboards` is what the caller may actually hand out - for a company
 * administrator, their company's assignments rather than the whole registry -
 * so the picker cannot offer something the server would then refuse.
 *
 * The levels come from the API rather than being hardcoded, because they are
 * part of the authorization model: a level this build does not know about must
 * not silently become "view".
 */
export function GrantPicker({
  dashboards,
  disabled,
  onGrant,
}: {
  /** What the picker renders of each: its id and title. */
  dashboards: Array<Pick<DashboardSummary, 'id' | 'title'>>
  disabled?: boolean
  onGrant: (dashboardId: string, level: AccessLevel) => Promise<unknown>
}) {
  const fieldId = useId()
  const levels = useAsync(() => listAccessLevels(), [])

  const [dashboardId, setDashboardId] = useState('')
  const [level, setLevel] = useState<AccessLevel>('view')
  const [pending, setPending] = useState(false)

  if (dashboards.length === 0) {
    return (
      <p className="border-b border-border px-5 py-4 text-sm text-muted-foreground">
        There are no dashboards to give out yet. A platform administrator decides which dashboards
        this company may use.
      </p>
    )
  }

  const grant = async () => {
    if (!dashboardId) return
    setPending(true)
    try {
      await onGrant(dashboardId, level)
      // Cleared only on success, so a failed grant keeps the selection to retry.
      setDashboardId('')
    } finally {
      setPending(false)
    }
  }

  const busy = disabled || pending
  const levelOptions = levels.data ?? []

  return (
    <div className="flex flex-wrap items-end gap-3 border-b border-border px-5 py-4">
      <div className="min-w-56 flex-1 space-y-1.5">
        <Label htmlFor={`${fieldId}-dashboard`} className="text-xs font-medium">
          Dashboard
        </Label>
        <Select value={dashboardId} onValueChange={setDashboardId} disabled={busy}>
          <SelectTrigger id={`${fieldId}-dashboard`} className="w-full">
            <SelectValue placeholder="Choose a dashboard…" />
          </SelectTrigger>
          <SelectContent>
            {dashboards.map((dashboard) => (
              <SelectItem key={dashboard.id} value={dashboard.id}>
                {dashboard.title || dashboard.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="w-44 space-y-1.5">
        <Label htmlFor={`${fieldId}-level`} className="text-xs font-medium">
          They can
        </Label>
        <Select
          value={level}
          onValueChange={(value) => setLevel(value as AccessLevel)}
          disabled={busy || levelOptions.length === 0}
        >
          <SelectTrigger id={`${fieldId}-level`} className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {levelOptions.map((option) => (
              <SelectItem key={option.id} value={option.id}>
                {ACCESS_LEVEL_LABELS[option.id] ?? option.id}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Button onClick={() => void grant()} disabled={busy || !dashboardId || levelOptions.length === 0}>
        {pending ? <Loader2 className="animate-spin" aria-hidden /> : <Plus aria-hidden />}
        Give access
      </Button>

      {Boolean(levels.error) && (
        <p className="w-full text-xs text-destructive" role="alert">
          The access levels could not be loaded, so nothing can be granted right now.
        </p>
      )}
    </div>
  )
}
