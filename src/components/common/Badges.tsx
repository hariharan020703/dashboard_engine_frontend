import type { ComponentType } from 'react'
import { Building2, CircleDot, CircleSlash, Clock, Eye, Pencil, Share2, ShieldCheck, User, Wrench } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { AccessLevel, RoleName, UserStatus } from '@/types/auth'
import { ACCESS_LEVEL_LABELS, ROLE_LABELS } from '@/components/common/labels'

/**
 * Status vocabulary: the words and marks the product uses for role, account
 * status and dashboard access level.
 *
 * Every badge here carries an icon and a word, never a colour alone. Colour is
 * the fastest signal for most readers and no signal at all for some, so it is
 * the third thing each badge says rather than the only one.
 */

const ROLE_STYLE: Record<RoleName, { icon: ComponentType<{ className?: string }>; className: string }> = {
  SUPER_ADMIN: {
    icon: ShieldCheck,
    className: 'border-primary/25 bg-primary/10 text-primary',
  },
  COMPANY_ADMIN: {
    icon: Building2,
    className: 'border-info/25 bg-info/10 text-info',
  },
  USER: {
    icon: User,
    className: 'border-border bg-muted text-muted-foreground',
  },
}

export function RoleBadge({ role, className }: { role: RoleName; className?: string }) {
  const style = ROLE_STYLE[role]
  const Icon = style.icon
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', style.className, className)}>
      <Icon className="size-3" aria-hidden />
      {ROLE_LABELS[role]}
    </Badge>
  )
}

/* ----------------------------------------------------------------- status --- */

const STATUS_STYLE: Record<
  UserStatus,
  { label: string; icon: ComponentType<{ className?: string }>; className: string }
> = {
  active: {
    label: 'Active',
    icon: CircleDot,
    className: 'border-success/25 bg-success/10 text-success',
  },
  pending: {
    label: 'Invited',
    icon: Clock,
    className: 'border-warning/30 bg-warning/15 text-warning-foreground',
  },
  disabled: {
    label: 'Deactivated',
    icon: CircleSlash,
    className: 'border-destructive/25 bg-destructive/10 text-destructive',
  },
}

export function StatusBadge({ status, className }: { status: UserStatus; className?: string }) {
  const style = STATUS_STYLE[status]
  const Icon = style.icon
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', style.className, className)}>
      <Icon className="size-3" aria-hidden />
      {style.label}
    </Badge>
  )
}

/** For a company, which is on or off rather than invited. */
export function ActiveBadge({ active, className }: { active: boolean; className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        'gap-1 font-medium',
        active
          ? 'border-success/25 bg-success/10 text-success'
          : 'border-destructive/25 bg-destructive/10 text-destructive',
        className
      )}
    >
      {active ? <CircleDot className="size-3" aria-hidden /> : <CircleSlash className="size-3" aria-hidden />}
      {active ? 'Active' : 'Suspended'}
    </Badge>
  )
}

/* ---------------------------------------------------------- access levels --- */

const LEVEL_STYLE: Record<AccessLevel, { icon: ComponentType<{ className?: string }>; className: string }> = {
  view: { icon: Eye, className: 'border-border bg-muted text-muted-foreground' },
  share: { icon: Share2, className: 'border-info/25 bg-info/10 text-info' },
  developer: { icon: Wrench, className: 'border-primary/25 bg-primary/10 text-primary' },
  admin: { icon: Pencil, className: 'border-success/25 bg-success/10 text-success' },
}

export function AccessLevelBadge({
  level,
  className,
}: {
  level: AccessLevel
  className?: string
}) {
  const style = LEVEL_STYLE[level]
  const Icon = style.icon
  return (
    <Badge variant="outline" className={cn('gap-1 font-medium', style.className, className)}>
      <Icon className="size-3" aria-hidden />
      {ACCESS_LEVEL_LABELS[level]}
    </Badge>
  )
}
