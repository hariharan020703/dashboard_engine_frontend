import type { ComponentType } from 'react'
import type { ChartKind, RenderChart } from '../types/dashboard'
import ComboChart from './charts/ComboChart'
import TreemapChartCard from './charts/TreemapChartCard'
import FunnelChartCard from './charts/FunnelChartCard'
import AreaChartCard from './charts/AreaChartCard'

export interface ChartRegistration {
  component: ComponentType<{ spec: RenderChart }>
  kind: ChartKind
  /** Name shown wherever a chart type is chosen. */
  label: string
  /**
   * Accepted chartType values. The first is canonical and is what the editor
   * writes; the rest are aliases recognised in existing dashboard JSON.
   */
  chartTypes: string[]
}

export const chartRegistry: ChartRegistration[] = [
  {
    kind: 'combo',
    label: 'Bar + Line',
    chartTypes: ['line_bar_combo', 'bar_line_combo', 'combo'],
    component: ComboChart,
  },
  {
    kind: 'area',
    label: 'Stacked Area',
    chartTypes: ['stacked_area', 'area', 'area_chart'],
    component: AreaChartCard,
  },
  {
    kind: 'treemap',
    label: 'Treemap',
    chartTypes: ['treemap', 'tree_map', 'hierarchy'],
    component: TreemapChartCard,
  },
  {
    kind: 'funnel',
    label: 'Funnel',
    chartTypes: ['funnel', 'conversion'],
    component: FunnelChartCard,
  },
]

export function findRegistration(chartType: string): ChartRegistration | undefined {
  return chartRegistry.find((r) => r.chartTypes.includes(chartType))
}
