import type { RoleName } from '@/types/auth'

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Platform owner',
  COMPANY_ADMIN: 'Company admin',
  USER: 'User',
}
