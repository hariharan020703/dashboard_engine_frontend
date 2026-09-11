export type Row = Record<string, unknown>

export type Mapping = 'XTIME' | 'VALUE' | 'SERIES' | 'XVAL' | 'ITEM'
export type Aggregation =
  | 'SUM'
  | 'AVERAGE'
  | 'COUNT'
  | 'COUNTDISTINCT'
  | 'MIN'
  | 'MAX'
  | 'NONE'

export interface CardFormat {
  type?: string
  format?: string
  prefix?: string
  suffix?: string
  digits?: number
}

export interface ColumnDef {
  column: string
  alias?: string
  mapping?: Mapping
  aggregation?: Aggregation
  calendar?: boolean
  dateTimeElement?: string
  format?: CardFormat
}

export interface GroupByDef {
  column?: string
  calendar?: boolean
}

export interface DateGrain {
  column: string
  dateTimeElement: string
}

export type OrderDirection = 'ASCENDING' | 'DESCENDING'

export interface OrderByDef {
  column: string
  order: OrderDirection
  aggregation?: Aggregation | null
  formulaId?: string | null
  calendar?: boolean
}

export interface SeriesDef {
  name?: string
  columns: ColumnDef[]
  filters?: Array<Record<string, unknown>>
  groupBy?: GroupByDef[]
  dateGrain?: DateGrain
  distinct?: boolean
  fiscal?: boolean
  limit?: number
  orderBy?: OrderByDef[]
  projection?: boolean
  variables?: boolean
}

export interface ChartMain {
  component?: string
  chartType: string
  overrides?: Record<string, unknown>
  goal?: unknown
}

export interface KpiComparison {
  label?: string
  delta?: number
  deltaFormat?: CardFormat
  secondaryLabel?: string
  comp_val_displayed?: string
  comp_data_used?: string
}

export interface CardLayout {
  span?: number
  rowSpan?: number
}

export interface PanelLayout {
  span?: number
  rowSpan?: number
  minHeight?: number
}

export interface DashboardLayout {
  cols?: number
  gap?: 'sm' | 'md' | 'lg'
  kpi?: PanelLayout
  chart?: PanelLayout
  slicer?: PanelLayout
}

export type SlicerType = 'single' | 'multi'

export interface SlicerDef {
  id: string
  title: string
  column: string
  type?: SlicerType
  span?: number
  showCount?: boolean
  sort?: 'asc' | 'desc'
}

export interface CardDefinition {
  id: string
  name: string
  chartType: string
  title?: string
  description?: string
  columns?: ColumnDef[]
  format?: CardFormat
  filters?: Array<Record<string, unknown>>
  groupBy?: GroupByDef[]
  distinct?: boolean
  limits?: number
  series?: Record<string, SeriesDef>
  options?: Record<string, unknown>
  comparison?: KpiComparison
  layout?: CardLayout
  charts?: {
    main: ChartMain
  }
}

export interface HydratedKpi {
  id: string
  title: string
  value: number
  text: string
  format?: CardFormat
  comparison: {
    label: string
    delta: number
    deltaText: string
    previousText: string
    period: string
    previousPeriod: string
  }
  spec?: CardDefinition
}

export interface HydratedChart extends RenderChart {
  error?: string
  spec?: CardDefinition
}

export interface HydratedSlicerOption {
  value: string
  count: number
  selected?: boolean
}

export interface HydratedSlicer {
  id: string
  title: string
  column: string
  type?: SlicerType
  span?: number
  showCount?: boolean
  options: HydratedSlicerOption[]
}

export interface HydratedDashboardView {
  dashboard: { title?: string; description?: string }
  layout?: DashboardLayout
  kpis: HydratedKpi[]
  cards: HydratedChart[]
  slicers: HydratedSlicer[]
}

export type ChartKind =
  | 'combo'
  | 'area'
  | 'treemap'
  | 'funnel'
  | 'bar'
  | 'line'
  | 'pie'
  | 'unknown'

export type SeriesKind = 'bar' | 'line' | 'area' | 'treemap' | 'funnel' | 'pie'

export interface RenderSeries {
  key: string
  name: string
  kind: SeriesKind
  color?: string
  fillOpacity?: number
  stackId?: string
  axis?: 'y1' | 'y2'
  xKey?: string
  yKey?: string
}

export interface RenderAxis {
  key: string
  name?: string
  type?: 'category' | 'number'
}

export interface RenderChart {
  id: string
  kind?: ChartKind
  chartType: string
  title: string
  description?: string
  data: Row[]
  axes: {
    x?: RenderAxis
    y?: RenderAxis
    y2?: RenderAxis
    angle?: RenderAxis
    radius?: RenderAxis
  }
  series: RenderSeries[]
  options: Record<string, unknown>
}
/** Slicer id -> the set of values the user has selected. */
export type Selections = Record<string, Set<string>>
