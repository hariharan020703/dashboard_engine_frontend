import { ChartColumn, Command } from 'lucide-react'
import { NavLink, useLocation } from 'react-router-dom'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { isNavItemActive, navigationFor } from '@/app/navigation'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  SidebarTrigger,
  useSidebar,
} from '@/components/ui/sidebar'

export interface AppSidebarProps {
  onNavigate?: () => void
}

/**
 * The left navigation powered by official shadcn Sidebar components.
 *
 * Provides:
 * - Collapsible behavior (full w-64 expanded vs icon rail when collapsed)
 * - Hamburger button in SidebarHeader to minimize and open
 * - Automatic tooltips on icons when collapsed
 * - Interactive SidebarRail
 * - Responsive mobile drawer behavior
 */
export function AppSidebar({ onNavigate }: AppSidebarProps = {}) {
  const { can, dashboards, user } = useAuth()
  const paths = usePaths()
  const { pathname } = useLocation()
  const { setOpenMobile, isMobile } = useSidebar()

  const groups = navigationFor(paths, can)
  const platform = paths.shell === 'platform'

  /*
   * The dashboards somebody holds are grants, not configuration, so they are
   * listed under Analytics rather than declared in the navigation table. In the
   * platform console they are not listed at all: a platform account holds no
   * grants of its own, and a flat list of every dashboard in the registry is
   * what the Dashboards screen is for.
   */
  const granted = platform ? [] : dashboards

  const handleNavClick = () => {
    onNavigate?.()
    if (isMobile) {
      setOpenMobile(false)
    }
  }

  return (
    <Sidebar collapsible="icon" aria-label={platform ? 'Platform console' : 'Workspace'}>
      {/* Product identity & hamburger trigger */}
      <SidebarHeader className="h-14 border-b border-sidebar-border px-3.5 justify-center">
        <div className="flex items-center justify-between group-data-[collapsible=icon]:justify-center">
          <div className="flex items-center gap-2.5 overflow-hidden group-data-[collapsible=icon]:hidden">
            <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground shadow-xs">
              <Command className="size-4" aria-hidden />
            </span>
            <div className="min-w-0">
              <span className="block truncate text-sm font-semibold tracking-tight text-sidebar-foreground">
                Elze Analytics
              </span>
              <span className="block truncate text-xs text-muted-foreground">
                {platform ? 'Platform console' : 'Workspace'}
              </span>
            </div>
          </div>

          <SidebarTrigger />
        </div>
      </SidebarHeader>

      <SidebarContent>
        {groups.map((group, groupIdx) => (
          <SidebarGroup key={group.title ?? `group-${groupIdx}`}>
            {group.title && (
              <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
                {group.title}
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu>
                {group.items.map((item) => {
                  const active = isNavItemActive(item, pathname)
                  const Icon = item.icon

                  return (
                    <SidebarMenuItem key={item.path}>
                      <SidebarMenuButton
                        asChild
                        isActive={active}
                        tooltip={item.label}
                      >
                        <NavLink
                          to={item.path}
                          onClick={handleNavClick}
                          aria-current={active ? 'page' : undefined}
                        >
                          <Icon className="size-4 shrink-0" aria-hidden />
                          <span>{item.label}</span>
                        </NavLink>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>

            {/* In customer workspace under Analytics: User's assigned dashboards */}
            {!platform && group.title === 'Analytics' && (
              <div className="mt-2">
                <SidebarGroupLabel className="text-xs font-semibold tracking-wider text-muted-foreground/70 uppercase">
                  Your dashboards
                </SidebarGroupLabel>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {granted.length === 0 ? (
                      <SidebarMenuItem className="group-data-[collapsible=icon]:hidden">
                        <span className="px-2 py-1.5 text-xs text-muted-foreground">
                          {user?.role === 'USER'
                            ? 'None assigned yet.'
                            : 'None granted to you yet.'}
                        </span>
                      </SidebarMenuItem>
                    ) : (
                      granted.map((dashboard) => {
                        const path = paths.dashboard(dashboard.id)
                        const active = pathname === path
                        const title = dashboard.title || dashboard.id

                        return (
                          <SidebarMenuItem key={dashboard.id}>
                            <SidebarMenuButton
                              asChild
                              isActive={active}
                              tooltip={title}
                            >
                              <NavLink
                                to={path}
                                onClick={handleNavClick}
                                aria-current={active ? 'page' : undefined}
                              >
                                <ChartColumn className="size-4 shrink-0" aria-hidden />
                                <span className="truncate">{title}</span>
                              </NavLink>
                            </SidebarMenuButton>
                          </SidebarMenuItem>
                        )
                      })
                    )}
                  </SidebarMenu>
                </SidebarGroupContent>
              </div>
            )}
          </SidebarGroup>
        ))}
      </SidebarContent>

      <SidebarRail />
    </Sidebar>
  )
}
