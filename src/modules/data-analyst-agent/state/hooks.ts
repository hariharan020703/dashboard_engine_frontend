import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"

import type { AppDispatch, RootState } from "./store"

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * The Mojo Analyst Agent backend (Playbook Builder/Playbooks, `state/api.ts`)
 * has its own fixed roster of users (`GET /users` — Deep Blue, Exxon,
 * Sterling, each a GUID `userid`), NOT dashboard's own accounts. Bridging
 * dashboard's numeric `user.id` into that role (as this used to do) sends an
 * id the Mojo backend has never seen — its `users` table has no such row, so
 * anything scoped by it (playbooks live under a `playbooks/{user_id}/` GCS
 * prefix, keyed by this same id) is for a user that doesn't exist there.
 *
 * Hardcoded to one seeded id ("Exxon") until dashboard accounts are actually
 * mapped to Mojo users one-for-one — there is no such mapping yet, and every
 * dashboard account sharing this one id is a deliberate, temporary trade-off
 * over sending an id Mojo has no record of at all.
 */
const STATIC_MOJO_USER_ID = "42af3369-6ed7-441d-ba61-a378399c5ba4"

export function useAgentUserId(): string {
  return STATIC_MOJO_USER_ID
}
