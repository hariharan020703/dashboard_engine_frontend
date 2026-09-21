import type { ReactNode } from 'react'

interface SeriesPayload {
  name?: string
  dataKey?: string | number
  color?: string
  payload?: { text?: Record<string, string> }
}

export default function SeriesTooltip({
  active,
  label,
  payload,
}: {
  active?: boolean
  label?: ReactNode
  payload?: SeriesPayload[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="mb-1 text-xs font-medium text-slate-500">{label}</p>
      <ul className="space-y-0.5">
        {payload.map((entry, i) => {
          const key = String(entry.dataKey ?? '')
          return (
            <li key={key || i} className="flex items-center gap-2 text-xs">
              <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: entry.color }} />
              <span className="text-slate-500">{entry.name ?? key}</span>
              <span className="ml-auto font-semibold text-slate-900">
                {entry.payload?.text?.[key] ?? ''}
              </span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
