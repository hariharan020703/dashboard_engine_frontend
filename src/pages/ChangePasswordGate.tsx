import { useAuth } from '@/context/authContext'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import AuthLayout from '@/layouts/AuthLayout'
import { FormNotice } from '@/ui/feedback'
import { cardCls, ghostButtonCls } from '@/ui/styles'

/**
 * The full-screen stop an account hits in the PASSWORD_CHANGE_REQUIRED state -
 * one whose password was set by somebody else.
 *
 * Unlike before, this is not only a UI decision. The backend refuses every
 * endpoint except the password change itself while the flag is set, so a client
 * that skipped this screen would get a 403 rather than data. The screen exists
 * to explain that, not to enforce it.
 *
 * Signing out is offered as the way past, because leaving somebody with no
 * escape but closing the tab is worse than letting them leave.
 */
export default function ChangePasswordGate() {
  const { user, signOut } = useAuth()

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          Signed in as <span className="font-medium text-slate-700">{user?.username}</span>
        </>
      }
    >
      <div className={`space-y-4 ${cardCls}`}>
        <FormNotice message="This account is using a password somebody else set. Choose your own before continuing — nothing else is available until you do." />
        <ChangePasswordForm
          onDone={() => {
            // The provider re-reads the profile, which clears the state, so
            // this screen unmounts on its own.
          }}
        />
        <button type="button" className={ghostButtonCls} onClick={() => void signOut()}>
          Sign out instead
        </button>
      </div>
    </AuthLayout>
  )
}
