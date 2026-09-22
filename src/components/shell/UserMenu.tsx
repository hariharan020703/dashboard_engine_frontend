import { useState } from 'react'
import { ChevronDown, KeyRound, LogOut, UserCircle } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { RoleBadge } from '@/components/common/Badges'
import ChangePasswordForm from '@/components/auth/ChangePasswordForm'

/** Initials for the avatar, from whichever name the account actually has. */
function initials(name: string): string {
  return name
    .split(/[\s._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

/**
 * The account menu.
 *
 * The role is shown here rather than in the page chrome: it is the answer to
 * "what am I allowed to do", which somebody asks about themselves, not
 * something the product should be asserting across the top of every screen.
 *
 * `paths.profile` rather than a literal, so a platform administrator opening
 * their profile stays in the console.
 */
export function UserMenu() {
  const { user, signOut } = useAuth()
  const paths = usePaths()
  const [changingPassword, setChangingPassword] = useState(false)
  const [signingOut, setSigningOut] = useState(false)

  if (!user) return null

  const name = user.displayName || user.username

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2.5 rounded-lg border border-transparent px-2 hover:border-border/80 hover:bg-muted/60 transition-all select-none"
            aria-label="Account menu"
          >
            <Avatar className="size-7 ring-1 ring-border/80">
              <AvatarFallback className="bg-primary/10 text-xs font-semibold text-primary">
                {initials(name)}
              </AvatarFallback>
            </Avatar>
            <div className="hidden flex-col items-start text-left sm:flex">
              <span className="max-w-[8rem] truncate text-xs font-semibold leading-tight text-foreground">
                {name}
              </span>
              <span className="text-[10px] text-muted-foreground leading-tight">
                {user.role}
              </span>
            </div>
            <ChevronDown className="size-3 text-muted-foreground opacity-60" aria-hidden />
          </Button>
        </DropdownMenuTrigger>

        <DropdownMenuContent align="end" className="w-64">
          <DropdownMenuLabel className="font-normal">
            <p className="truncate text-sm font-medium text-foreground">{name}</p>
            <p className="truncate text-xs text-muted-foreground">{user.email}</p>
            <div className="mt-2">
              <RoleBadge role={user.role} />
            </div>
          </DropdownMenuLabel>

          <DropdownMenuSeparator />

          <DropdownMenuItem asChild>
            <Link to={paths.profile}>
              <UserCircle aria-hidden />
              Your account
            </Link>
          </DropdownMenuItem>

          <DropdownMenuItem onSelect={() => setChangingPassword(true)}>
            <KeyRound aria-hidden />
            Change password
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          <DropdownMenuItem
            variant="destructive"
            disabled={signingOut}
            onSelect={(event) => {
              // Kept open while the request is in flight so the item can show
              // its disabled state rather than the menu vanishing mid-action.
              event.preventDefault()
              setSigningOut(true)
              void signOut().finally(() => setSigningOut(false))
            }}
          >
            <LogOut aria-hidden />
            {signingOut ? 'Signing out…' : 'Sign out'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={changingPassword} onOpenChange={setChangingPassword}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Change password</DialogTitle>
            <DialogDescription>
              Changing your password signs out every other session on your account.
            </DialogDescription>
          </DialogHeader>
          <ChangePasswordForm
            onDone={() => setChangingPassword(false)}
            onCancel={() => setChangingPassword(false)}
          />
        </DialogContent>
      </Dialog>
    </>
  )
}
