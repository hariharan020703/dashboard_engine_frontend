import type { ReactNode } from 'react'
import { Link } from 'react-router-dom'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb'

/**
 * Page scaffolding: the frame every screen sits in.
 *
 * One component owns the outer padding, the heading scale and the gap between
 * a title and its content, so screens do not each invent their own - which is
 * what made the old build feel like a set of admin pages rather than one
 * product.
 */

export interface Crumb {
  label: string
  /** Omitted on the current page, which is rendered as text rather than a link. */
  to?: string
}

export function Page({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn('mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8', className)}>
      {children}
    </div>
  )
}

export function PageHeader({
  title,
  description,
  crumbs,
  actions,
  icon,
}: {
  title: ReactNode
  description?: ReactNode
  crumbs?: Crumb[]
  actions?: ReactNode
  icon?: ReactNode
}) {
  return (
    <header className="mb-6">
      {crumbs && crumbs.length > 0 && (
        <Breadcrumb className="mb-3">
          <BreadcrumbList>
            {crumbs.map((crumb, index) => {
              const last = index === crumbs.length - 1
              return (
                <BreadcrumbItem key={`${crumb.label}-${index}`}>
                  {crumb.to && !last ? (
                    <BreadcrumbLink asChild>
                      <Link to={crumb.to}>{crumb.label}</Link>
                    </BreadcrumbLink>
                  ) : (
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  )}
                  {!last && (
                    <BreadcrumbSeparator>
                      <ChevronRight />
                    </BreadcrumbSeparator>
                  )}
                </BreadcrumbItem>
              )
            })}
          </BreadcrumbList>
        </Breadcrumb>
      )}

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex min-w-0 items-start gap-3">
          {icon}
          <div className="min-w-0">
            <h1 className="truncate text-2xl font-semibold tracking-tight text-foreground">
              {title}
            </h1>
            {description && (
              <div className="mt-1 text-sm text-muted-foreground">{description}</div>
            )}
          </div>
        </div>
        {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </header>
  )
}

/** A titled region within a page. The workhorse container for lists and forms. */
export function Section({
  title,
  description,
  actions,
  children,
  className,
  bodyClassName,
  flush,
}: {
  title?: ReactNode
  description?: ReactNode
  actions?: ReactNode
  children: ReactNode
  className?: string
  bodyClassName?: string
  /** True when the child draws its own edges - a table, a divided list. */
  flush?: boolean
}) {
  return (
    <section
      className={cn('overflow-hidden rounded-xl border border-border bg-card mt-5', className)}
    >
      {(title || actions) && (
        <header className="flex flex-wrap items-center justify-between gap-3 border-b border-border px-5 py-3.5">
          <div className="min-w-0">
            {title && (
              <h2 className="text-sm font-semibold text-card-foreground">{title}</h2>
            )}
            {description && (
              <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
            )}
          </div>
          {actions && <div className="flex shrink-0 items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={cn(flush ? '' : 'p-5', bodyClassName)}>{children}</div>
    </section>
  )
}
