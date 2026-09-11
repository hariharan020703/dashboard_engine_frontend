import { ChevronDown, X } from 'lucide-react'
import { useEffect, useRef, useState } from 'react'
import type { SlicerDef } from '../types/dashboard'

interface Props {
  slicer: SlicerDef
  values: string[]
  counts: Record<string, number>
  selected: Set<string>
  onChange: (selected: Set<string>) => void
  minHeight?: number
}

export default function SlicerCard({ slicer, values, counts, selected, onChange, minHeight }: Props) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)
  const isMulti = slicer.type !== 'single'
  const showCount = slicer.showCount !== false

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [])

  const toggle = (value: string) => {
    const next = new Set(selected)
    if (next.has(value)) next.delete(value)
    else if (isMulti) next.add(value)
    else {
      next.clear()
      next.add(value)
    }
    onChange(next)
  }

  const clear = () => onChange(new Set())

  const summary = selected.size === 0
    ? 'All'
    : isMulti
      ? `${selected.size} selected`
      : Array.from(selected)[0]

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center justify-between gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-left shadow-sm transition hover:border-blue-400"
        style={minHeight ? { minHeight } : undefined}
      >
        <span className="truncate text-sm font-medium text-slate-700">{slicer.title}</span>
        <span className="flex shrink-0 items-center gap-1">
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold ${selected.size ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-500'}`}>
            {summary}
          </span>
          <ChevronDown
            size={14}
            className={`text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`}
          />
        </span>
      </button>

      {open && (
        <div className="absolute left-0 right-0 z-30 mt-1 max-h-72 min-w-full overflow-auto rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
          <button
            type="button"
            onClick={clear}
            className="mb-1 flex w-full items-center gap-1.5 rounded-md bg-slate-50 px-2 py-1 text-left text-xs font-medium text-slate-500 hover:bg-slate-100 hover:text-slate-700"
          >
            <X size={12} />
            Clear
          </button>
          {!values.length && <p className="px-2 py-1 text-xs text-slate-400">No values</p>}
          {values.map((v) => {
            const checked = selected.has(v)
            return (
              <label
                key={v}
                className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm hover:bg-slate-50"
              >
                <input
                  type={isMulti ? 'checkbox' : 'radio'}
                  checked={checked}
                  onChange={() => toggle(v)}
                  className="accent-blue-600"
                />
                <span className="truncate text-slate-700">{v}</span>
                {showCount && <span className="ml-auto shrink-0 text-xs text-slate-400">{counts[v] ?? 0}</span>}
              </label>
            )
          })}
        </div>
      )}
    </div>
  )
}