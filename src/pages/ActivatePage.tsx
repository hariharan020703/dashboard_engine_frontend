import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { KeyRound, Loader2 } from 'lucide-react'
import { Link, Navigate, useSearchParams } from 'react-router-dom'
import { activateAccount, fetchActivationTarget } from '@/api/authApi'
import { errorMessage } from '@/api/http'
import { useAuth } from '@/context/authContext'
import AuthLayout from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { FormError, FormNotice, PasswordField } from '@/components/common/Fields'
import { notify } from '@/components/common/notify'
import type { ActivationTarget } from '@/types/auth'

/** Mirrors MIN_PASSWORD_LENGTH on the server, which is the enforcing side. */
const MIN_LENGTH = 8

/**
 * First login: the screen an activation link opens.
 *
 * This is where an account gets its password - the only place it ever does.
 * Nobody, including the administrator who created the account, has seen a
 * credential for it before this point, which is the property the whole
 * link-based onboarding exists to have.
 *
 * The link is resolved before the form is shown, so a dead link says so
 * immediately rather than after somebody has chosen and typed a password twice.
 */
export default function ActivatePage() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const { status, user, adoptSession, refresh } = useAuth()

  const [target, setTarget] = useState<ActivationTarget | null>(null)
  const [linkError, setLinkError] = useState<string | null>(
    token ? null : 'This link is missing its activation token.'
  )
  const [activated, setActivated] = useState(false)

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const checking = Boolean(token) && target === null && linkError === null

  useEffect(() => {
    if (!token) return
    let cancelled = false

    fetchActivationTarget(token)
      .then((found) => {
        if (!cancelled) setTarget(found)
      })
      .catch((err: unknown) => {
        if (!cancelled) setLinkError(errorMessage(err, 'This activation link is not valid.'))
      })

    return () => {
      cancelled = true
    }
  }, [token])

  // The shell decides where to land, which depends on the new account's role.
  if (activated) return <Navigate to="/" replace />

  const replacingAnotherSession =
    status === 'AUTHENTICATED' && user !== null && target !== null && user.username !== target.username

  const tooShort = password.length > 0 && password.length < MIN_LENGTH
  const mismatch = confirm.length > 0 && password !== confirm
  const ready = Boolean(password && confirm) && !tooShort && !mismatch

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending || !ready) return

    setError(null)
    setPending(true)
    try {
      const session = await activateAccount(token, password)
      adoptSession(session)
      // The session carries only what login returns; the shell also needs the
      // grants and scopes before it can draw the navigation.
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
        <div
          className="flex items-center justify-center gap-2 py-4 text-sm text-muted-foreground"
          role="status"
          aria-live="polite"
        >
          <Loader2 className="size-4 animate-spin" aria-hidden />
          Checking your link…
        </div>
      </AuthLayout>
    )
  }

  if (linkError || !target) {
    return (
      <AuthLayout title="This link is no longer valid">
        <div className="space-y-4">
          <FormError message={linkError || 'This activation link is not valid.'} />
          <p className="text-sm text-muted-foreground">
            Activation links work once and expire. Ask your administrator to send a new one.
          </p>
          <Button variant="outline" className="w-full" asChild>
            <Link to="/login">Back to sign in</Link>
          </Button>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout
      title="Choose your password"
      subtitle={
        <>
          Setting up <span className="font-medium text-foreground">{target.username}</span>
          {target.companyName && <> at {target.companyName}</>}
        </>
      }
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        {replacingAnotherSession && (
          <FormNotice
            message={`You are signed in as ${user?.username}. Finishing here replaces that session.`}
          />
        )}

        <PasswordField
          label="New password"
          value={password}
          onChange={setPassword}
          autoComplete="new-password"
          autoFocus
          disabled={pending}
          hint={`At least ${MIN_LENGTH} characters.`}
          error={tooShort ? `Use at least ${MIN_LENGTH} characters.` : null}
        />
        <PasswordField
          label="Confirm password"
          value={confirm}
          onChange={setConfirm}
          autoComplete="new-password"
          disabled={pending}
          error={mismatch ? 'The two passwords do not match.' : null}
        />

        {error && <FormError message={error} />}

        <Button type="submit" className="w-full" size="lg" disabled={pending || !ready}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Setting your password…
            </>
          ) : (
            <>
              <KeyRound aria-hidden />
              Set password and sign in
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
