import type { ComponentType } from 'react'
import type { CardKind, ChartKind, RenderChart } from '@/types/dashboard'
import ComboChart from '@/components/dashboard/charts/ComboChart'
import TreemapChartCard from '@/components/dashboard/charts/TreemapChartCard'
import FunnelChartCard from '@/components/dashboard/charts/FunnelChartCard'
import AreaChartCard from '@/components/dashboard/charts/AreaChartCard'

export interface CardRegistration {
  /**
   * How the card renders. A dashboard holds one list of cards, and this — read
   * off the chartType — is the only thing that makes one a KPI badge rather
   * than a chart.
   */
  cardKind: CardKind
  kind: ChartKind
  /** Name shown wherever a card type is chosen. */
  label: string
  /**
   * Accepted chartType values. The first is canonical and is what the editor
   * writes; the rest are aliases recognised in existing dashboard JSON.
   */
  chartTypes: string[]
  /** Draws the card. KPI badges are drawn by KpiCard and declare none. */
  component?: ComponentType<{ spec: RenderChart }>
}

export const cardRegistry: CardRegistration[] = [
  {
    cardKind: 'kpi',
    kind: 'badge',
    label: 'KPI Badge',
    chartTypes: ['badge_multi_value', 'badge', 'kpi', 'scorecard'],
  },
  {
    cardKind: 'chart',
    kind: 'combo',
    label: 'Bar + Line',
    chartTypes: ['line_bar_combo', 'bar_line_combo', 'combo'],
    component: ComboChart,
  },
  {
    cardKind: 'chart',
    kind: 'area',
    label: 'Stacked Area',
    chartTypes: ['stacked_area', 'area', 'area_chart'],
    component: AreaChartCard,
  },
  {
    cardKind: 'chart',
    kind: 'treemap',
    label: 'Treemap',
    chartTypes: ['treemap', 'tree_map', 'hierarchy'],
    component: TreemapChartCard,
  },
  {
    cardKind: 'chart',
    kind: 'funnel',
    label: 'Funnel',
    chartTypes: ['funnel', 'conversion'],
    component: FunnelChartCard,
  },
]

export function findRegistration(chartType: string | undefined): CardRegistration | undefined {
  return cardRegistry.find((r) => r.chartTypes.includes(chartType ?? ''))
}

/** Whether a card renders as a KPI badge. Unknown types are treated as charts. */
export function cardKindOf(chartType: string | undefined): CardKind {
  return findRegistration(chartType)?.cardKind ?? 'chart'
}

/** The label shown for a card's type, falling back to the raw chartType. */
export function cardTypeLabel(chartType: string | undefined): string {
  return findRegistration(chartType)?.label ?? chartType ?? 'Unknown'
}
