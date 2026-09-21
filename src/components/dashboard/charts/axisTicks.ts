import type { AxisTick } from '@/types/dashboard'

/**
 * Maps a tick value to the label the backend computed for it. A pure lookup —
 * no number formatting happens in the frontend.
 */
export function tickLabels(ticks: AxisTick[] | undefined) {
  if (!ticks?.length) return undefined
  const byValue = new Map(ticks.map((t) => [t.value, t.label]))
  return {
    values: ticks.map((t) => t.value),
    format: (v: number | string) => byValue.get(Number(v)) ?? '',
  }
}
