import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface StatCardProps {
  title: string
  value: string | number
  subtitle?: ReactNode
  icon?: LucideIcon
  tone?: 'blue' | 'emerald' | 'amber' | 'purple' | 'slate'
  trend?: {
    text: string
    positive?: boolean
  }
  onClick?: () => void
}

const TONES = {
  blue: 'bg-blue-50 text-blue-600 border-blue-100',
  emerald: 'bg-emerald-50 text-emerald-600 border-emerald-100',
  amber: 'bg-amber-50 text-amber-600 border-amber-100',
  purple: 'bg-purple-50 text-purple-600 border-purple-100',
  slate: 'bg-slate-100 text-slate-600 border-slate-200',
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon: Icon,
  tone = 'blue',
  trend,
  onClick,
}: StatCardProps) {
  const CardWrapper = onClick ? 'button' : 'div'
  const toneClasses = TONES[tone] || TONES.blue

  return (
    <CardWrapper
      type={onClick ? 'button' : undefined}
      onClick={onClick}
      className={`flex flex-col justify-between rounded-xl border border-slate-200 bg-white p-5 text-left shadow-xs transition-all ${
        onClick
          ? 'cursor-pointer hover:border-slate-300 hover:shadow-sm focus:outline-none focus:ring-2 focus:ring-blue-500'
          : ''
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {title}
          </p>
          <div className="mt-1 text-2xl font-bold tracking-tight text-slate-900">{value}</div>
        </div>
        {Icon && (
          <div className={`grid h-9 w-9 shrink-0 place-items-center rounded-lg border ${toneClasses}`}>
            <Icon size={18} />
          </div>
        )}
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 pt-2 text-xs text-slate-500">
          {trend && (
            <span
              className={`font-semibold ${
                trend.positive ? 'text-emerald-600' : 'text-slate-500'
              }`}
            >
              {trend.text}
            </span>
          )}
          {subtitle && <span className="truncate">{subtitle}</span>}
        </div>
      )}
    </CardWrapper>
  )
}
