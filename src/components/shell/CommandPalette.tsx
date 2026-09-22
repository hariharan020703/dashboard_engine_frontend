import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { ChartColumn, Search } from 'lucide-react'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { navigationFor } from '@/app/navigation'
import { dedupeDashboards } from '@/services/dashboards'
import { Button } from '@/components/ui/button'
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

/**
 * Global search.
 *
 * It searches what the client already holds and knows to be true: the
 * navigation this account may reach, and the dashboards actually granted to
 * them. It does not offer a search across companies or users, because there is
 * no endpoint behind that - and a search box that returns nothing for a real
 * customer name is worse than no search box.
 *
 * Both lists are already filtered by permission and by shell, so the palette
 * cannot offer a destination that would then refuse the person who picked it.
 */
export function CommandPalette() {
  const { can, dashboards } = useAuth()
  const paths = usePaths()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const groups = navigationFor(paths, can)
  const granted = paths.shell === 'platform' ? [] : dedupeDashboards(dashboards)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'k' && (event.metaKey || event.ctrlKey)) {
        event.preventDefault()
        setOpen((value) => !value)
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => document.removeEventListener('keydown', onKeyDown)
  }, [])

  const go = (path: string) => {
    setOpen(false)
    navigate(path)
  }

  return (
    <>
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="gap-2 font-normal text-muted-foreground"
        aria-label="Search"
      >
        <Search className="size-3.5" aria-hidden />
        <span className="hidden lg:inline">Search…</span>
        <kbd className="hidden rounded border border-border bg-muted px-1.5 font-mono text-[10px] lg:inline">
          ⌘K
        </kbd>
      </Button>

      <CommandDialog
        open={open}
        onOpenChange={setOpen}
        title="Search"
        description="Jump to a screen or a dashboard."
      >
        <CommandInput placeholder="Go to…" />
        <CommandList>
          <CommandEmpty>Nothing matches that.</CommandEmpty>

          {granted.length > 0 && (
            <CommandGroup heading="Your dashboards">
              {granted.map((dashboard) => {
                const title = dashboard.title || dashboard.id
                return (
                  <CommandItem
                    key={dashboard.id}
                    value={`dashboard ${title}`}
                    onSelect={() => go(paths.dashboard(dashboard.id))}
                  >
                    <ChartColumn aria-hidden />
                    {title}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          )}

          {groups.map((group) => (
            <CommandGroup key={group.title ?? 'primary'} heading={group.title ?? 'Go to'}>
              {group.items.map((item) => {
                const Icon = item.icon
                return (
                  <CommandItem
                    key={item.path}
                    value={`${group.title ?? ''} ${item.label}`}
                    onSelect={() => go(item.path)}
                  >
                    <Icon aria-hidden />
                    {item.label}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          ))}
        </CommandList>
      </CommandDialog>
    </>
  )
}
