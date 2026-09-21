import { useAuth } from '@/context/authContext'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import AuthLayout from '@/layouts/AuthLayout'
import { FormNotice } from '@/ui/feedback'
import { cardCls, ghostButtonCls } from '@/ui/styles'

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
