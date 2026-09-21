import { useId } from 'react'
import type { RoleName } from '@/types/auth'
import { ROLE_LABELS } from './roleLabels'
import { labelCls, selectCls } from '@/ui/styles'

/**
 * Pick a role.
 *
 * The three roles are a fixed part of the business model, not a list to fetch:
 * the backend seeds exactly these and refuses to create a fourth. What DOES
 * vary is which of them the signed-in user may assign, and that is decided by
 * whether they are a platform account - a company administrator handing out
 * SUPER_ADMIN is the escalation the whole design exists to prevent, and the
 * backend rejects it whatever this select offers.
 */
export default function RoleSelect({
  value,
  onChange,
  includePlatform,
  disabled,
  label = 'Role',
}: {
  value: RoleName
  onChange: (role: RoleName) => void
  /** True only for a platform account, which may create another one. */
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
