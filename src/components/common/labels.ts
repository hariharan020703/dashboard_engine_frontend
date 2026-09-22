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
