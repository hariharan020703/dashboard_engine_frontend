import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { changePassword } from '@/api/authApi'
import { useNotification } from '@/ui/notificationContext'
import { FormError } from '@/ui/feedback'
import { PasswordField } from '@/ui/fields'
import { ghostButtonCls, primaryButtonCls } from '@/ui/styles'
import { errorMessage } from '@/api/client'

const MIN_LENGTH = 8

export default function ChangePasswordForm({
  onDone,
  onCancel,
  cancelLabel,
}: {
  onDone: () => void
  onCancel?: () => void
  cancelLabel?: string
}) {
  const { adoptSession, refresh } = useAuth()
  const notify = useNotification()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const mismatch = confirm.length > 0 && next !== confirm
  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const unchanged = next.length > 0 && next === current
  const ready = current && next && confirm && !mismatch && !tooShort && !unchanged

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !ready) return
    setError(null)
    setPending(true)
    try {
      const session = await changePassword(current, next)
      adoptSession(session)
      await refresh()
      notify.success('Your password has been changed.', 'Any other sessions have been signed out.')
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password.'))
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <PasswordField
        label="Current password"
        value={current}
        onChange={setCurrent}
        autoComplete="current-password"
        autoFocus
        disabled={pending}
      />
      <PasswordField
        label="New password"
        value={next}
        onChange={setNext}
        autoComplete="new-password"
        disabled={pending}
        hint={`At least ${MIN_LENGTH} characters, including a digit or symbol.`}
      />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        disabled={pending}
      />

      {mismatch && <FormError message="The two new passwords do not match." />}
      {!mismatch && tooShort && (
        <FormError message={`The new password must be at least ${MIN_LENGTH} characters.`} />
      )}
      {!mismatch && !tooShort && unchanged && (
        <FormError message="The new password must differ from the current one." />
      )}
      {error && <FormError message={error} />}

      <div className="space-y-2">
        <button type="submit" className={primaryButtonCls} disabled={pending || !ready}>
          {pending ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Saving…
            </>
          ) : (
            <>
              <KeyRound size={16} />
              Change password
            </>
          )}
        </button>
        {onCancel && (
          <button type="button" className={ghostButtonCls} onClick={onCancel} disabled={pending}>
            {cancelLabel || 'Cancel'}
          </button>
        )}
      </div>
    </form>
  )
}
