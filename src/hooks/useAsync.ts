import { useCallback, useEffect, useRef, useState } from 'react'

/**
 * Loads data and reports honestly what happened.
 *
 * Three outcomes, kept apart: still loading, failed with a reason, or succeeded
 * with a value. `data` starts null and only ever becomes non-null by
 * succeeding, so a screen cannot render a failure as an empty list - which is
 * exactly what the overview pages used to do, catching the error and setting
 * `[]`, making a broken backend look like a customer with no data.
 *
 * `deps` is the REQUEST's identity, not the loader's. `useAsync(() =>
 * fetchUser(id), [id])` re-runs when the id changes and not when the component
 * re-renders, because the loader is almost always a fresh arrow function and
 * depending on it would fetch in a loop.
 *
 * `reload` re-runs the loader and is stable, so it can be handed to a Retry
 * button or listed as an effect dependency.
 */

export interface AsyncState<T> {
  data: T | null
  error: unknown
  loading: boolean
  reload: () => void
}

export function useAsync<T>(loader: () => Promise<T>, deps: unknown[] = []): AsyncState<T> {
  /*
   * The loader is held in a ref so its identity does not drive the fetch, and
   * the ref is written in an effect rather than during render - a render can be
   * thrown away or replayed, and a ref written in one that was discarded holds
   * a closure that never belonged to the committed tree.
   *
   * Declared FIRST, so on any render where both effects run, the loader is
   * current before the fetch below reads it.
   */
  const loaderRef = useRef(loader)
  useEffect(() => {
    loaderRef.current = loader
  })

  const [token, setToken] = useState(0)

  /**
   * This request's identity, collapsed to one value: the deps plus a counter
   * that `reload` bumps.
   *
   * A spread dependency array cannot be statically checked, so the deps are
   * serialised instead. Every value passed here is an id, a flag or a name -
   * things that serialise exactly.
   */
  const key = `${token}:${JSON.stringify(deps)}`

  /**
   * The settled result, TAGGED with the request it answers.
   *
   * That tag is what makes everything else fall out for free. Loading is
   * "nothing has settled for the current key yet", so it needs no state of its
   * own and no effect setting it - which also means a key change flips back to
   * loading within the same render rather than one render later. And a slow
   * reply from a previous key simply never matches, so it cannot overwrite a
   * newer one.
   */
  const [settled, setSettled] = useState<{ key: string; data: T | null; error: unknown } | null>(
    null
  )

  useEffect(() => {
    let cancelled = false

    loaderRef
      .current()
      .then((data) => {
        if (!cancelled) setSettled({ key, data, error: null })
      })
      .catch((error: unknown) => {
        if (!cancelled) setSettled({ key, data: null, error })
      })

    return () => {
      cancelled = true
    }
  }, [key])

  const current = settled !== null && settled.key === key ? settled : null

  return {
    data: current?.data ?? null,
    error: current?.error ?? null,
    loading: current === null,
    reload: useCallback(() => setToken((n) => n + 1), []),
  }
}
