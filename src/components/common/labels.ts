import type { AccessLevel, RoleName } from '@/types/auth'

/**
 * The product's vocabulary: how the API's identifiers are said to a person.
 *
 * Kept apart from the components that render them so the wording has one home
 * - a role is named the same way in a badge, a picker, a wizard's review step
 * and a toast, and changing it is one edit here rather than four.
 */

export const ROLE_LABELS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Platform owner',
  COMPANY_ADMIN: 'Company admin',
  USER: 'Member',
}

/**
 * What each role means, in the words of somebody choosing one for a colleague.
 *
 * The role NAMES are the API's and travel on the wire unchanged, but
 * "COMPANY_ADMIN" is not an answer to "what will this person be able to do",
 * and that is the question being asked at the moment a role is picked.
 */
export const ROLE_DESCRIPTIONS: Record<RoleName, string> = {
  SUPER_ADMIN: 'Runs the platform. Manages every customer, and belongs to none of them.',
  COMPANY_ADMIN:
    'Runs this company. Adds people, creates groups, and decides who sees which dashboards.',
  USER: 'Uses the dashboards they are given. Sees no administration.',
}

/**
 * Access levels in the customer's words.
 *
 * The API's ids are `view`, `share`, `developer` and `admin`. "Developer" means
 * nothing to a sales manager deciding who may change a chart, so the label says
 * what the level lets somebody do. The id still travels on the wire - this is
 * presentation, not a second vocabulary.
 */
export const ACCESS_LEVEL_LABELS: Record<AccessLevel, string> = {
  view: 'Can view',
  share: 'Can share',
  developer: 'Can edit',
  admin: 'Full control',
}

/** Weakest first - the order every level picker shows. */
export const ACCESS_LEVEL_ORDER: AccessLevel[] = ['view', 'share', 'developer', 'admin']

/** Whether `level` includes everything `required` allows. */
export function levelAtLeast(level: AccessLevel | null | undefined, required: AccessLevel): boolean {
  if (!level) return false
  return ACCESS_LEVEL_ORDER.indexOf(level) >= ACCESS_LEVEL_ORDER.indexOf(required)
}

/**
 * What a level lets the holder do on one dashboard, as a sentence to them.
 * Mirrors the backend's rules exactly - each line is something the server
 * will allow, and nothing it will refuse.
 */
export const ACCESS_LEVEL_ABILITIES: Record<AccessLevel, string> = {
  view: 'You can open this dashboard and use its filters.',
  share: 'You can view this dashboard and share it with colleagues (up to "Can share").',
  developer: 'You can view, share and edit the cards on this dashboard.',
  admin: 'You have full control: view, share, edit, remove access and delete this dashboard.',
}
