import { useAuth } from '@/context/authContext'
import { pathsForRole, type AppPaths } from '@/app/paths'

/**
 * The link table for the shell the current account is in.
 *
 * Every screen that links anywhere uses this instead of writing a path, so a
 * feature that appears in both shells - the context layer, the agent, the data
 * catalogue - links within whichever shell is rendering it.
 *
 * Returns one of two module-level constants, so there is nothing to memoise and
 * the identity is stable across renders - it can be a dependency of an effect
 * without causing one.
 *
 * Throws when there is no user rather than guessing a shell. A component that
 * renders links is inside a layout that has already established a session; if
 * that stops being true, failing here is how it gets noticed, whereas defaulting
 * to the workspace would silently send a platform administrator out of their
 * console.
 */
export function usePaths(): AppPaths {
  const { user } = useAuth()
  if (!user) {
    throw new Error('usePaths requires an authenticated user; render it inside a shell layout.')
  }
  return pathsForRole(user.role)
}
