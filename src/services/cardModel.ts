import type { Aggregation, ColumnDef } from '@/types/dashboard'

export const AGGS: Aggregation[] = ['SUM', 'AVERAGE', 'COUNT', 'COUNTDISTINCT', 'MIN', 'MAX']

export const GRAINS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const

export const CATEGORY_MAPPINGS = ['XTIME', 'ITEM', 'XVAL']

export function deriveGroupBy(columns: ColumnDef[]): Array<{ column: string }> {
  const category = columns.find((c) => CATEGORY_MAPPINGS.includes(c.mapping ?? ''))
  const series = columns.find((c) => c.mapping === 'SERIES')
  return [category?.column, series?.column]
    .filter((c): c is string => Boolean(c))
    .map((column) => ({ column }))
}
