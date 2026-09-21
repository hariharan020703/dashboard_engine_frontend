import type { ReactNode } from 'react'

/**
 * The left-hand column of a master/detail screen: rows, one highlighted.
 * Knows nothing about groups or roles, so both admin screens share it.
 */
export default function SelectList<T>({
  items,
  selectedKey,
  onSelect,
  keyOf,
  primary,
  secondary,
  trailing,
}: {
  items: T[]
  selectedKey: string | number | null
  onSelect: (item: T) => void
  keyOf: (item: T) => string | number
  primary: (item: T) => ReactNode
  /** The quieter second line, when there is one to show. */
  secondary?: (item: T) => ReactNode
  /** Pinned to the right — a status badge, or nothing. */
  trailing?: (item: T) => ReactNode
}) {
  return (
    <ul className="divide-y divide-slate-100">
      {items.map((item) => {
        const key = keyOf(item)
        const second = secondary?.(item)
        return (
          <li key={key}>
            <button
              type="button"
              aria-current={selectedKey === key}
              onClick={() => onSelect(item)}
              className={`flex w-full items-center justify-between gap-2 px-5 py-3 text-left transition-colors ${
                selectedKey === key ? 'bg-blue-50' : 'hover:bg-slate-50'
              }`}
            >
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium text-slate-800">
                  {primary(item)}
                </span>
                {second && (
                  <span className="block truncate text-[12px] text-slate-500">{second}</span>
                )}
              </span>
              {trailing?.(item)}
            </button>
          </li>
        )
      })}
    </ul>
  )
}
