import { Check, Loader2, MoreHorizontal, ShieldCheck, Trash2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { ACCESS_LEVEL_LABELS, ACCESS_LEVEL_ORDER } from '@/components/common/labels'
import { cn } from '@/lib/utils'
import type { AccessLevel } from '@/types/auth'
import type { AccessLevelDef } from '@/types/admin'

/**
 * The options button on one dashboard grant: change what the holder may do,
 * or take the access away.
 *
 * Changing the level is the same PUT that granted it - the backend upserts on
 * (holder, dashboard) - so there is no separate "edit" endpoint to keep in
 * step. Each half is offered only with its permission: `access.grant` to
 * change a level, `access.revoke` to remove.
 *
 * The levels are listed in the product's order, weakest first, with the
 * backend's own description under each when it has been loaded.
 */
export function GrantActionsMenu({
  holderName,
  level,
  levels,
  mayChange,
  mayRemove,
  pending = false,
  allowedLevels = ACCESS_LEVEL_ORDER,
  onChangeLevel,
  onRemove,
}: {
  /** Who holds the grant, for the menu heading and the button's label. */
  holderName: string
  level: AccessLevel
  /** From GET /access/levels; the labels still render without it. */
  levels?: AccessLevelDef[]
  mayChange: boolean
  mayRemove: boolean
  /** A change or removal for THIS row is in flight. */
  pending?: boolean
  /**
   * The levels this caller may give. A sharer may give at most their own
   * level, so the menu offers nothing the backend would refuse.
   */
  allowedLevels?: AccessLevel[]
  onChangeLevel: (level: AccessLevel) => void
  onRemove: () => void
}) {
  if (!mayChange && !mayRemove) return null

  const describe = (id: AccessLevel) => levels?.find((l) => l.id === id)?.description

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="size-8"
          disabled={pending}
          aria-label={`Access options for ${holderName}`}
          title="Access options"
        >
          {pending ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <MoreHorizontal className="size-4" aria-hidden />
          )}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="w-72">
        {mayChange ? (
          <>
            <DropdownMenuLabel className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <ShieldCheck className="size-3.5" aria-hidden />
              Change permission
            </DropdownMenuLabel>
            {ACCESS_LEVEL_ORDER.filter((id) => id === level || allowedLevels.includes(id)).map((id) => {
              const current = id === level
              return (
                <DropdownMenuItem
                  key={id}
                  aria-current={current ? 'true' : undefined}
                  onSelect={() => {
                    if (!current) onChangeLevel(id)
                  }}
                  className="items-start gap-2.5 py-2"
                >
                  <span className="mt-0.5 flex size-4 shrink-0 items-center justify-center">
                    {current ? <Check className="size-4 text-primary" aria-hidden /> : null}
                  </span>
                  <span className="min-w-0">
                    <span className={cn('block text-sm', current && 'font-semibold')}>
                      {ACCESS_LEVEL_LABELS[id]}
                      {current ? (
                        <span className="ml-1.5 text-xs font-normal text-muted-foreground">
                          current
                        </span>
                      ) : null}
                    </span>
                    {describe(id) ? (
                      <span className="mt-0.5 block text-xs text-muted-foreground">
                        {describe(id)}
                      </span>
                    ) : null}
                  </span>
                </DropdownMenuItem>
              )
            })}
          </>
        ) : null}

        {mayChange && mayRemove ? <DropdownMenuSeparator /> : null}

        {mayRemove ? (
          <DropdownMenuItem
            variant="destructive"
            onSelect={onRemove}
            className="gap-2.5"
          >
            <Trash2 className="size-4" aria-hidden />
            Remove access
          </DropdownMenuItem>
        ) : null}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
