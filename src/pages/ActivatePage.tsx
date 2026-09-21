import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, LoaderCircle } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { activateAccount, fetchActivationTarget } from '@/api/authApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import AuthLayout from '@/layouts/AuthLayout'
import { useNotification } from '@/ui/notificationContext'
import { FormError, FormNotice } from '@/ui/feedback'
import { PasswordField } from '@/ui/fields'
import { cardCls, primaryButtonCls } from '@/ui/styles'
import type { ActivationTarget } from '@/types/auth'

/**
 * Where an onboarding email lands: choose a password and get signed in.
 *
 * Public, because the person arriving has no session yet - possession of the
 * link is the authorisation, which is why it is single-use and expiring. The
 * token is validated against the server before the form is shown, so somebody
 * following a dead link is told so instead of typing a password into something
 * that will reject it.
 */

/** Mirrors the backend default. The server rejects anything weaker regardless. */
const MIN_LENGTH = 8

export default function ActivatePage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { status, user, adoptSession, refresh } = useAuth()
  const notify = useNotification()

  const [target, setTarget] = useState<ActivationTarget | null>(null)
  const [fetchError, setFetchError] = useState<string | null>(null)
  const [activated, setActivated] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  /*
   * A missing token is decided from the URL rather than written into state:
   * there is nothing to fetch, so there is nothing to be checking, and both
   * facts follow from `token` alone.
   */
  const linkError = token
    ? fetchError
    : 'This link is missing its activation token.'
  const checking = Boolean(token) && target === null && fetchError === null

  useEffect(() => {
    if (!token) return
    let cancelled = false

    const run = async () => {
      try {
        const found = await fetchActivationTarget(token)
        if (!cancelled) setTarget(found)
      } catch (err) {
        if (!cancelled) setFetchError(errorMessage(err, 'This activation link is not valid.'))
      }
    }
    void run()

    return () => {
      cancelled = true
    }
  }, [token])

  /*
   * Leaves only once THIS activation has succeeded.
   *
   * Deliberately not "leave if a session exists". Somebody following an
   * invitation may already be signed in as someone else - an administrator
   * checking the link, or a shared machine - and bouncing them to that other
   * account's home page looks like the link is broken. Possession of the link
   * is the authorisation, so the screen is shown either way and the new session
   * replaces whatever was there.
   */
  if (activated) return <Navigate to="/" replace />

  const signedInAsSomeoneElse =
    status === 'AUTHENTICATED' && user !== null && target !== null && user.username !== target.username

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const ready = password && confirm && !tooShort && !mismatch

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !ready) return
    setError(null)
    setPending(true)
    try {
      const session = await activateAccount(token, password)
      adoptSession(session)
      // The session exists but carries only what login returns; the shell needs
      // the grants and scopes too.
      await refresh()
      setActivated(true)
      notify.success('Your account is ready.', 'You are now signed in.')
    } catch (err) {
      setError(errorMessage(err, 'Could not activate the account.'))
      setPending(false)
    }
  }

  if (checking) {
    return (
      <AuthLayout title="Activating your account">
        <div className={`flex items-center justify-center gap-2 text-sm text-slate-500 ${cardCls}`}>
          <LoaderCircle size={16} className="animate-spin" />
          Checking your link…
        </div>
      </AuthLayout>
    )
  }

  if (linkError || !target) {
    return (
      <AuthLayout title="This link is no longer valid">
        <div className={`space-y-4 ${cardCls}`}>
          <FormError message={linkError || 'This activation link is not valid.'} />
          <p className="text-[13px] text-slate-500">
            Activation links work once and expire. Ask your administrator to send a new one.
          </p>
          <Link to="/login" className="block text-center text-[13px] font-medium text-blue-600">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose your password"
      subtitle={
        <>
          Setting up <span className="font-medium text-slate-700">{target.username}</span>
          {target.companyName && <> at {target.companyName}</>}
        </>
      }
    >
      <form onSubmit={onSubmit} className={`space-y-4 ${cardCls}`}>
        {signedInAsSomeoneElse && (
          <FormNotice
            message={`You are currently signed in as ${user?.username}. Finishing here will replace that session.`}
          />
        )}
        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
          disabled={pending}
          hint={`At least ${MIN_LENGTH} characters, including a digit or symbol.`}
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          disabled={pending}
        />

        {tooShort && <FormError message={`Use at least ${MIN_LENGTH} characters.`} />}
        {!tooShort && mismatch && <FormError message="The two passwords do not match." />}
        {error && <FormError message={error} />}

        <button type="submit" className={primaryButtonCls} disabled={pending || !ready}>
          {pending ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Setting your password…
            </>
          ) : (
            <>
              <KeyRound size={16} />
              Set password and sign in
            </>
          )}
        </button>
      </form>
    </AuthLayout>
  )
}
