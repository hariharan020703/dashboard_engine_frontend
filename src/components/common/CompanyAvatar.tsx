import { Building2 } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A company's monogram.
 *
 * The tint is derived from the name, so the same customer is the same colour on
 * every screen and a list of them is scannable. It is decoration only - the
 * name is always next to it - so the element is hidden from assistive
 * technology rather than announcing a colour nobody asked about.
 */

const SIZES = {
  xs: 'size-5 text-[9px]',
  sm: 'size-6 text-[10px]',
  md: 'size-8 text-xs',
  lg: 'size-10 text-sm',
} as const

/**
 * Tints drawn from the chart ramp rather than from arbitrary Tailwind colours,
 * so a company's mark belongs to the same palette as its data.
 */
const TINTS = [
  'bg-chart-1/15 text-chart-1',
  'bg-chart-2/15 text-chart-2',
  'bg-chart-3/15 text-chart-3',
  'bg-chart-4/20 text-chart-4',
  'bg-chart-5/15 text-chart-5',
]

function tintFor(name: string): string {
  let hash = 0
  for (let index = 0; index < name.length; index++) {
    hash = name.charCodeAt(index) + ((hash << 5) - hash)
  }
  return TINTS[Math.abs(hash) % TINTS.length]
}

export function CompanyAvatar({
  name,
  size = 'sm',
  className,
}: {
  name?: string | null
  size?: keyof typeof SIZES
  className?: string
}) {
  const clean = (name || '').trim()
  const monogram = clean
    ? clean
        .split(/[\s_-]+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((word) => word[0])
        .join('')
        .toUpperCase()
    : ''

  return (
    <span
      aria-hidden
      className={cn(
        'inline-grid shrink-0 place-items-center rounded-md font-semibold tracking-tight select-none',
        SIZES[size],
        clean ? tintFor(clean) : 'bg-muted text-muted-foreground',
        className
      )}
    >
      {monogram || <Building2 className="size-3.5" />}
    </span>
  )
}
