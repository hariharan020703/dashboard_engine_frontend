import { useId } from 'react'
import type { RoleName } from '@/types/auth'
import { ROLE_LABELS } from './roleLabels'
import { labelCls, selectCls } from '@/ui/styles'

export default function RoleSelect({
  value,
  onChange,
  includePlatform,
  disabled,
  label = 'Role',
}: {
  value: RoleName
  onChange: (role: RoleName) => void
  includePlatform: boolean
  disabled?: boolean
  label?: string
}) {
  const id = useId()
  const options: RoleName[] = includePlatform
    ? ['SUPER_ADMIN', 'COMPANY_ADMIN', 'USER']
    : ['COMPANY_ADMIN', 'USER']

  return (
    <div>
      <label className={labelCls} htmlFor={id}>
        {label}
      </label>
      <select
        id={id}
        className={selectCls}
        value={value}
        onChange={(e) => onChange(e.target.value as RoleName)}
        disabled={disabled}
      >
        {options.map((role) => (
          <option key={role} value={role}>
            {ROLE_LABELS[role]}
          </option>
        ))}
      </select>
    </div>
  )
}
