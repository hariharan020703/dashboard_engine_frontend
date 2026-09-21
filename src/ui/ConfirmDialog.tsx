import { useState } from 'react'
import { AlertTriangle, LoaderCircle } from 'lucide-react'
import Modal from './Modal'
import { actionButtonCls, actionDangerCls, actionPrimaryCls } from './styles'

/**
 * Asks before something irreversible.
 *
 * Replaces the `window.confirm` calls the admin screens used. Those cannot say
 * what the consequence is beyond one line of plain text, cannot be styled to
 * signal danger, are blocked outright in some embedded browsers, and give no
 * way to show that the action is in progress once it is accepted - so a slow
 * delete looked like a dead button.
 */
export default function ConfirmDialog({
  title,
  message,
  consequence,
  confirmLabel = 'Confirm',
  destructive = false,
  onConfirm,
  onClose,
}: {
  title: string
  message: string
  /** The part that cannot be undone, called out separately from the question. */
  consequence?: string
  confirmLabel?: string
  destructive?: boolean
  /** Awaited, so the dialog can stay up and disabled while the work happens. */
  onConfirm: () => Promise<void> | void
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)

  const run = async () => {
    if (pending) return
    setPending(true)
    try {
      await onConfirm()
      onClose()
    } finally {
      // The caller reports the outcome through the notification system; this
      // only has to stop the dialog looking stuck if it failed.
      setPending(false)
    }
  }

  return (
    <Modal title={title} onClose={pending ? () => {} : onClose} width="max-w-md">
      <p className="text-sm text-slate-700">{message}</p>

      {consequence && (
        <p className="flex items-start gap-2 rounded-md bg-amber-50 px-3 py-2 text-[13px] leading-snug text-amber-900">
          <AlertTriangle size={14} className="mt-0.5 shrink-0 text-amber-600" />
          <span>{consequence}</span>
        </p>
      )}

      <div className="flex justify-end gap-2 pt-1">
        <button type="button" className={actionButtonCls} onClick={onClose} disabled={pending}>
          Cancel
        </button>
        <button
          type="button"
          className={destructive ? actionDangerCls : actionPrimaryCls}
          onClick={run}
          disabled={pending}
          autoFocus
        >
          {pending && <LoaderCircle size={14} className="animate-spin" />}
          {pending ? 'Working…' : confirmLabel}
        </button>
      </div>
    </Modal>
  )
}
