interface PointPayload {
  name: string
  payload?: { valueText?: string; shareText?: string }
}

/**
 * Tooltip for charts whose points stand alone — a treemap tile, a funnel
 * segment — as opposed to SeriesTooltip, which lists every series at one x.
 * Values come preformatted from the backend.
 */
export default function PointTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: PointPayload[]
}) {
  if (!active || !payload?.length) return null
  const point = payload[0]
  return (
    <div className="rounded-lg border border-slate-200 bg-white px-3 py-2 shadow-md">
      <p className="text-xs font-medium text-slate-500">{point.name}</p>
      <p className="text-sm font-semibold text-slate-900">{point.payload?.valueText ?? ''}</p>
      {point.payload?.shareText && (
        <p className="text-[11px] text-slate-400">{point.payload.shareText}</p>
      )}
    </div>
  )
}
