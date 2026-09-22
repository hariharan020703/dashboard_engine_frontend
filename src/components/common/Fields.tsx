import { useId, useState } from 'react'
import type { ReactNode } from 'react'
import { AlertCircle, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * Labelled form fields.
 *
 * Every field gets a real <label> bound by id, and an error is tied to the
 * input through aria-describedby and aria-invalid rather than only being red
 * text underneath it - which is invisible to a screen reader and to anyone who
 * does not see the colour.
 */

export function Field({
  label,
  htmlFor,
  hint,
  error,
  required,
  children,
}: {
  label: string
  htmlFor: string
  hint?: ReactNode
  error?: string | null
  required?: boolean
  children: ReactNode
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={htmlFor} className="text-xs font-medium text-foreground">
        {label}
        {required && (
          <span className="text-destructive" aria-hidden>
            *
          </span>
        )}
      </Label>
      {children}
      {error ? (
        <p
          id={`${htmlFor}-error`}
          role="alert"
          className="flex items-start gap-1 text-xs text-destructive"
        >
          <AlertCircle className="mt-px size-3 shrink-0" aria-hidden />
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${htmlFor}-hint`} className="text-xs text-muted-foreground">
            {hint}
          </p>
        )
      )}
    </div>
  )
}

export function TextField({
  label,
  value,
  onChange,
  hint,
  error,
  placeholder,
  autoComplete,
  autoFocus,
  disabled,
  required,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: string | null
  placeholder?: string
  autoComplete?: string
  autoFocus?: boolean
  disabled?: boolean
  required?: boolean
  type?: 'text' | 'email'
}) {
  const id = useId()
  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <Input
        id={id}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
        aria-invalid={Boolean(error)}
        aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
      />
    </Field>
  )
}

export function PasswordField({
  label,
  value,
  onChange,
  hint,
  error,
  autoComplete,
  autoFocus,
  disabled,
  required = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  hint?: ReactNode
  error?: string | null
  autoComplete?: string
  autoFocus?: boolean
  disabled?: boolean
  required?: boolean
}) {
  const id = useId()
  const [revealed, setRevealed] = useState(false)

  return (
    <Field label={label} htmlFor={id} hint={hint} error={error} required={required}>
      <div className="relative">
        <Input
          id={id}
          type={revealed ? 'text' : 'password'}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          className="pr-10"
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          required={required}
          aria-invalid={Boolean(error)}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
        />
        <button
          type="button"
          onClick={() => setRevealed((value) => !value)}
          className={cn(
            'absolute inset-y-0 right-0 grid w-10 place-items-center rounded-r-md',
            'text-muted-foreground transition-colors hover:text-foreground',
            'focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2'
          )}
          aria-label={revealed ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          aria-pressed={revealed}
        >
          {revealed ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        </button>
      </div>
    </Field>
  )
}

/** A form-level failure, above the submit button. */
export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-2 rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
    >
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  )
}

/** Something the person should read before acting, but which is not an error. */
export function FormNotice({ message }: { message: ReactNode }) {
  return (
    <p className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{message}</span>
    </p>
  )
}
