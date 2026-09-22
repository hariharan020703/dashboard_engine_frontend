import { Check } from 'lucide-react'
import { cn } from '@/lib/utils'

/**
 * A multi-select rendered as toggle chips.
 *
 * Each chip is a real toggle button carrying aria-pressed, and a selected one
 * shows a tick as well as a tint - so the selection is legible without relying
 * on colour, and reads as "pressed" to a screen reader.
 */
export function ChipSelect<T>({
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
  emptyMessage: string
}) {
  if (options.length === 0) {
    return <p className="text-sm text-muted-foreground">{emptyMessage}</p>
  }

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
            className={cn(
              'inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs transition-colors',
              'focus-visible:outline-ring focus-visible:outline-2 focus-visible:outline-offset-1',
              'disabled:cursor-not-allowed disabled:opacity-60',
              on
                ? 'border-primary/30 bg-primary/10 font-medium text-primary'
                : 'border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            {on && <Check className="size-3" aria-hidden />}
            {labelOf(option)}
          </button>
        )
      })}
    </div>
  )
}
