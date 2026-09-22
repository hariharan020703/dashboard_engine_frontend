import { useId } from 'react'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { ROLE_DESCRIPTIONS, ROLE_LABELS } from '@/components/common/labels'
import type { RoleName } from '@/types/auth'

export function RoleSelect({
  value,
  onChange,
  includePlatform,
  disabled,
  label = 'Role',
}: {
  value: RoleName
  onChange: (role: RoleName) => void
  /**
   * Whether the platform role may be chosen. Only a platform account may assign
   * it, and the server refuses regardless - this keeps the option from being
   * offered to somebody it would refuse.
   */
  includePlatform: boolean
  disabled?: boolean
  label?: string
}) {
  const id = useId()
  const options: RoleName[] = includePlatform
    ? ['SUPER_ADMIN', 'COMPANY_ADMIN', 'USER']
    : ['COMPANY_ADMIN', 'USER']

  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-foreground">
        {label}
      </Label>
      <Select value={value} onValueChange={(next) => onChange(next as RoleName)} disabled={disabled}>
        <SelectTrigger id={id} className="w-full">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {options.map((role) => (
            <SelectItem key={role} value={role}>
              {ROLE_LABELS[role]}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">{ROLE_DESCRIPTIONS[value]}</p>
    </div>
  )
}
