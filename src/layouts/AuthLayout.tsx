import type { ReactNode } from 'react'
import { Command } from 'lucide-react'

/**
 * The frame for the signed-out screens: sign in, and activate an account.
 *
 * Deliberately plain. These are the two screens somebody sees before they trust
 * the product with a password, and a login page that looks like a marketing
 * page is a login page people look at twice before typing into.
 */
export default function AuthLayout({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string
  subtitle?: ReactNode
  children: ReactNode
  footer?: ReactNode
}) {
  return (
    <div className="flex min-h-screen items-center justify-center overflow-y-auto bg-muted/40 px-4 py-10">
      <div className="w-full max-w-sm">
        <header className="mb-6 text-center">
          <div className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-primary text-primary-foreground">
            <Command className="size-5" aria-hidden />
          </div>
          <h1 className="text-xl font-semibold tracking-tight text-foreground">{title}</h1>
          {subtitle && <p className="mt-1.5 text-sm text-muted-foreground">{subtitle}</p>}
        </header>

        <div className="rounded-xl border border-border bg-card p-6">{children}</div>

        {footer && <div className="mt-4 text-center text-xs text-muted-foreground">{footer}</div>}
      </div>
    </div>
  )
}
