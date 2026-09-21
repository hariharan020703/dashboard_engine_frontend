
export const inputCls =
  'h-10 w-full rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800 ' +
  'transition-colors placeholder:text-slate-400 focus:border-blue-500 focus:outline-none ' +
  'focus:ring-1 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-50 ' +
  'disabled:text-slate-400'

export const selectCls = `${inputCls} appearance-none bg-white pr-8`

export const labelCls =
  'mb-1.5 block text-[10px] font-semibold uppercase tracking-wider text-slate-400'

export const primaryButtonCls =
  'flex h-10 w-full items-center justify-center gap-2 rounded-md bg-blue-600 text-sm font-semibold ' +
  'text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 ' +
  'focus:ring-offset-2 disabled:cursor-not-allowed disabled:bg-slate-300'

export const ghostButtonCls =
  'flex h-10 w-full items-center justify-center gap-2 rounded-md border border-slate-300 bg-white ' +
  'text-sm font-medium text-slate-600 transition-colors hover:bg-slate-50 focus:outline-none ' +
  'focus:ring-2 focus:ring-slate-400 focus:ring-offset-2 disabled:cursor-not-allowed'

export const cardCls = 'rounded-xl border border-slate-200 bg-white p-6 shadow-sm'

/* Inline actions inside tables and panel headers, where a full-width button
   would dominate the row it sits in. */

export const actionButtonCls =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-slate-300 bg-white ' +
  'px-2.5 text-[13px] font-medium text-slate-600 transition-colors hover:bg-slate-50 ' +
  'focus:outline-none focus:ring-2 focus:ring-slate-400 disabled:cursor-not-allowed disabled:opacity-50'

export const actionPrimaryCls =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md bg-blue-600 px-3 text-[13px] ' +
  'font-semibold text-white transition-colors hover:bg-blue-700 focus:outline-none ' +
  'focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-slate-300'

export const actionDangerCls =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-md border border-red-200 bg-white ' +
  'px-2.5 text-[13px] font-medium text-red-600 transition-colors hover:bg-red-50 ' +
  'focus:outline-none focus:ring-2 focus:ring-red-400 disabled:cursor-not-allowed disabled:opacity-50'

/* Directory tables. The admin screens all list rows of the same weight, so the
   column styling is declared once rather than per screen. */

export const tableCls = 'w-full border-collapse text-sm'

export const thCls =
  'border-b border-slate-200 px-4 py-2.5 text-left text-[10px] font-semibold uppercase ' +
  'tracking-wider text-slate-400'

export const tdCls = 'border-b border-slate-100 px-4 py-2.5 text-slate-700 align-middle'
