import { AlertCircle } from 'lucide-react'

/**
 * Inline status banners for a form the user is looking at.
 *
 * These are for problems that belong to the field in front of somebody and have
 * to stay visible while they fix it - a rejected password, a mismatched
 * confirmation, a caution about the state of the record on screen.
 *
 * The OUTCOME of an action is not shown here. That goes through
 * ui/notificationContext, so every create, save, grant and revoke in the
 * application reports itself the same way, and a success banner cannot be
 * forgotten on one screen and present on another.
 */

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
