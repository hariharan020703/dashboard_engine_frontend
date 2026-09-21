import { AlertCircle } from 'lucide-react'

export function FormError({ message }: { message: string }) {
  return (
    <p
      role="alert"
      className="flex items-start gap-1.5 rounded-md bg-red-50 px-3 py-2 text-[13px] leading-snug text-red-700"
    >
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-red-500" />
      <span>{message}</span>
    </p>
  )
}

export function FormNotice({ message }: { message: string }) {
  return (
    <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-800">
      <AlertCircle size={14} className="mt-0.5 shrink-0 text-amber-500" />
      <span>{message}</span>
    </p>
  )
}
