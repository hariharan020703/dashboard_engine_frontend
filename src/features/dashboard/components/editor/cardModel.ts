import type { Aggregation, ColumnDef } from '../../types/dashboard'

/** Card-model vocabulary and derivations shared by the editor sections. */

export const AGGS: Aggregation[] = ['SUM', 'AVERAGE', 'COUNT', 'COUNTDISTINCT', 'MIN', 'MAX']

export const GRAINS = ['HOUR', 'DAY', 'WEEK', 'MONTH', 'YEAR'] as const

/** Column roles that act as the card's category axis. */
export const CATEGORY_MAPPINGS = ['XTIME', 'ITEM', 'XVAL']

/**
 * groupBy always mirrors the category and series mappings, so a chart's labels
 * can never reference a column the query did not group by.
 */
export function deriveGroupBy(columns: ColumnDef[]): Array<{ column: string }> {
  const category = columns.find((c) => CATEGORY_MAPPINGS.includes(c.mapping ?? ''))
  const series = columns.find((c) => c.mapping === 'SERIES')
  return [category?.column, series?.column]
    .filter((c): c is string => Boolean(c))
    .map((column) => ({ column }))
}
