/** Shared control styling and non-component constants for the card editor. */

export const inputCls =
  'h-8 w-full rounded-md border border-slate-300 bg-white px-2 text-[13px] text-slate-800 ' +
  'transition-colors focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 ' +
  'disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400'

export const labelCls =
  'mb-1 block text-[10px] font-semibold uppercase tracking-wider text-slate-400'

export const panelCls = 'rounded-lg border border-slate-200 bg-white'

export const ROLE_STYLE: Record<string, { badge: string; chip: string }> = {
  measure: {
    badge: 'bg-emerald-50 text-emerald-600',
    chip: 'bg-emerald-50 text-emerald-700 ring-emerald-200',
  },
  dimension: {
    badge: 'bg-violet-50 text-violet-600',
    chip: 'bg-violet-50 text-violet-700 ring-violet-200',
  },
}
