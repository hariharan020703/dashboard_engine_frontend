import { useMemo, useState } from 'react'
import { Loader2, Lock } from 'lucide-react'
import {
  fetchRolePermissions,
  listPermissions,
  listRoles,
  saveRolePermissions,
} from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { RoleBadge } from '@/components/common/Badges'
import { ROLE_LABELS } from '@/components/common/labels'
import { FormNotice } from '@/components/common/Fields'
import { ErrorState, InlineLoading, TableSkeleton } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { cn } from '@/lib/utils'
import type { PermissionDef, Role } from '@/types/admin'
import type { RoleName } from '@/types/auth'

/**
 * The permission model.
 *
 * Platform-only, and it should stay that way: this screen decides what
 * COMPANY_ADMIN is allowed to be, which is a statement about the product rather
 * than about one customer. A customer's own administrator manages grants, not
 * the model behind them, and never sees this.
 *
 * The three roles are fixed - the business model names exactly these, and the
 * API offers no way to add a fourth - so this edits what they hold and nothing
 * else. SUPER_ADMIN is not editable at all, deliberately: the screen that
 * repairs a bad permission change must not be the screen the change locked away.
 */
export default function RolesPage() {
  const { can } = useAuth()
  const editable = can('role.update')

  const roles = useAsync(() => listRoles(), [])
  const catalogue = useAsync(() => listPermissions(), [])

  const rows = roles.data ?? []

  /*
   * Which role is open, DERIVED rather than stored: null means "the first one",
   * and a stored choice that is no longer in the list falls back to the first.
   * Copying the first row into state in an effect would re-render on every load
   * and strand the selection if the list changed underneath it.
   */
  const [picked, setPicked] = useState<RoleName | null>(null)
  const selected =
    picked !== null && rows.some((role) => role.name === picked) ? picked : (rows[0]?.name ?? null)

  const current = rows.find((role) => role.name === selected) ?? null

  return (
    <Page>
      <PageHeader
        title="Roles"
        description="Three roles, fixed by the product. What the two company roles may do is configurable here."
      />

      {roles.error ? (
        <Section>
          <ErrorState error={roles.error} title="Unable to load roles" onRetry={roles.reload} />
        </Section>
      ) : roles.loading ? (
        <Section flush>
          <TableSkeleton rows={3} columns={2} />
        </Section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Section title="Roles" flush>
            <ul className="divide-y divide-border" role="listbox" aria-label="Roles">
              {rows.map((role) => {
                const active = role.name === selected
                return (
                  <li key={role.name}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setPicked(role.name)}
                      className={cn(
                        'flex w-full items-center justify-between gap-2 px-4 py-3 text-left transition-colors',
                        'focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2',
                        active ? 'bg-accent' : 'hover:bg-muted/50'
                      )}
                    >
                      <span className="min-w-0">
                        <span
                          className={cn(
                            'block truncate text-sm',
                            active ? 'font-medium text-accent-foreground' : 'text-foreground'
                          )}
                        >
                          {ROLE_LABELS[role.name] ?? role.name}
                        </span>
                        <span className="block text-xs text-muted-foreground">
                          {role.userCount} {role.userCount === 1 ? 'account' : 'accounts'}
                        </span>
                      </span>
                      {role.scope === 'platform' && (
                        <Badge variant="outline" className="gap-1 shrink-0">
                          <Lock className="size-3" aria-hidden />
                          Fixed
                        </Badge>
                      )}
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>

          {current && (
            <RolePermissions
              key={current.name}
              role={current}
              catalogue={catalogue.data ?? []}
              catalogueLoading={catalogue.loading}
              catalogueError={catalogue.error}
              onRetryCatalogue={catalogue.reload}
              editable={editable}
            />
          )}
        </div>
      )}
    </Page>
  )
}

/** Groups permission ids by their prefix - `user.*`, `company.*` - for reading. */
function byArea(catalogue: PermissionDef[]): Array<[string, PermissionDef[]]> {
  const areas = new Map<string, PermissionDef[]>()
  for (const permission of catalogue) {
    const area = permission.id.split('.')[0]
    const existing = areas.get(area)
    if (existing) existing.push(permission)
    else areas.set(area, [permission])
  }
  return [...areas.entries()]
}

const AREA_LABELS: Record<string, string> = {
  company: 'Companies',
  user: 'Users',
  role: 'Roles',
  group: 'Groups',
  access: 'Dashboard access',
  dashboard: 'Dashboards',
  data: 'Data',
  context: 'Connections',
  scope: 'Data scopes',
}

function RolePermissions({
  role,
  catalogue,
  catalogueLoading,
  catalogueError,
  onRetryCatalogue,
  editable,
}: {
  role: Role
  catalogue: PermissionDef[]
  catalogueLoading: boolean
  catalogueError: unknown
  onRetryCatalogue: () => void
  editable: boolean
}) {
  const permissions = useAsync(() => fetchRolePermissions(role.name), [role.name])

  /* Null means "as the role holds them", so a reload needs no effect. */
  const [edited, setEdited] = useState<string[] | null>(null)
  const [pending, setPending] = useState(false)

  const saved = permissions.data?.permissions ?? []
  const held = edited ?? saved

  const areas = useMemo(() => byArea(catalogue), [catalogue])

  const isPlatformRole = role.scope === 'platform'
  const readOnly = !editable || !permissions.data?.editable

  const save = async () => {
    setPending(true)
    try {
      await saveRolePermissions(role.name, held)
      // Back to deriving from the role, which the reload refreshes.
      setEdited(null)
      permissions.reload()
      notify.success(
        'Permissions updated.',
        'They apply on each holder’s next request — nobody has to sign in again.'
      )
    } catch (err) {
      notify.failure('save these permissions', err)
    } finally {
      setPending(false)
    }
  }

  const dirty =
    permissions.data !== null &&
    (held.length !== saved.length || held.some((id) => !saved.includes(id)))

  return (
    <Section
      title={ROLE_LABELS[role.name] ?? role.name}
      description={role.description || undefined}
      actions={
        !readOnly && (
          <Button size="sm" onClick={() => void save()} disabled={pending || !dirty}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save permissions
          </Button>
        )
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RoleBadge role={role.name} />
        <span className="text-sm text-muted-foreground">
          Held by {role.userCount} {role.userCount === 1 ? 'account' : 'accounts'}
        </span>
      </div>

      {isPlatformRole && (
        <div className="mb-4">
          <FormNotice message="The platform owner always holds every permission and cannot be edited. That is what keeps the platform recoverable from a mistaken permission change." />
        </div>
      )}
      {!isPlatformRole && editable && (
        <div className="mb-4">
          <FormNotice message="Permissions marked “platform only” cannot be given to a company role — they would let a customer’s administrator act outside their own company. The server refuses them too." />
        </div>
      )}
      {!editable && (
        <div className="mb-4">
          <FormNotice message="You can see what each role may do, but changing it needs a role with permission to update roles." />
        </div>
      )}

      {catalogueError ? (
        <ErrorState
          error={catalogueError}
          title="Unable to load the permission catalogue"
          onRetry={onRetryCatalogue}
          compact
        />
      ) : permissions.error ? (
        <ErrorState
          error={permissions.error}
          title="Unable to load this role"
          onRetry={permissions.reload}
          compact
        />
      ) : catalogueLoading || permissions.loading ? (
        <InlineLoading label="Loading permissions…" />
      ) : (
        <div className="space-y-6">
          {areas.map(([area, list]) => (
            <div key={area}>
              <p className="mb-2 text-xs font-medium tracking-wide text-muted-foreground uppercase">
                {AREA_LABELS[area] ?? area}
              </p>
              <ul className="space-y-2">
                {list.map((permission) => {
                  // Shown but never selectable for a company role: hiding it
                  // would make the rule invisible, and the rule is the point.
                  const blocked = !isPlatformRole && permission.platformOnly
                  const checked = isPlatformRole || held.includes(permission.id)
                  return (
                    <li key={permission.id}>
                      <label
                        className={cn(
                          'flex items-start gap-2.5',
                          blocked && 'opacity-50',
                          !readOnly && !blocked && 'cursor-pointer'
                        )}
                      >
                        <Checkbox
                          className="mt-0.5"
                          checked={checked}
                          disabled={readOnly || blocked || pending}
                          onCheckedChange={() =>
                            setEdited((current) => {
                              const base = current ?? saved
                              return base.includes(permission.id)
                                ? base.filter((id) => id !== permission.id)
                                : [...base, permission.id]
                            })
                          }
                        />
                        <span className="min-w-0">
                          <span className="flex flex-wrap items-center gap-1.5">
                            <span className="text-sm font-medium text-foreground">
                              {permission.label}
                            </span>
                            {permission.platformOnly && (
                              <Badge
                                variant="outline"
                                className="border-warning/30 bg-warning/10 text-warning-foreground"
                              >
                                Platform only
                              </Badge>
                            )}
                          </span>
                          <span className="mt-0.5 block text-xs text-muted-foreground">
                            {permission.description}
                          </span>
                        </span>
                      </label>
                    </li>
                  )
                })}
              </ul>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}
