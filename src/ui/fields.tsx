import { useId, useState } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { inputCls, labelCls } from './styles'

export function TextField({
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
  disabled,
  required = true,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  autoFocus?: boolean
  disabled?: boolean
  required?: boolean
}) {
  const id = useId()
  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <input
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={inputCls}
        autoComplete={autoComplete}
        autoFocus={autoFocus}
        disabled={disabled}
        required={required}
      />
    </div>
  )
}

export function PasswordField({
  label,
  value,
  onChange,
  autoComplete,
  autoFocus,
  disabled,
  hint,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  autoComplete?: string
  autoFocus?: boolean
  disabled?: boolean
  hint?: string
}) {
  const id = useId()
  const [reveal, setReveal] = useState(false)

  return (
    <div>
      <label htmlFor={id} className={labelCls}>
        {label}
      </label>
      <div className="relative">
        <input
          id={id}
          type={reveal ? 'text' : 'password'}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`${inputCls} pr-10`}
          autoComplete={autoComplete}
          autoFocus={autoFocus}
          disabled={disabled}
          required
        />
        <button
          type="button"
          onClick={() => setReveal((v) => !v)}
          className="absolute inset-y-0 right-0 grid w-10 place-items-center text-slate-400 hover:text-slate-600"
          aria-label={reveal ? `Hide ${label.toLowerCase()}` : `Show ${label.toLowerCase()}`}
          tabIndex={-1}
        >
          {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      </div>
      {hint && <p className="mt-1 text-[11px] text-slate-400">{hint}</p>}
    </div>
  )
}
