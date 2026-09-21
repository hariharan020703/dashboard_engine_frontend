import type { RoleName } from '@/types/auth'
import { ROLE_LABELS } from './roleLabels'
import { Badge } from '@/ui/page'
import type { BadgeTone } from '@/ui/page'

const TONE: Record<RoleName, BadgeTone> = {
  SUPER_ADMIN: 'success',
  COMPANY_ADMIN: 'info',
  USER: 'neutral',
}

export default function RoleBadge({ role }: { role: RoleName }) {
  return <Badge tone={TONE[role] ?? 'neutral'}>{ROLE_LABELS[role] ?? role}</Badge>
}
