import { useCallback, useEffect, useMemo, useState } from 'react'
import { fetchRolePermissions, listPermissions, listRoles, saveRolePermissions } from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import RoleBadge from '@/components/rbac/RoleBadge'
import { ROLE_LABELS } from '@/components/rbac/roleLabels'
import SelectList from '@/ui/SelectList'
import { useNotification } from '@/ui/notificationContext'
import { FormNotice } from '@/ui/feedback'
import { Badge, Loading, PageHeader, Panel } from '@/ui/page'
import { actionPrimaryCls, labelCls } from '@/ui/styles'
import type { PermissionDef, Role, RolePermissions } from '@/types/admin'
import type { RoleName } from '@/types/auth'

/**
 * The three roles, and what each of them may do.
 *
 * There is no "new role" button, deliberately. The business model names exactly
 * SUPER_ADMIN, COMPANY_ADMIN and USER, and a fourth would have no defined
 * answer to the only question that matters - whether it is bounded by a company
 * or not. The backend refuses to create one for the same reason.
 *
 * What remains editable is the permission set of the two company roles, which
 * is genuine configuration. SUPER_ADMIN is shown read-only because the backend
 * answers its permissions from the catalogue rather than the table: it always
 * holds everything, so a bad edit can never lock the platform out of the screen
 * that would undo it.
 */
export default function RolesPage() {
  const { can } = useAuth()
  const notify = useNotification()
  const editable = can('role.update')

  const [roles, setRoles] = useState<Role[] | null>(null)
  const [catalogue, setCatalogue] = useState<PermissionDef[]>([])
  const [selected, setSelected] = useState<RoleName | null>(null)

  const loading = roles === null
  const rows = roles ?? []

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const [found, permissions] = await Promise.all([listRoles(), listPermissions()])
        if (cancelled) return
        setRoles(found)
        setCatalogue(permissions)
        setSelected((current) => current ?? found[0]?.name ?? null)
      } catch (err) {
        if (cancelled) return
        setRoles([])
        notify.error('Could not load roles.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [notify])

  return (
    <div className="p-6">
      <PageHeader
        title="Roles"
        description="Three roles, fixed by the business model. What each may do is configurable."
      />

      {loading && (
        <Panel flush>
          <Loading label="Loading roles…" />
        </Panel>
      )}

      {!loading && (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Panel title="Roles" flush>
            <SelectList
              items={rows}
              selectedKey={selected}
              onSelect={(r) => setSelected(r.name)}
              keyOf={(r) => r.name}
              primary={(r) => ROLE_LABELS[r.name] ?? r.name}
              secondary={(r) => `${r.userCount} account${r.userCount === 1 ? '' : 's'}`}
              trailing={(r) =>
                r.scope === 'platform' ? <Badge tone="success">platform</Badge> : null
              }
            />
          </Panel>

          {selected && (
            <RolePermissionEditor
              key={selected}
              role={rows.find((r) => r.name === selected) ?? null}
              catalogue={catalogue}
              editable={editable}
            />
          )}
        </div>
      )}
    </div>
  )
}

/** Groups permission ids by their prefix - `user.*`, `company.*` - for reading. */
function groupByArea(catalogue: PermissionDef[]): Array<[string, PermissionDef[]]> {
  const areas = new Map<string, PermissionDef[]>()
  for (const p of catalogue) {
    const area = p.id.split('.')[0]
    const list = areas.get(area)
    if (list) list.push(p)
    else areas.set(area, [p])
  }
  return [...areas.entries()]
}

function RolePermissionEditor({
  role,
  catalogue,
  editable,
}: {
  role: Role | null
  catalogue: PermissionDef[]
  editable: boolean
}) {
  const notify = useNotification()

  const [state, setState] = useState<RolePermissions | null>(null)
  const [held, setHeld] = useState<string[]>([])
  const [pending, setPending] = useState(false)

  const areas = useMemo(() => groupByArea(catalogue), [catalogue])
  const roleName = role?.name

  useEffect(() => {
    if (!roleName) return undefined
    let cancelled = false
    const run = async () => {
      try {
        const found = await fetchRolePermissions(roleName)
        if (cancelled) return
        setState(found)
        setHeld(found.permissions)
      } catch (err) {
        if (!cancelled) notify.error('Could not load the role.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [roleName, notify])

  const toggle = useCallback((id: string) => {
    setHeld((prev) => (prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]))
  }, [])

  if (!role) return null

  const readOnly = !editable || !state?.editable
  const isPlatformRole = role.scope === 'platform'

  const save = async () => {
    if (!state) return
    setPending(true)
    try {
      const saved = await saveRolePermissions(role.name, held)
      setState(saved)
      setHeld(saved.permissions)
      notify.success(
        'Permissions updated.',
        `They take effect on each holder’s next request.`
      )
    } catch (err) {
      notify.error('Unable to save the permissions.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title={ROLE_LABELS[role.name] ?? role.name}
      description={role.description || 'No description.'}
      actions={
        !readOnly ? (
          <button type="button" className={actionPrimaryCls} onClick={() => void save()} disabled={pending}>
            Save permissions
          </button>
        ) : null
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <RoleBadge role={role.name} />
        <span className="text-[13px] text-slate-500">
          Held by {role.userCount} account{role.userCount === 1 ? '' : 's'}
        </span>
      </div>

      {isPlatformRole && (
        <div className="mb-4">
          <FormNotice message="The platform owner always holds every permission and cannot be edited — that is what keeps the platform recoverable from a bad permission change." />
        </div>
      )}
      {!isPlatformRole && editable && (
        <div className="mb-4">
          <FormNotice message="Permissions marked “platform only” cannot be given to a company role — they would let a customer's administrator act outside their own company." />
        </div>
      )}
      {!editable && (
        <div className="mb-4">
          <FormNotice message="You can see what each role may do but not change it — that needs the role.update permission." />
        </div>
      )}

      {!state && <Loading label="Loading permissions…" />}

      {state &&
        areas.map(([area, permissions]) => (
          <div key={area} className="mb-5 last:mb-0">
            <p className={labelCls}>{area}</p>
            <ul className="space-y-1.5">
              {permissions.map((p) => {
                // A platform-only permission is not grantable to a company
                // role, so it is shown but never selectable.
                const blocked = !isPlatformRole && p.platformOnly
                return (
                  <li key={p.id}>
                    <label
                      className={`flex items-start gap-2.5 text-[13px] ${blocked ? 'opacity-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 shrink-0 accent-blue-600"
                        checked={isPlatformRole || held.includes(p.id)}
                        disabled={readOnly || blocked || pending}
                        onChange={() => toggle(p.id)}
                      />
                      <span>
                        <span className="font-medium text-slate-800">{p.label}</span>
                        <code className="ml-1.5 text-[11px] text-slate-400">{p.id}</code>
                        {p.platformOnly && (
                          <span className="ml-1.5">
                            <Badge tone="warning">platform only</Badge>
                          </span>
                        )}
                        <span className="block text-[12px] text-slate-500">{p.description}</span>
                      </span>
                    </label>
                  </li>
                )
              })}
            </ul>
          </div>
        ))}
    </Panel>
  )
}
