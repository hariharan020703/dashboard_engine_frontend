import type { ComponentType } from 'react'
import type { ChartKind, RenderChart } from '../types/dashboard'
import ComboChart from './charts/ComboChart'
import TreemapChartCard from './charts/TreemapChartCard'
import FunnelChartCard from './charts/FunnelChartCard'
import AreaChartCard from './charts/AreaChartCard'

export interface ChartRegistration {
  component: ComponentType<{ spec: RenderChart }>
  kind: ChartKind
  chartTypes: string[]
}

export const chartRegistry: ChartRegistration[] = [
  {
    kind: 'combo',
    chartTypes: ['line_bar_combo', 'bar_line_combo', 'combo'],
    component: ComboChart,
  },
  {
    kind: 'treemap',
    chartTypes: ['treemap', 'tree_map', 'hierarchy'],
    component: TreemapChartCard,
  },
  {
    kind: 'funnel',
    chartTypes: ['funnel', 'conversion'],
    component: FunnelChartCard,
  },
  {
    kind: 'area',
    chartTypes: ['stacked_area', 'area', 'area_chart'],
    component: AreaChartCard,
  },
]

export function findRegistration(chartType: string): ChartRegistration | undefined {
  return chartRegistry.find((r) => r.chartTypes.includes(chartType))
}
