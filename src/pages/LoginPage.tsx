import { useState } from 'react'
import type { FormEvent } from 'react'
import { LoaderCircle, LogIn } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import AuthLayout from '@/layouts/AuthLayout'
import { useNotification } from '@/ui/notificationContext'
import { FormError } from '@/ui/feedback'
import { PasswordField, TextField } from '@/ui/fields'
import { cardCls, primaryButtonCls } from '@/ui/styles'
import { errorCode, errorMessage } from '@/api/client'

export default function LoginPage() {
  const { signIn } = useAuth()
  const notify = useNotification()

  const [identifier, setIdentifier] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    setError(null)
    setPending(true)
    try {
      await signIn(identifier.trim(), password)
      notify.success('Signed in.')
      // On success the provider flips status and this screen unmounts - there
      // is deliberately no setPending(false) on that path.
    } catch (err) {
      const code = errorCode(err)
      setError(errorMessage(err, 'Sign-in failed.'))

      // A rate limit or a switched-off account is not a typo, and the person
      // needs to notice it rather than re-read the same red line.
      if (code === 'RATE_LIMITED' || code === 'ACCOUNT_DISABLED' || code === 'COMPANY_DISABLED') {
        notify.warning(errorMessage(err, 'Sign-in failed.'))
      }
      setPending(false)
    }
  }

  return (
    <AuthLayout title="BI Dashboard" subtitle="Sign in to continue">
      <form onSubmit={onSubmit} className={`space-y-4 ${cardCls}`}>
        <TextField
          label="Username or email"
          value={identifier}
          onChange={setIdentifier}
          autoComplete="username"
          autoFocus
          disabled={pending}
        />
        <PasswordField
          label="Password"
          value={password}
          onChange={setPassword}
          autoComplete="current-password"
          disabled={pending}
        />

        {error && <FormError message={error} />}

        <button
          type="submit"
          className={primaryButtonCls}
          disabled={pending || !identifier.trim() || !password}
        >
          {pending ? (
            <>
              <LoaderCircle size={16} className="animate-spin" />
              Signing in…
            </>
          ) : (
            <>
              <LogIn size={16} />
              Sign in
            </>
          )}
        </button>

        <p className="text-center text-[12px] text-slate-400">
          Accounts are created by an administrator. Check your email for an activation link.
        </p>
      </form>
    </AuthLayout>
  )
}
