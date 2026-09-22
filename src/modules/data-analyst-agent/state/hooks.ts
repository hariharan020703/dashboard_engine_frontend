import { useDispatch, useSelector, type TypedUseSelectorHook } from "react-redux"

import { useAuth } from "@/context/authContext"

import type { AppDispatch, RootState } from "./store"

export const useAppDispatch: () => AppDispatch = useDispatch
export const useAppSelector: TypedUseSelectorHook<RootState> = useSelector

/**
 * The agent backend has no auth of its own — every call just scopes data by
 * a `user_id` string. We bridge dashboard's real authenticated user into
 * that role instead of the source app's dev/test user-switcher.
 */
export function useAgentUserId(): string {
  const { user } = useAuth()
  return user ? String(user.id) : ""
}
