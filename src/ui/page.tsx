import type { ReactNode } from 'react'
import { LoaderCircle } from 'lucide-react'

/**
 * Page furniture: the frame every routed screen sits in.
 *
 * Generic on purpose — nothing here knows about auth, dashboards or the admin
 * directory, so the same four pieces carry the analytics screens and the RBAC
 * screens without either borrowing the other's vocabulary.
 */

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string
  description?: ReactNode
  actions?: ReactNode
}) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">{title}</h1>
        {description && <p className="mt-0.5 text-sm text-slate-500">{description}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </header>
  )
}

/** A titled white surface. `flush` drops the padding for tables that own it. */
export function Panel({
  title,
  description,
  actions,
  flush,
  children,
}: {
  title?: string
  description?: ReactNode
  actions?: ReactNode
  flush?: boolean
  children: ReactNode
}) {
  return (
    <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-5 py-3">
          <div>
            {title && <h2 className="text-sm font-semibold text-slate-800">{title}</h2>}
            {description && <p className="mt-0.5 text-[12px] text-slate-500">{description}</p>}
          </div>
          {actions && <div className="flex items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  )
}

export function EmptyState({ message, hint }: { message: string; hint?: ReactNode }) {
  return (
    <div className="px-5 py-10 text-center">
      <p className="text-sm text-slate-500">{message}</p>
      {hint && <p className="mt-1 text-[12px] text-slate-400">{hint}</p>}
    </div>
  )
}

export function Loading({ label = 'Loading…' }: { label?: string }) {
  return (
    <p className="flex items-center justify-center gap-2 px-5 py-10 text-sm text-slate-500">
      <LoaderCircle size={16} className="animate-spin" />
      {label}
    </p>
  )
}

const TONES = {
  neutral: 'bg-slate-100 text-slate-600',
  info: 'bg-blue-50 text-blue-700',
  success: 'bg-emerald-50 text-emerald-700',
  warning: 'bg-amber-50 text-amber-800',
  danger: 'bg-red-50 text-red-700',
}

export type BadgeTone = keyof typeof TONES

export function Badge({ children, tone = 'neutral' }: { children: ReactNode; tone?: BadgeTone }) {
  return (
    <span
      className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${TONES[tone]}`}
    >
      {children}
    </span>
  )
}
