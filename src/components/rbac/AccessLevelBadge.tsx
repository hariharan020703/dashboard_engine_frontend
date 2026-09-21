import type { AccessLevel } from '@/types/auth'
import { Badge } from '@/ui/page'
import type { BadgeTone } from '@/ui/page'

const TONE: Record<AccessLevel, BadgeTone> = {
  view: 'neutral',
  share: 'info',
  developer: 'info',
  admin: 'success',
}

export default function AccessLevelBadge({ level }: { level: AccessLevel }) {
  return <Badge tone={TONE[level] ?? 'neutral'}>{level}</Badge>
}
