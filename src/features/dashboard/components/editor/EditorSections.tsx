import { BarChart3, ChartArea, Gauge, Grid2x2, Plus, TrendingDown, Trash2 } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type {
  CardDefinition,
  CardKind,
  ColumnCatalogue,
  ColumnDef,
  DateGrain,
  Mapping,
} from '../../types/dashboard'
import { cardRegistry, findRegistration } from '../cardRegistry'
import { Field, Group, IconButton, Notice, Toggle } from './editorUi'
import { ROLE_STYLE, inputCls } from './editorStyles'
import { AGGS, GRAINS, deriveGroupBy } from './cardModel'

const ROLE_OPTIONS: Array<{ value: Mapping; label: string }> = [
  { value: 'XTIME', label: 'Category' },
  { value: 'VALUE', label: 'Value' },
  { value: 'SERIES', label: 'Series' },
  { value: 'ITEM', label: 'Item' },
  { value: 'XVAL', label: 'X value' },
]

const CARD_ICONS: Partial<Record<string, LucideIcon>> = {
  badge: Gauge,
  combo: BarChart3,
  area: ChartArea,
  treemap: Grid2x2,
  funnel: TrendingDown,
}

const FORMAT_STYLES = [
  { value: '', label: 'Plain' },
  { value: 'abbreviated', label: 'Abbreviated' },
  { value: 'compact', label: 'Compact' },
  { value: 'percent', label: 'Percent' },
]

/**
 * Every section is rendered for every card. Where an option only bites once the
 * card is a chart, the section says so rather than hiding itself — the card's
 * type is one click away on the Type tab.
 */
export interface Ctx {
  kind: CardKind
  draft: CardDefinition
  catalogue: ColumnCatalogue | null
  columns: ColumnDef[]
  setCard: (patch: Partial<CardDefinition>) => void
  setColumn: (idx: number, field: keyof ColumnDef, value: unknown) => void
  addColumn: () => void
  removeColumn: (idx: number) => void
  setDateGrain: (grain: DateGrain | undefined) => void
  setOption: (key: string, value: unknown) => void
}

/** Shown under any control a KPI badge ignores. */
function BadgeNotice({ children }: { children: string }) {
  return <Notice>{children}</Notice>
}

function ColumnSelect({
  value,
  onChange,
  catalogue,
  only,
}: {
  value: string
  onChange: (v: string) => void
  catalogue: ColumnCatalogue | null
  only?: 'measure' | 'dimension'
}) {
  const list = (catalogue?.columns ?? []).filter((c) => !only || c.role === only)
  const known = list.some((c) => c.name === value)
  return (
    <select className={inputCls} value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">Select column</option>
      {value && !known && <option value={value}>{value}</option>}
      {list.map((c) => (
        <option key={c.name} value={c.name}>
          {c.name}
        </option>
      ))}
    </select>
  )
}

/* -------------------------------------------------------------- Data source */

export function DataSourceSection({ catalogue, draft }: Ctx) {
  const rows: Array<[string, string]> = [
    ['Table', catalogue?.table ?? '—'],
    ['Database', catalogue?.database ?? '—'],
    ['Rows', catalogue?.rowCountText ?? '—'],
    ['Columns', catalogue ? String(catalogue.columns.length) : '—'],
    ['Dashboard', catalogue?.dashboardId ?? '—'],
    ['Card ID', draft.id ?? '—'],
  ]
  const parse = Object.entries(catalogue?.dateParse ?? {})

  return (
    <>
      <Group title="Source">
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2.5">
          {rows.map(([k, v]) => (
            <div key={k} className="min-w-0">
              <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{k}</dt>
              <dd className="truncate text-[13px] font-medium text-slate-800" title={v}>
                {v}
              </dd>
            </div>
          ))}
        </dl>
      </Group>

      {parse.length > 0 && (
        <Group title="Date formats">
          <ul className="space-y-1.5">
            {parse.map(([col, fmt]) => (
              <li key={col} className="flex items-center justify-between gap-3 text-[13px]">
                <span className="truncate text-slate-700">{col}</span>
                <code className="shrink-0 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] text-slate-600">
                  {fmt}
                </code>
              </li>
            ))}
          </ul>
        </Group>
      )}
    </>
  )
}

/* ------------------------------------------------------------------ Fields */

export function FieldsSection(ctx: Ctx) {
  const { kind, columns, catalogue, setColumn, addColumn, removeColumn } = ctx
  const groupBy = deriveGroupBy(columns)

  return (
    <>
      <Group
        title="Fields"
        action={
          <button
            type="button"
            onClick={addColumn}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Plus size={13} />
            Add
          </button>
        }
      >
        {columns.length > 0 && (
          <div className="mb-1.5 grid grid-cols-[1fr_86px_104px_28px] items-center gap-2 px-0.5">
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Column</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Role</span>
            <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Aggregate</span>
            <span />
          </div>
        )}

        <div className="space-y-1.5">
          {columns.map((col, i) => {
            const meta = catalogue?.columns.find((c) => c.name === col.column)
            const isValue = (col.mapping ?? 'VALUE') === 'VALUE'
            const badType =
              isValue && meta && !meta.isNumeric && ['SUM', 'AVERAGE'].includes(col.aggregation ?? 'SUM')
            return (
              <div key={i}>
                <div className="grid grid-cols-[1fr_86px_104px_28px] items-center gap-2">
                  <ColumnSelect
                    value={col.column ?? ''}
                    onChange={(v) => setColumn(i, 'column', v)}
                    catalogue={catalogue}
                    only={isValue ? undefined : 'dimension'}
                  />
                  <select
                    className={inputCls}
                    value={col.mapping ?? 'VALUE'}
                    onChange={(e) => setColumn(i, 'mapping', e.target.value)}
                  >
                    {ROLE_OPTIONS.map((m) => (
                      <option key={m.value} value={m.value}>
                        {m.label}
                      </option>
                    ))}
                  </select>
                  {isValue ? (
                    <select
                      className={inputCls}
                      value={col.aggregation ?? 'SUM'}
                      onChange={(e) => setColumn(i, 'aggregation', e.target.value)}
                    >
                      {AGGS.map((a) => (
                        <option key={a} value={a}>
                          {a}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <span className="px-1 text-[12px] text-slate-400">Grouped</span>
                  )}
                  <IconButton
                    icon={<Trash2 size={14} />}
                    label="Remove field"
                    tone="danger"
                    onClick={() => removeColumn(i)}
                  />
                </div>
                {badType && <Notice>{meta?.type} column — use COUNT or COUNTDISTINCT.</Notice>}
              </div>
            )
          })}

          {!columns.length && (
            <p className="rounded-md border border-dashed border-slate-300 py-5 text-center text-[12px] text-slate-400">
              Select a column on the left to begin
            </p>
          )}
        </div>
        {kind === 'kpi' && (
          <BadgeNotice>A badge reads the first Value field; the other roles apply once this card is a chart.</BadgeNotice>
        )}
      </Group>

      <Group title="Grouped by">
        {groupBy.length ? (
          <div className="flex flex-wrap gap-1.5">
            {groupBy.map((g) => (
              <span
                key={g.column}
                className={`rounded px-2 py-1 text-[12px] font-medium ring-1 ${ROLE_STYLE.dimension.chip}`}
              >
                {g.column}
              </span>
            ))}
          </div>
        ) : (
          <p className="text-[12px] text-slate-400">Whole table aggregated as one value</p>
        )}
        {kind === 'kpi' && groupBy.length > 0 && (
          <BadgeNotice>A badge is a single number, so it ignores these groupings.</BadgeNotice>
        )}
      </Group>
    </>
  )
}

/* --------------------------------------------------------------- Sort/limit */

export function SortSection({ draft, columns, setCard, setOption, kind }: Ctx) {
  const order = Array.isArray(draft.orderBy) ? draft.orderBy[0] : undefined
  const isFunnel = findRegistration(draft.chartType)?.kind === 'funnel'
  const segments = Number((draft.options ?? {}).funnelSegments ?? 5)
  const measures = columns.filter((c) => (c.mapping ?? 'VALUE') === 'VALUE').map((c) => c.column)
  const sortable = [...deriveGroupBy(columns).map((d) => d.column), ...measures]
  const invalid = order?.column && !sortable.includes(order.column)

  return (
    <Group title="Sort & limit">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Sort by">
          <select
            className={inputCls}
            value={order?.column ?? ''}
            onChange={(e) =>
              setCard({
                orderBy: e.target.value
                  ? [{ column: e.target.value, order: order?.order ?? 'DESCENDING' }]
                  : undefined,
              })
            }
          >
            <option value="">Highest value first</option>
            {sortable.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Direction">
          <select
            className={inputCls}
            disabled={!order?.column}
            value={order?.order ?? 'DESCENDING'}
            onChange={(e) =>
              setCard({
                orderBy: [
                  { column: order?.column ?? '', order: e.target.value as 'ASCENDING' | 'DESCENDING' },
                ],
              })
            }
          >
            <option value="DESCENDING">Descending</option>
            <option value="ASCENDING">Ascending</option>
          </select>
        </Field>
        <Field label="Show top">
          <input
            type="number"
            min={1}
            className={inputCls}
            placeholder="All"
            value={draft.limits ?? ''}
            onChange={(e) =>
              setCard({
                limits: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value) || 1),
              })
            }
          />
        </Field>
        {isFunnel && (
          <Field label="Funnel segments">
            <select
              className={inputCls}
              value={segments}
              onChange={(e) => setOption('funnelSegments', Number(e.target.value))}
            >
              {[3, 4, 5, 6, 7, 8, 9, 10].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      {invalid && <Notice>{order?.column} is not a field on this card.</Notice>}
      {kind === 'kpi' && (
        <BadgeNotice>A badge returns one row, so these are kept for when the card becomes a chart.</BadgeNotice>
      )}
    </Group>
  )
}

/* ------------------------------------------------------------------ Period */

export function DateGrainSection({ kind, draft, catalogue, setDateGrain }: Ctx) {
  const grain = draft.dateGrain
  const all = catalogue?.columns ?? []
  const dateish = all.filter((c) => c.isDate || (c.isString && catalogue?.dateParse?.[c.name]))
  const others = all.filter((c) => !dateish.includes(c))
  const chosen = all.find((c) => c.name === grain?.column)
  const parseFmt = grain?.column ? catalogue?.dateParse?.[grain.column] : undefined

  return (
    <Group title={kind === 'kpi' ? 'Comparison period' : 'Time grouping'}>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Date column">
          <select
            className={inputCls}
            value={grain?.column ?? ''}
            onChange={(e) =>
              setDateGrain(
                e.target.value
                  ? { column: e.target.value, dateTimeElement: grain?.dateTimeElement ?? 'MONTH' }
                  : undefined
              )
            }
          >
            <option value="">None</option>
            {dateish.length > 0 && (
              <optgroup label="Date columns">
                {dateish.map((c) => (
                  <option key={c.name} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label="Other columns">
              {others.map((c) => (
                <option key={c.name} value={c.name}>
                  {c.name}
                </option>
              ))}
            </optgroup>
          </select>
        </Field>
        <Field label="Group into">
          <select
            className={inputCls}
            disabled={!grain?.column}
            value={grain?.dateTimeElement ?? 'MONTH'}
            onChange={(e) => setDateGrain({ column: grain?.column ?? '', dateTimeElement: e.target.value })}
          >
            {GRAINS.map((g) => (
              <option key={g} value={g}>
                {g.charAt(0) + g.slice(1).toLowerCase()}
              </option>
            ))}
          </select>
        </Field>
      </div>
      {chosen?.isString && !parseFmt && (
        <Notice>{chosen.name} is text with no date format configured.</Notice>
      )}
    </Group>
  )
}

/* ---------------------------------------------------------------- Card type */

export function CardTypeSection({ draft, setCard }: Ctx) {
  // One entry per renderable card, not per accepted alias. Picking the badge
  // turns a chart into a KPI, and picking a chart turns a KPI back.
  const current = findRegistration(draft.chartType)

  return (
    <Group title="Card type">
      <div className="grid grid-cols-2 gap-2">
        {cardRegistry.map((registration) => {
          const active = current === registration
          const Icon = CARD_ICONS[registration.kind] ?? BarChart3
          return (
            <button
              key={registration.kind}
              type="button"
              onClick={() => setCard({ chartType: registration.chartTypes[0] })}
              className={`flex items-center gap-2 rounded-md border px-2.5 py-2 text-left text-[12px] font-medium transition-colors ${
                active
                  ? 'border-blue-500 bg-blue-50 text-blue-700 ring-1 ring-blue-500'
                  : 'border-slate-200 text-slate-700 hover:border-slate-300 hover:bg-slate-50'
              }`}
            >
              <Icon size={15} className={active ? 'text-blue-600' : 'text-slate-400'} />
              {registration.label}
            </button>
          )
        })}
      </div>
    </Group>
  )
}

/* ------------------------------------------------------------------ Colours */

export function ColorSection({ kind, draft, columns, setOption }: Ctx) {
  const isKpi = kind === 'kpi'
  const colorMap = ((draft.options ?? {}).colorMapping as Record<string, string>) ?? {}
  const valueCols = columns.filter((c) => (c.mapping ?? 'VALUE') === 'VALUE').map((c) => c.column)
  const setMap = (next: Record<string, string>) =>
    setOption('colorMapping', Object.keys(next).length ? next : undefined)

  return (
    <>
      <Group
        title={isKpi ? 'Accent colour' : 'Series colours'}
        action={
          <button
            type="button"
            onClick={() => {
              const free = valueCols.find((c) => !(c in colorMap)) ?? ''
              setMap({ ...colorMap, [free]: '#3b82f6' })
            }}
            className="flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[11px] font-semibold text-blue-600 hover:bg-blue-50"
          >
            <Plus size={13} />
            Add
          </button>
        }
      >
        <div className="space-y-1.5">
          {Object.entries(colorMap).map(([key, color]) => (
            <div key={key} className="grid grid-cols-[1fr_44px_28px] items-center gap-2">
              <select
                className={inputCls}
                value={key}
                onChange={(e) => {
                  const next = { ...colorMap }
                  delete next[key]
                  if (e.target.value) next[e.target.value] = color
                  setMap(next)
                }}
              >
                <option value={key}>{key || 'Select series'}</option>
                {valueCols
                  .filter((c) => c !== key)
                  .map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
              </select>
              <input
                type="color"
                value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#64748b'}
                onChange={(e) => setMap({ ...colorMap, [key]: e.target.value })}
                className="h-8 w-full cursor-pointer rounded-md border border-slate-300 p-0.5"
              />
              <IconButton
                icon={<Trash2 size={14} />}
                label="Remove colour"
                tone="danger"
                onClick={() => {
                  const next = { ...colorMap }
                  delete next[key]
                  setMap(next)
                }}
              />
            </div>
          ))}
          {!Object.keys(colorMap).length && (
            <p className="text-[12px] text-slate-400">
              {isKpi ? 'Using the default accent' : 'Using the default palette'}
            </p>
          )}
        </div>
        {isKpi && (
          <BadgeNotice>The colour set for the value field tints the badge&apos;s accent bar.</BadgeNotice>
        )}
      </Group>

      <Group title="Display">
        <div className="flex flex-wrap gap-1.5">
          {(
            [
              ['dualAxis', 'Dual axis'],
              ['stacked', 'Stacked'],
              ['gradient', 'Gradient'],
              ['showLabels', 'Data labels'],
            ] as const
          ).map(([key, label]) => (
            <Toggle
              key={key}
              label={label}
              checked={Boolean((draft.options ?? {})[key])}
              onChange={(v) => setOption(key, v || undefined)}
            />
          ))}
        </div>
        {isKpi && <BadgeNotice>These shape a plotted chart; a badge has no axes to apply them to.</BadgeNotice>}
      </Group>
    </>
  )
}

/* --------------------------------------------------------------- Properties */

export function PropertiesSection({ kind, draft, setCard }: Ctx) {
  return (
    <>
      <Group title="General">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Title" className="col-span-4">
            <input
              className={inputCls}
              value={draft.title ?? ''}
              onChange={(e) => setCard({ title: e.target.value })}
            />
          </Field>
          <Field label="Subtitle" className="col-span-4">
            <input
              className={inputCls}
              value={draft.description ?? ''}
              onChange={(e) => setCard({ description: e.target.value })}
            />
          </Field>
          <Field label="Width">
            <select
              className={inputCls}
              value={draft.layout?.span ?? (kind === 'kpi' ? 3 : 6)}
              onChange={(e) => setCard({ layout: { ...(draft.layout ?? {}), span: Number(e.target.value) } })}
            >
              {[2, 3, 4, 6, 8, 9, 12].map((n) => (
                <option key={n} value={n}>
                  {n === 12 ? 'Full' : `${n}/12`}
                </option>
              ))}
            </select>
          </Field>
        </div>
      </Group>

      <Group title="Number format">
        <div className="grid grid-cols-4 gap-3">
          <Field label="Style">
            <select
              className={inputCls}
              value={draft.format?.type ?? ''}
              onChange={(e) =>
                setCard({ format: { ...(draft.format ?? {}), type: e.target.value || undefined } })
              }
            >
              {FORMAT_STYLES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Prefix">
            <input
              className={inputCls}
              value={draft.format?.prefix ?? ''}
              onChange={(e) => setCard({ format: { ...(draft.format ?? {}), prefix: e.target.value } })}
            />
          </Field>
          <Field label="Suffix">
            <input
              className={inputCls}
              value={draft.format?.suffix ?? ''}
              onChange={(e) => setCard({ format: { ...(draft.format ?? {}), suffix: e.target.value } })}
            />
          </Field>
          <Field label="Decimals">
            <select
              className={inputCls}
              value={draft.format?.digits ?? 0}
              onChange={(e) => setCard({ format: { ...(draft.format ?? {}), digits: Number(e.target.value) } })}
            >
              {[0, 1, 2, 3, 4].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </Field>
        </div>
        {draft.columns?.some((c) => c.format && Object.keys(c.format).length > 0) && (
          <Notice>A field on this card carries its own format, which wins over this one.</Notice>
        )}
      </Group>

      {kind === 'kpi' && (
        <Group title="Comparison">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Label" className="col-span-2">
              <input
                className={inputCls}
                placeholder="vs last month"
                value={draft.comparison?.label ?? ''}
                onChange={(e) => setCard({ comparison: { ...(draft.comparison ?? {}), label: e.target.value } })}
              />
            </Field>
            <Field label="Delta unit">
              <input
                className={inputCls}
                value={draft.comparison?.deltaFormat?.suffix ?? '%'}
                onChange={(e) =>
                  setCard({
                    comparison: {
                      ...(draft.comparison ?? {}),
                      deltaFormat: { ...(draft.comparison?.deltaFormat ?? {}), suffix: e.target.value },
                    },
                  })
                }
              />
            </Field>
          </div>
        </Group>
      )}
    </>
  )
}
