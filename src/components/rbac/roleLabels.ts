import type { RoleName } from '@/types/auth'

/**
 * How each role is written in the interface.
 *
 * The stored names are uppercase constants, which shout in a table and read
 * like an implementation detail in a sentence. The value itself is never
 * changed - only how it is displayed.
 *
 * In its own module so the badge file exports a component and nothing else,
 * which is what keeps fast refresh working.
 */
export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Platform owner',
  COMPANY_ADMIN: 'Company admin',
  USER: 'User',
}
