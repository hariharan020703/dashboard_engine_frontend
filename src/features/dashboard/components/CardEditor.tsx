import { useState } from 'react'
import type { Aggregation, CardDefinition, ColumnDef, Mapping, SeriesDef } from '../types/dashboard'

const AGGS: Aggregation[] = ['SUM', 'AVERAGE', 'COUNT', 'COUNTDISTINCT', 'MIN', 'MAX']
const MAPPINGS: Mapping[] = ['XTIME', 'VALUE', 'SERIES', 'XVAL', 'ITEM']

interface Props {
  card: CardDefinition
  kind: 'kpi' | 'chart'
  onSave: (updated: CardDefinition) => void
  onClose: () => void
}

function columnsOf(card: CardDefinition, kind: 'kpi' | 'chart'): ColumnDef[] {
  return (kind === 'kpi' ? card.series?.main?.columns : card.columns) ?? []
}

const inputCls =
  'w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-sm text-slate-800 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500'
const labelCls = 'text-[11px] font-semibold uppercase tracking-wide text-slate-400'
const sectionCls = 'border-b border-slate-100 pb-4'
const secTitleCls = 'mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500'

export default function CardEditor({ card, kind, onSave, onClose }: Props) {
  const [draft, setDraft] = useState<CardDefinition>(() => structuredClone(card))

  const setCard = (patch: Partial<CardDefinition>) => setDraft((prev) => ({ ...prev, ...patch }))
  const setOption = (key: string, value: unknown) =>
    setCard({ options: { ...(draft.options ?? {}), [key]: value } })

  const setColumn = (idx: number, field: string, value: unknown) =>
    setDraft((prev) => {
      if (kind === 'kpi') {
        const cols = [...(prev.series?.main?.columns ?? [])]
        cols[idx] = { ...(cols[idx] ?? {}), [field]: value }
        return {
          ...prev,
          series: {
            ...(prev.series ?? {}),
            main: { ...(prev.series?.main ?? {}), columns: cols },
          },
        }
      }
      const cols = [...(prev.columns ?? [])]
      cols[idx] = { ...(cols[idx] ?? {}), [field]: value }
      return { ...prev, columns: cols }
    })

  const addColumn = () =>
    setDraft((prev) => {
      const next = { column: '', mapping: 'VALUE' as Mapping, aggregation: 'SUM' as Aggregation }
      if (kind === 'kpi') {
        const main: Partial<SeriesDef> = prev.series?.main ?? {}
        const cols = [...(main.columns ?? []), next]
        return { ...prev, series: { ...(prev.series ?? {}), main: { ...main, columns: cols } } }
      }
      return { ...prev, columns: [...(prev.columns ?? []), next] }
    })

  const removeColumn = (idx: number) =>
    setDraft((prev) => {
      if (kind === 'kpi') {
        const cols = (prev.series?.main?.columns ?? []).filter((_, i) => i !== idx)
        return { ...prev, series: { ...(prev.series ?? {}), main: { ...(prev.series?.main ?? {}), columns: cols } } }
      }
      return { ...prev, columns: (prev.columns ?? []).filter((_, i) => i !== idx) }
    })

  const columns = columnsOf(draft, kind)
  const option = (key: string) => (draft.options ?? {})[key]
  const colorMap = (option('colorMapping') as Record<string, string>) ?? {}

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4" onClick={onClose}>
      <div
        className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-xl bg-white p-5 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">
            Edit {kind === 'kpi' ? 'KPI' : 'Chart'} — {draft.title || draft.name}
          </h2>
          <button onClick={onClose} className="rounded-md px-2 py-1 text-sm text-slate-400 hover:bg-slate-100 hover:text-slate-600">
            ✕
          </button>
        </div>

        <div className="space-y-4">
          <div className={sectionCls}>
            <p className={secTitleCls}>Identity</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Name</label>
                <input className={inputCls} value={draft.name ?? ''} onChange={(e) => setCard({ name: e.target.value })} />
              </div>
              <div>
                <label className={labelCls}>Title</label>
                <input className={inputCls} value={draft.title ?? ''} onChange={(e) => setCard({ title: e.target.value })} />
              </div>
              <div className="col-span-2">
                <label className={labelCls}>Description</label>
                <input className={inputCls} value={draft.description ?? ''} onChange={(e) => setCard({ description: e.target.value })} />
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={secTitleCls}>Layout</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Span (1–12 cols)</label>
                <input
                  type="number" min={1} max={12}
                  className={inputCls}
                  value={draft.layout?.span ?? (kind === 'kpi' ? 3 : 6)}
                  onChange={(e) =>
                    setDraft((prev) => ({
                      ...prev,
                      layout: { ...(prev.layout ?? {}), span: Math.max(1, Math.min(12, Number(e.target.value) || 1)) },
                    }))
                  }
                />
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={secTitleCls}>Columns</p>
            <div className="space-y-2">
              {columns.map((col, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                  <div className="col-span-3">
                    <label className={labelCls}>Column</label>
                    <input className={inputCls} value={col.column ?? ''} onChange={(e) => setColumn(i, 'column', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Alias</label>
                    <input className={inputCls} value={col.alias ?? ''} onChange={(e) => setColumn(i, 'alias', e.target.value)} />
                  </div>
                  <div className="col-span-2">
                    <label className={labelCls}>Mapping</label>
                    <select className={inputCls} value={col.mapping ?? 'VALUE'} onChange={(e) => setColumn(i, 'mapping', e.target.value)}>
                      {MAPPINGS.map((m) => <option key={m} value={m}>{m}</option>)}
                    </select>
                  </div>
                  <div className="col-span-3">
                    <label className={labelCls}>Aggregation</label>
                    <select className={inputCls} value={col.aggregation ?? 'SUM'} onChange={(e) => setColumn(i, 'aggregation', e.target.value)}>
                      {AGGS.map((a) => <option key={a} value={a}>{a}</option>)}
                    </select>
                  </div>
                  <div className="col-span-2 flex justify-end pt-4">
                    <button className="rounded-md px-2 py-1 text-sm text-rose-500 hover:bg-rose-50" onClick={() => removeColumn(i)}>
                      ✕
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <button
              onClick={addColumn}
              className="mt-2 rounded-md border border-dashed border-slate-300 px-3 py-1 text-sm text-slate-500 hover:border-blue-400 hover:text-blue-500"
            >
              + Add column
            </button>
            <div className="mt-3">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className={labelCls}>Group by column</label>
                  <input
                    className={inputCls}
                    value={draft.groupBy?.[0]?.column ?? ''}
                    onChange={(e) =>
                      setCard({ groupBy: [{ column: e.target.value }] })
                    }
                  />
                </div>
                {kind === 'chart' && (
                  <div>
                    <label className={labelCls}>Limit (values shown)</label>
                    <input
                      type="number" min={1}
                      className={inputCls}
                      placeholder="all"
                      value={draft.limits ?? ''}
                      onChange={(e) =>
                        setCard({ limits: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value) || 1) })
                      }
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={secTitleCls}>Formatting</p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Digits</label>
                <input
                  type="number" min={0} max={6}
                  className={inputCls}
                  value={draft.format?.digits ?? 0}
                  onChange={(e) => setCard({ format: { ...(draft.format ?? {}), digits: Math.max(0, Math.min(6, Number(e.target.value) || 0)) } })}
                />
              </div>
              <div>
                <label className={labelCls}>Prefix</label>
                <input className={inputCls} value={draft.format?.prefix ?? ''} onChange={(e) => setCard({ format: { ...(draft.format ?? {}), prefix: e.target.value } })} />
              </div>
              <div>
                <label className={labelCls}>Suffix</label>
                <input className={inputCls} value={draft.format?.suffix ?? ''} onChange={(e) => setCard({ format: { ...(draft.format ?? {}), suffix: e.target.value } })} />
              </div>
            </div>
          </div>

          <div className={sectionCls}>
            <p className={secTitleCls}>Comparison</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Label</label>
                <input
                  className={inputCls}
                  value={draft.comparison?.label ?? ''}
                  onChange={(e) => setCard({ comparison: { ...(draft.comparison ?? {}), label: e.target.value } })}
                />
              </div>
              <div>
                <label className={labelCls}>Delta suffix</label>
                <input
                  className={inputCls}
                  value={draft.comparison?.deltaFormat?.suffix ?? '%'}
                  onChange={(e) =>
                    setCard({ comparison: { ...(draft.comparison ?? {}), deltaFormat: { ...(draft.comparison?.deltaFormat ?? {}), suffix: e.target.value } } })
                  }
                />
              </div>
            </div>
          </div>

          {kind === 'chart' && (
            <div className={sectionCls}>
              <p className={secTitleCls}>Chart Options</p>
              <div className="flex flex-wrap gap-4">
                {['dualAxis', 'stacked', 'gradient', 'showLabels'].map((key) => (
                  <label key={key} className="flex items-center gap-2 text-sm text-slate-700">
                    <input
                      type="checkbox"
                      checked={Boolean(option(key))}
                      onChange={(e) => setOption(key, e.target.checked || undefined)}
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    {key}
                  </label>
                ))}
              </div>
              <div className="mt-3">
                <div className="flex items-center justify-between">
                  <label className={labelCls}>Color mapping</label>
                  <button
                    onClick={() => setOption('colorMapping', { ...colorMap, '': '' })}
                    className="text-xs text-blue-500 hover:underline"
                  >
                    + Add color
                  </button>
                </div>
                <div className="mt-1 space-y-1.5">
                  {Object.entries(colorMap).map(([key, color]) => (
                    <div key={key} className="flex items-center gap-2">
                      <input className={inputCls} placeholder="series key" value={key} onChange={(e) => {
                        const rest = { ...colorMap }
                        delete rest[key]
                        if (e.target.value) rest[e.target.value] = color
                        setOption('colorMapping', rest)
                      }} />
                      <input
                        type="color"
                        value={/^#[0-9a-fA-F]{6}$/.test(color) ? color : '#64748b'}
                        onChange={(e) => setOption('colorMapping', { ...colorMap, [key]: e.target.value })}
                        className="h-8 w-12 cursor-pointer rounded border border-slate-300"
                      />
                      <button className="rounded-md px-2 py-1 text-sm text-rose-500 hover:bg-rose-50" onClick={() => {
                        const rest = { ...colorMap }
                        delete rest[key]
                        setOption('colorMapping', rest)
                      }}>✕</button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-5 flex items-center justify-end gap-2">
          <button onClick={onClose} className="rounded-md px-4 py-2 text-sm text-slate-600 hover:bg-slate-100">
            Cancel
          </button>
          <button
            onClick={() => onSave(structuredClone(draft))}
            className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
          >
            Save & reflect in JSON
          </button>
        </div>
      </div>
    </div>
  )
}