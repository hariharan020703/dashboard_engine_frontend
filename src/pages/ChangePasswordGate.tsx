import { useAuth } from '@/context/authContext'
import AuthLayout from '@/layouts/AuthLayout'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'
import { Button } from '@/components/ui/button'
import { FormNotice } from '@/components/common/Fields'

/**
 * The screen an account is held on until it sets its own password.
 *
 * Not a suggestion: the server refuses every other endpoint while the flag is
 * set, so this is the only thing such an account can do. Signing out is offered
 * because the alternative - being stuck on a screen with no way off it - is how
 * somebody ends up force-quitting the browser.
 */
export default function ChangePasswordGate() {
  const { user, signOut } = useAuth()

  return (
    <AuthLayout
      title="Choose a new password"
      subtitle={
        <>
          Signed in as <span className="font-medium text-foreground">{user?.username}</span>
        </>
      }
    >
      <div className="space-y-4">
        <FormNotice message="This account is using a password somebody else set. Choose your own to continue — nothing else is available until you do." />

        <ChangePasswordForm
          onDone={() => {
            // The provider re-reads the profile, which clears the flag, so this
            // screen unmounts on its own.
          }}
        />

        <Button
          type="button"
          variant="ghost"
          className="w-full text-muted-foreground"
          onClick={() => void signOut()}
        >
          Sign out instead
        </Button>
      </div>
    </AuthLayout>
  )
}
