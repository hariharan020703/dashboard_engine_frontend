import { useEffect, useId, useState } from 'react'
import { listAccessLevels } from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useNotification } from '@/ui/notificationContext'
import type { AccessLevel } from '@/types/auth'
import type { AccessLevelDef, DashboardSummary } from '@/types/admin'
import { actionPrimaryCls, labelCls, selectCls } from '@/ui/styles'

/**
 * Grant a dashboard at a level - the same three controls for a user or a group,
 * because the backend's grant endpoints take the same pair either way.
 *
 * The dashboard list is a prop and comes from the "grantable" endpoint, which
 * for a company administrator is their own company's assignments rather than
 * the whole registry. So the picker cannot offer something the backend would
 * refuse, and the two never have to disagree in front of the user.
 */
export default function GrantPicker({
  dashboards,
  disabled,
  onGrant,
}: {
  dashboards: DashboardSummary[]
  disabled?: boolean
  onGrant: (dashboardId: string, level: AccessLevel) => void
}) {
  const fieldId = useId()
  const notify = useNotification()
  const [levels, setLevels] = useState<AccessLevelDef[]>([])
  const [dashboardId, setDashboardId] = useState('')
  const [level, setLevel] = useState<AccessLevel>('view')

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await listAccessLevels()
        if (!cancelled) setLevels(found)
      } catch (err) {
        // The picker cannot offer a level it does not know about, and silently
        // showing only "view" would be a different capability than intended.
        if (!cancelled) notify.error('Could not load the access levels.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [notify])

  if (!dashboards.length) {
    return (
      <p className="border-b border-slate-100 px-5 py-4 text-[13px] text-slate-500">
        No dashboards are available to grant. A platform administrator assigns them to the company
        first.
      </p>
    )
  }

  return (
    <div className="flex flex-wrap items-end gap-2 border-b border-slate-100 px-5 py-4">
      <div className="min-w-[14rem] flex-1">
        <label className={labelCls} htmlFor={`${fieldId}-dashboard`}>
          Dashboard
        </label>
        <select
          id={`${fieldId}-dashboard`}
          className={selectCls}
          value={dashboardId}
          onChange={(e) => setDashboardId(e.target.value)}
          disabled={disabled}
        >
          <option value="">Choose a dashboard…</option>
          {dashboards.map((d) => (
            <option key={d.id} value={d.id}>
              {d.title ? `${d.title} (${d.id})` : d.id}
            </option>
          ))}
        </select>
      </div>

      <div className="w-44">
        <label className={labelCls} htmlFor={`${fieldId}-level`}>
          Level
        </label>
        <select
          id={`${fieldId}-level`}
          className={selectCls}
          value={level}
          onChange={(e) => setLevel(e.target.value as AccessLevel)}
          disabled={disabled || levels.length === 0}
        >
          {levels.map((l) => (
            <option key={l.id} value={l.id} title={l.description}>
              {l.id}
            </option>
          ))}
        </select>
      </div>

      <button
        type="button"
        className={actionPrimaryCls}
        onClick={() => onGrant(dashboardId, level)}
        disabled={disabled || !dashboardId || levels.length === 0}
      >
        Grant
      </button>
    </div>
  )
}
