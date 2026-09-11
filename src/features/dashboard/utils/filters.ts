import type { Selections } from '../types/dashboard'

/** Drops empty slicer selections and turns the rest into the API's filter shape. */
export function buildFilters(selections: Selections): Record<string, string[]> {
  const filters: Record<string, string[]> = {}
  for (const [id, vals] of Object.entries(selections)) {
    if (vals.size) filters[id] = Array.from(vals)
  }
  return filters
}
