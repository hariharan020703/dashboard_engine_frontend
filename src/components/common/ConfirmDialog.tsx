import type { ReactNode } from 'react'
import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

/**
 * Confirmation before something that cannot be undone.
 *
 * `consequence` is separate from `body` on purpose: the body says what the
 * action is, and the consequence says what it will do to people other than the
 * person clicking - "this removes access for 12 users". That second sentence is
 * the one that stops a mistake, so it gets its own emphasis rather than being
 * the third line of a paragraph.
 *
 * Built on AlertDialog rather than Dialog, which is not cosmetic: it traps
 * focus, it is announced as an alert, and it cannot be dismissed by clicking
 * away - all correct for a question that must be answered deliberately.
 */
export function ConfirmDialog({
  open,
  onOpenChange,
  title,
  body,
  consequence,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  destructive = false,
  pending = false,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  body: ReactNode
  /** What this does to other people. Rendered as a warning when present. */
  consequence?: ReactNode
  confirmLabel?: string
  cancelLabel?: string
  destructive?: boolean
  /** The caller owns the request, so it owns the in-flight state too. */
  pending?: boolean
  onConfirm: () => void
}) {
  return (
    <AlertDialog open={open} onOpenChange={(next) => !pending && onOpenChange(next)}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{body}</AlertDialogDescription>
        </AlertDialogHeader>

        {consequence && (
          <p className="flex items-start gap-2 rounded-md border border-warning/25 bg-warning/10 px-3 py-2 text-sm text-warning-foreground">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>{consequence}</span>
          </p>
        )}

        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{cancelLabel}</AlertDialogCancel>
          <AlertDialogAction
            disabled={pending}
            onClick={(event) => {
              // Held open while the request runs: closing first would take the
              // pending state with it and leave the outcome unexplained.
              event.preventDefault()
              onConfirm()
            }}
            className={cn(
              destructive &&
                buttonVariants({ variant: 'destructive' })
            )}
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            {pending ? 'Working…' : confirmLabel}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
