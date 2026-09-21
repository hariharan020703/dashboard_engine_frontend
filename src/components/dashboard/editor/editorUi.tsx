import { AlertCircle, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { labelCls, panelCls } from './editorStyles'

export function Field({
  label,
  children,
  className = '',
}: {
  label: string
  children: ReactNode
  className?: string
}) {
  return (
    <div className={className}>
      <label className={labelCls}>{label}</label>
      {children}
    </div>
  )
}

export function Group({
  title,
  action,
  children,
  className = '',
}: {
  title: string
  action?: ReactNode
  children: ReactNode
  className?: string
}) {
  return (
    <section className={`${panelCls} ${className}`}>
      <header className="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
        <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">{title}</h3>
        {action}
      </header>
      <div className="p-3">{children}</div>
    </section>
  )
}

/** Inline validation notice. Only rendered when something needs attention. */
export function Notice({ children }: { children: ReactNode }) {
  return (
    <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-snug text-amber-700">
      <AlertCircle size={13} className="mt-px shrink-0 text-amber-500" />
      <span>{children}</span>
    </p>
  )
}

/** Checkbox styled as a selectable pill. */
export function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <label
      className={`flex cursor-pointer items-center gap-2 rounded-md border px-2.5 py-1.5 text-[13px] transition-colors ${
        checked
          ? 'border-blue-300 bg-blue-50 text-blue-800'
          : 'border-slate-200 text-slate-600 hover:border-slate-300'
      }`}
    >
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-3.5 w-3.5 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
      />
      {label}
    </label>
  )
}

/** Icon-only action button. */
export function IconButton({
  icon,
  onClick,
  label,
  tone = 'slate',
}: {
  icon: ReactNode
  onClick: () => void
  label: string
  tone?: 'slate' | 'danger'
}) {
  const tones = {
    slate: 'text-slate-400 hover:bg-slate-100 hover:text-slate-700',
    danger: 'text-slate-400 hover:bg-red-50 hover:text-red-600',
  }
  return (
    <button
      type="button"
      title={label}
      aria-label={label}
      onClick={onClick}
      className={`grid h-7 w-7 place-items-center rounded-md transition-colors ${tones[tone]}`}
    >
      {icon}
    </button>
  )
}

export function CloseButton({ onClick }: { onClick: () => void }) {
  return <IconButton icon={<X size={16} />} label="Close" onClick={onClick} />
}
