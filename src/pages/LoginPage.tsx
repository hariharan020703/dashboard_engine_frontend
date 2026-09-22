import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, LogIn } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import AuthLayout from '@/layouts/AuthLayout'
import { Button } from '@/components/ui/button'
import { FormError, PasswordField, TextField } from '@/components/common/Fields'
import { notify } from '@/components/common/notify'
import { errorCode, errorMessage } from '@/api/http'

export default function LoginPage() {
  const { signIn } = useAuth()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending) return

    setError(null)
    setPending(true)
    try {
      await signIn(identifier.trim(), password)
      // On success the provider flips status and this screen unmounts, so there
      // is deliberately no setPending(false) on that path.
    } catch (err) {
      const code = errorCode(err)
      setError(errorMessage(err, 'Sign-in failed.'))

      /*
       * A rate limit, a switched-off account or a suspended company is not a
       * typo - re-reading the same red line will not fix it - so those get a
       * toast as well, which persists after the field is edited.
       */
      if (code === 'RATE_LIMITED' || code === 'ACCOUNT_DISABLED' || code === 'COMPANY_DISABLED') {
        notify.warning('Cannot sign in', errorMessage(err, 'Sign-in failed.'))
      }
      setPending(false)
    }
  }

  const ready = identifier.trim().length > 0 && password.length > 0

  return (
    <AuthLayout
      title="Elze Analytics"
      subtitle="Sign in to your workspace"
      footer="Accounts are created by an administrator. Check your email for an activation link."
    >
      <form onSubmit={onSubmit} className="space-y-4" noValidate>
        <TextField
          label="Username or email"
          value={identifier}
          onChange={setIdentifier}
          autoComplete="username"
          autoFocus
          disabled={pending}
          required
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={pending}
        />

        {error && <FormError message={error} />}

        <Button type="submit" className="w-full" size="lg" disabled={pending || !ready}>
          {pending ? (
            <>
              <Loader2 className="animate-spin" aria-hidden />
              Signing in…
            </>
          ) : (
            <>
              <LogIn aria-hidden />
              Sign in
            </>
          )}
        </Button>
      </form>
    </AuthLayout>
  )
}
