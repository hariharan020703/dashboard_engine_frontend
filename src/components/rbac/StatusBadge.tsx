import type { UserStatus } from '@/types/auth'
import { Badge } from '@/ui/page'
import type { BadgeTone } from '@/ui/page'

/**
 * An account's lifecycle state.
 *
 * Three states rather than an active/inactive boolean, because "invited but has
 * never signed in" and "switched off by an administrator" need different
 * actions from whoever is looking at the row.
 */
const TONE: Record<UserStatus, BadgeTone> = {
  active: 'success',
  pending: 'warning',
  disabled: 'danger',
}

const LABEL: Record<UserStatus, string> = {
  active: 'Active',
  pending: 'Awaiting activation',
  disabled: 'Deactivated',
}

export default function StatusBadge({ status }: { status: UserStatus }) {
  return <Badge tone={TONE[status] ?? 'neutral'}>{LABEL[status] ?? status}</Badge>
}
