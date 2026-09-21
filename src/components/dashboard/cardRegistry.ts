import type { ComponentType } from 'react'
import type { CardKind, ChartKind, RenderChart } from '@/types/dashboard'
import ComboChart from '@/components/dashboard/charts/ComboChart'
import TreemapChartCard from '@/components/dashboard/charts/TreemapChartCard'
import FunnelChartCard from '@/components/dashboard/charts/FunnelChartCard'
import AreaChartCard from '@/components/dashboard/charts/AreaChartCard'

export interface CardRegistration {
  cardKind: CardKind
  kind: ChartKind
  label: string
  chartTypes: string[]
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

export function cardKindOf(chartType: string | undefined): CardKind {
  return findRegistration(chartType)?.cardKind ?? 'chart'
}

export function cardTypeLabel(chartType: string | undefined): string {
  return findRegistration(chartType)?.label ?? chartType ?? 'Unknown'
}
