import { CheckCircle2, PencilLine } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ContextVersionStatus } from '../types'

/**
 * `Draft · v2` / `Published · v1`.
 *
 * The label is the backend's (`v2`), never built here — the version number is
 * the server's to assign, and it can change at publish time if the name does.
 */
export function VersionBadge({
  status,
  label,
  className,
}: {
  status: ContextVersionStatus
  label: string
  className?: string
}) {
  const draft = status === 'draft'
  const Icon = draft ? PencilLine : CheckCircle2
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px] font-semibold',
        draft
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300'
          : 'border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300',
        className
      )}
    >
      <Icon className="size-3" aria-hidden />
      {draft ? 'Draft' : 'Published'} · {label}
    </span>
  )
}
