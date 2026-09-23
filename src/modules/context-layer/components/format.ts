/**
 * Display formatting. Nothing in this file computes a fact — it only renders
 * one the backend already established.
 *
 * That distinction is the whole reason the file exists. Storage size in
 * particular must never be derived in the browser: measuring a table by
 * fetching its rows, serialising a response, or summing what happens to be in
 * memory produces a number that is wrong for exactly the datasets where it
 * matters most. The backend reads it from source metadata and sends
 * `sizeBytes`; `formatBytes` turns that integer into "2.4 GB" and does nothing
 * else.
 *
 * The other rule here is that absence is preserved. `null` means the backend
 * did not report the value and renders as "—". `0` means zero and renders as
 * "0". A formatter that collapsed those would invent data.
 */

/** What every formatter renders for a value the backend did not supply. */
export const EMPTY = '—'

const COMPACT = new Intl.NumberFormat('en-US', {
  notation: 'compact',
  maximumFractionDigits: 1,
})

/**
 * A byte count the backend calculated, as human-readable text.
 *
 * Binary units (1024), because that is what a warehouse reports storage in.
 */
export function formatBytes(bytes: number | null | undefined): string {
  if (bytes === null || bytes === undefined || !Number.isFinite(bytes)) return EMPTY
  if (bytes === 0) return '0 B'

  const units = ['B', 'KB', 'MB', 'GB', 'TB', 'PB']
  const exponent = Math.min(Math.floor(Math.log(Math.abs(bytes)) / Math.log(1024)), units.length - 1)
  const value = bytes / Math.pow(1024, exponent)
  // Whole bytes never want a decimal; everything above does, to one place.
  const digits = exponent === 0 ? 0 : value >= 100 ? 0 : 1
  return `${value.toFixed(digits)} ${units[exponent]}`
}

/** A row or record count, abbreviated once it stops being readable in full. */
export function formatCount(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return Math.abs(value) >= 10_000 ? COMPACT.format(value) : value.toLocaleString('en-US')
}

/** An exact count, never abbreviated. For a column count or a small total. */
export function formatExact(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  return value.toLocaleString('en-US')
}

/** A 0–1 confidence as a whole percentage. */
export function formatConfidence(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  // Tolerates a backend that sends 0–100 instead of 0–1 rather than rendering
  // "9700%" — the two are unambiguous at these bounds.
  const ratio = value > 1 ? value / 100 : value
  return `${Math.round(ratio * 100)}%`
}

/** A 0–100 percentage, to one decimal place where it has one. */
export function formatPercent(value: number | null | undefined): string {
  if (value === null || value === undefined || !Number.isFinite(value)) return EMPTY
  const rounded = Math.round(value * 10) / 10
  return `${rounded % 1 === 0 ? rounded.toFixed(0) : rounded.toFixed(1)}%`
}

/**
 * A timestamp as "2 hours ago", falling back to a date once that stops being
 * useful. Accepts the ISO strings and epoch numbers the warehouse APIs mix.
 */
export function formatRelativeTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EMPTY

  const date = typeof value === 'number' ? new Date(value) : new Date(value)
  const ms = date.getTime()
  if (!Number.isFinite(ms)) return EMPTY

  const seconds = Math.round((Date.now() - ms) / 1000)
  if (seconds < 0) return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  if (seconds < 60) return 'just now'

  const minutes = Math.round(seconds / 60)
  if (minutes < 60) return `${minutes} min ago`

  const hours = Math.round(minutes / 60)
  if (hours < 24) return `${hours} ${hours === 1 ? 'hour' : 'hours'} ago`

  const days = Math.round(hours / 24)
  if (days < 30) return `${days} ${days === 1 ? 'day' : 'days'} ago`

  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: date.getFullYear() === new Date().getFullYear() ? undefined : 'numeric',
  })
}

/** An absolute timestamp, for a tooltip beside a relative one. */
export function formatDateTime(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === '') return EMPTY
  const date = new Date(value)
  if (!Number.isFinite(date.getTime())) return EMPTY
  return date.toLocaleString('en-US', {
    dateStyle: 'medium',
    timeStyle: 'short',
  })
}

/** A plain string that may be absent. */
export function formatText(value: string | null | undefined): string {
  return value === null || value === undefined || value === '' ? EMPTY : value
}

/**
 * Masks a secret for display.
 *
 * Used for the credential hint the backend returns. The full token is never
 * held by the frontend, so this only ever operates on the last few characters
 * the API chose to send — there is nothing here that could reveal more than
 * was already given.
 */
export function maskSecretHint(hint: string | null | undefined): string {
  if (!hint) return EMPTY
  return `••••${hint.slice(-4)}`
}
