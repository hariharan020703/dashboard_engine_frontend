/**
 * A wrap of toggleable chips: pick any number of values from a short list.
 * Shared by the group membership editor and the data-scope editor.
 *
 * Items are matched on the key `keyOf` returns, so a list of ids and a list of
 * strings both work without the caller converting anything.
 */
export default function ChipSelect<T>({
  options,
  selected,
  onToggle,
  keyOf,
  labelOf,
  disabled,
  emptyMessage,
}: {
  options: T[]
  selected: Array<string | number>
  onToggle: (option: T) => void
  keyOf: (option: T) => string | number
  labelOf: (option: T) => string
  disabled?: boolean
  /** Shown instead of the chips when there is nothing to choose from. */
  emptyMessage: string
}) {
  if (!options.length) return <p className="text-[13px] text-slate-400">{emptyMessage}</p>

  return (
    <div className="flex flex-wrap gap-1.5">
      {options.map((option) => {
        const key = keyOf(option)
        const on = selected.includes(key)
        return (
          <button
            key={key}
            type="button"
            aria-pressed={on}
            disabled={disabled}
            onClick={() => onToggle(option)}
            className={`rounded-md border px-2 py-1 text-[12px] transition-colors ${
              on
                ? 'border-blue-300 bg-blue-50 font-medium text-blue-700'
                : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
            } disabled:cursor-not-allowed disabled:opacity-60`}
          >
            {labelOf(option)}
          </button>
        )
      })}
    </div>
  )
}
