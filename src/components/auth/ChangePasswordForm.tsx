import { useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { changePassword } from '@/api/authApi'
import { Button } from '@/components/ui/button'
import { FormError, PasswordField } from '@/components/common/Fields'
import { notify } from '@/components/common/notify'
import { errorMessage } from '@/api/http'

/** Mirrors MIN_PASSWORD_LENGTH on the server, which is the enforcing side. */
const MIN_LENGTH = 8

/**
 * Changing your own password.
 *
 * Used in two places - the account menu, and the gate an account is held behind
 * when it must set a password before doing anything else - so the surrounding
 * explanation belongs to the caller and this is only the form.
 *
 * Each rule is checked as it becomes checkable and reported next to the field
 * it concerns, rather than all at once after a failed submit.
 */
export default function ChangePasswordForm({
  onDone,
  onCancel,
  cancelLabel = 'Cancel',
}: {
  onDone: () => void
  onCancel?: () => void
  cancelLabel?: string
}) {
  const { adoptSession, refresh } = useAuth()

  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const tooShort = next.length > 0 && next.length < MIN_LENGTH
  const unchanged = next.length > 0 && next === current
  const mismatch = confirm.length > 0 && next !== confirm
  const ready = Boolean(current && next && confirm) && !tooShort && !unchanged && !mismatch

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending || !ready) return

    setError(null)
    setPending(true)
    try {
      /*
       * The server rotates the session as part of the change - every other
       * session is revoked - so the response carries a new access token that
       * has to be adopted before anything else is called.
       */
      const session = await changePassword(current, next)
      adoptSession(session)
      await refresh()
      notify.success('Your password has been changed.', 'Every other session has been signed out.')
      onDone()
    } catch (err) {
      setError(errorMessage(err, 'Could not change the password.'))
      setPending(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
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
        hint={`At least ${MIN_LENGTH} characters.`}
        error={
          tooShort
            ? `Must be at least ${MIN_LENGTH} characters.`
            : unchanged
              ? 'Must differ from your current password.'
              : null
        }
      />
      <PasswordField
        label="Confirm new password"
        value={confirm}
        onChange={setConfirm}
        autoComplete="new-password"
        disabled={pending}
        error={mismatch ? 'The two passwords do not match.' : null}
      />

      {error && <FormError message={error} />}

      <div className="flex flex-col gap-2 sm:flex-row-reverse">
        <Button type="submit" className="sm:flex-1" disabled={pending || !ready}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Saving…
            </>
          ) : (
            <>
              <KeyRound aria-hidden />
              Change password
            </>
          )}
        </Button>
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            className="sm:flex-1"
            onClick={onCancel}
            disabled={pending}
          >
            {cancelLabel}
          </Button>
        )}
      </div>
    </form>
  )
}
