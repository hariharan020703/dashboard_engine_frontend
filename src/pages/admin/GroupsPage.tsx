import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Plus, Trash2 } from 'lucide-react'
import {
  createGroup,
  deleteGroup,
  fetchGroup,
  fetchGroupDashboards,
  grantGroupAccess,
  listCompanies,
  listGroups,
  listUserOptions,
  revokeGroupAccess,
  updateGroup,
} from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import AccessLevelBadge from '@/components/rbac/AccessLevelBadge'
import GrantPicker from '@/components/rbac/GrantPicker'
import { useAuth } from '@/context/authContext'
import ChipSelect from '@/ui/ChipSelect'
import ConfirmDialog from '@/ui/ConfirmDialog'
import Modal from '@/ui/Modal'
import SelectList from '@/ui/SelectList'
import { useNotification } from '@/ui/notificationContext'
import { TextField } from '@/ui/fields'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { actionDangerCls, actionPrimaryCls, labelCls, primaryButtonCls, selectCls } from '@/ui/styles'
import type { AccessLevel } from '@/types/auth'
import type { Company, Group, GroupDashboards, UserOption } from '@/types/admin'

/**
 * Groups: a named set of users inside one company that dashboard access
 * attaches to, so it is managed per team rather than per person.
 *
 * Membership and access both live on the selected group rather than behind a
 * second route - they are two halves of the same question, and splitting them
 * across pages would only add a URL.
 *
 * A group belongs to exactly one company, and only that company's accounts can
 * be members. The backend rejects anything else; the member picker simply never
 * offers it, because it is fed by the same company-scoped endpoint.
 */
export default function GroupsPage() {
  const { can, user: me } = useAuth()
  const notify = useNotification()
  const isPlatform = me?.companyId === null

  // `null` means "not loaded yet" - see the note in CompaniesPage for why the
  // loading flag is derived rather than written at the top of the effect.
  const [groups, setGroups] = useState<Group[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Group | null>(null)
  const loading = groups === null
  const rows = groups ?? []

  // Reloading bumps a counter rather than calling a loader, so the fetch lives
  // in the effect that owns it - see CompaniesPage for the same shape.
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await listGroups()
        if (cancelled) return
        setGroups(found)
        setSelected((current) => current ?? found[0]?.id ?? null)
      } catch (err) {
        if (cancelled) return
        setGroups([])
        notify.error('Could not load groups.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [reloadToken, notify])

  const onDelete = async (group: Group) => {
    try {
      await deleteGroup(group.id)
      notify.success(`"${group.name}" was deleted.`)
      setSelected(null)
      reload()
    } catch (err) {
      notify.error('Unable to delete the group.', errorMessage(err, ''))
    }
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Groups"
        description="Access granted to a group reaches every active member, at the level granted."
        actions={
          can('group.create') ? (
            <button type="button" className={actionPrimaryCls} onClick={() => setCreating(true)}>
              <Plus size={14} />
              New group
            </button>
          ) : null
        }
      />

      {loading && (
        <Panel flush>
          <Loading label="Loading groups…" />
        </Panel>
      )}

      {!loading && rows.length === 0 && (
        <Panel flush>
          <EmptyState
            message="No groups yet."
            hint="A group is the way to grant a dashboard to a whole team at once."
          />
        </Panel>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <Panel title="Groups" flush>
            <SelectList
              items={rows}
              selectedKey={selected}
              onSelect={(g) => setSelected(g.id)}
              keyOf={(g) => g.id}
              primary={(g) => g.name}
              secondary={(g) =>
                isPlatform
                  ? `${g.companyName} · ${g.memberCount} member${g.memberCount === 1 ? '' : 's'}`
                  : `${g.memberCount} member${g.memberCount === 1 ? '' : 's'}`
              }
              trailing={(g) => (!g.active ? <Badge tone="danger">inactive</Badge> : null)}
            />
          </Panel>

          {selected !== null && (
            <div className="space-y-6">
              <GroupMembership
                key={`members-${selected}`}
                groupId={selected}
                onChanged={reload}
                onDelete={() => {
                  const group = rows.find((g) => g.id === selected)
                  if (group) setDeleting(group)
                }}
              />
              {can('access.read') && (
                <GroupAccess key={`access-${selected}`} groupId={selected} />
              )}
            </div>
          )}
        </div>
      )}

      {creating && (
        <CreateGroupDialog
          isPlatform={isPlatform}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setSelected(id)
            reload()
          }}
        />
      )}

      {deleting && (
        <ConfirmDialog
          title="Delete this group?"
          message={`"${deleting.name}" will be removed.`}
          consequence="This cannot be undone. Its membership and the dashboard access it carries go with it — members keep any grants they hold directly."
          confirmLabel="Delete group"
          destructive
          onConfirm={() => onDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/* ------------------------------------------------------------ membership --- */

function GroupMembership({
  groupId,
  onChanged,
  onDelete,
}: {
  groupId: number
  onChanged: () => void
  onDelete: () => void
}) {
  const { can } = useAuth()
  const notify = useNotification()
  const editable = can('group.update')

  const [name, setName] = useState('')
  const [active, setActive] = useState(true)
  const [memberIds, setMemberIds] = useState<number[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loading, setLoading] = useState(true)
  const [pending, setPending] = useState(false)

  useEffect(() => {
    let live = true
    const run = async () => {
      setLoading(true)
      try {
        const [group, options] = await Promise.all([fetchGroup(groupId), listUserOptions()])
        if (!live) return
        setName(group.name)
        setActive(group.active)
        setMemberIds(group.userIds)
        setUsers(options)
      } catch (err) {
        if (live) notify.error('Could not load the group.', errorMessage(err, ''))
      } finally {
        if (live) setLoading(false)
      }
    }
    void run()
    return () => {
      live = false
    }
  }, [groupId, notify])

  const toggle = (userId: number) =>
    setMemberIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    )

  const save = async () => {
    setPending(true)
    try {
      await updateGroup(groupId, { name: name.trim(), active, userIds: memberIds })
      notify.success('Group saved.')
      onChanged()
    } catch (err) {
      notify.error('Unable to save the group.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  if (loading) {
    return (
      <Panel flush>
        <Loading label="Loading the group…" />
      </Panel>
    )
  }

  return (
    <Panel
      title="Group"
      description="A deactivated group keeps its access but stops passing it to its members."
      actions={
        <>
          {editable && (
            <button type="button" className={actionPrimaryCls} onClick={() => void save()} disabled={pending}>
              Save group
            </button>
          )}
          {can('group.delete') && (
            <button type="button" className={actionDangerCls} onClick={onDelete}>
              <Trash2 size={14} />
              Delete
            </button>
          )}
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField label="Name" value={name} onChange={setName} disabled={!editable || pending} />
        <div>
          <span className={labelCls}>Status</span>
          <label className="flex items-center gap-2 text-[13px] text-slate-700">
            <input
              type="checkbox"
              className="h-4 w-4 accent-blue-600"
              checked={active}
              disabled={!editable || pending}
              onChange={(e) => setActive(e.target.checked)}
            />
            Active
          </label>
        </div>
      </div>

      <div className="mt-5">
        <p className={labelCls}>Members</p>
        <ChipSelect
          options={users}
          selected={memberIds}
          onToggle={(u) => toggle(u.id)}
          keyOf={(u) => u.id}
          labelOf={(u) => u.username}
          disabled={!editable || pending}
          emptyMessage="No accounts in this company to add."
        />
      </div>
    </Panel>
  )
}

/* ---------------------------------------------------------------- access --- */

/**
 * The dashboards this group carries.
 *
 * One request rather than one per dashboard: the backend answers with both what
 * the group holds and what its company could give it, so the picker and the
 * list come from the same snapshot and cannot disagree.
 */
function GroupAccess({ groupId }: { groupId: number }) {
  const { can } = useAuth()
  const notify = useNotification()
  const mayGrant = can('access.grant')
  const mayRevoke = can('access.revoke')

  const [data, setData] = useState<GroupDashboards | null>(null)
  const [failed, setFailed] = useState(false)
  const [pending, setPending] = useState(false)
  const loading = data === null && !failed

  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await fetchGroupDashboards(groupId)
        if (cancelled) return
        setData(found)
        setFailed(false)
      } catch (err) {
        if (cancelled) return
        setFailed(true)
        notify.error('Could not load the group’s access.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [groupId, reloadToken, notify])

  const onGrant = async (dashboardId: string, level: AccessLevel) => {
    setPending(true)
    try {
      await grantGroupAccess(dashboardId, groupId, level)
      notify.success(`Access granted at "${level}".`, 'Every active member now has it.')
      reload()
    } catch (err) {
      notify.error('Unable to grant access.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  const onRevoke = async (dashboardId: string) => {
    setPending(true)
    try {
      await revokeGroupAccess(dashboardId, groupId)
      notify.success('Access revoked from the group.')
      reload()
    } catch (err) {
      notify.error('Unable to revoke access.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel title="Dashboard access" description="Reaches every active member of this group." flush>
      {mayGrant && (
        <GrantPicker dashboards={data?.available ?? []} disabled={pending} onGrant={onGrant} />
      )}

      {loading && <Loading label="Loading access…" />}
      {!loading && data && data.held.length === 0 && (
        <EmptyState message="This group carries no dashboard access yet." />
      )}
      {!loading && data && data.held.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {data.held.map((d) => (
            <li key={d.id} className="flex items-center justify-between gap-3 px-5 py-2.5">
              <span className="min-w-0">
                <span className="block truncate text-sm text-slate-800">{d.title || d.id}</span>
                <span className="block text-[11px] text-slate-400">{d.id}</span>
              </span>
              <span className="flex items-center gap-2">
                <AccessLevelBadge level={d.level} />
                {mayRevoke && (
                  <button
                    type="button"
                    className={actionDangerCls}
                    onClick={() => void onRevoke(d.id)}
                    disabled={pending}
                  >
                    <Trash2 size={14} />
                    Revoke
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}
    </Panel>
  )
}

/* ---------------------------------------------------------------- create --- */

function CreateGroupDialog({
  isPlatform,
  onClose,
  onCreated,
}: {
  isPlatform: boolean
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const notify = useNotification()
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [companies, setCompanies] = useState<Company[]>([])
  const [pending, setPending] = useState(false)

  // Only a platform account has to say which company; a company administrator
  // has exactly one and the backend uses it without being told.
  useEffect(() => {
    if (!isPlatform) return
    let cancelled = false
    const run = async () => {
      try {
        const rows = await listCompanies()
        if (!cancelled) setCompanies(rows.filter((c) => c.active))
      } catch (err) {
        if (!cancelled) notify.error('Could not load companies.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [isPlatform, notify])

  const ready = name.trim() && (!isPlatform || companyId)

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !ready) return
    setPending(true)
    try {
      const group = await createGroup({
        name: name.trim(),
        companyId: isPlatform ? Number(companyId) : undefined,
      })
      notify.success(`"${group.name}" was created.`, 'Add members and grant access next.')
      onCreated(group.id)
    } catch (err) {
      notify.error('Unable to create the group.', errorMessage(err, ''))
      setPending(false)
    }
  }

  return (
    <Modal title="New group" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField label="Name" value={name} onChange={setName} autoFocus disabled={pending} />

        {isPlatform && (
          <div>
            <label className={labelCls} htmlFor="new-group-company">
              Company
            </label>
            <select
              id="new-group-company"
              className={selectCls}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={pending}
            >
              <option value="">Choose a company…</option>
              {companies.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <p className="text-[12px] text-slate-500">
          Members and dashboard access are set once the group exists.
        </p>

        <button type="submit" className={primaryButtonCls} disabled={pending || !ready}>
          {pending ? 'Creating…' : 'Create group'}
        </button>
      </form>
    </Modal>
  )
}
