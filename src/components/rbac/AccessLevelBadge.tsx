import type { AccessLevel } from '@/types/auth'
import { Badge } from '@/ui/page'
import type { BadgeTone } from '@/ui/page'

/**
 * An access level, always shown the same way. Four screens were each deciding
 * what colour `view` or `admin` should be, and had drifted apart.
 */
const TONE: Record<AccessLevel, BadgeTone> = {
  view: 'neutral',
  share: 'info',
  developer: 'info',
  admin: 'success',
}

export default function AccessLevelBadge({ level }: { level: AccessLevel }) {
  return <Badge tone={TONE[level] ?? 'neutral'}>{level}</Badge>
}
