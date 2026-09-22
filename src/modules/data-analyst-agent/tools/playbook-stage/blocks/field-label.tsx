export function FieldLabel({
  label,
  hint,
  required,
}: {
  label: string
  hint?: string
  required?: boolean
}) {
  return (
    <span className="text-sm font-semibold text-card-foreground">
      {label}
      {required && <span className="text-destructive"> *</span>}
      {hint && <span className="font-normal text-muted-foreground"> ({hint})</span>}
    </span>
  )
}
