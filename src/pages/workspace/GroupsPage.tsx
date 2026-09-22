import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2, Plus, Trash2, UsersRound } from 'lucide-react'
import {
  createGroup,
  deleteGroup,
  fetchGroup,
  fetchGroupDashboards,
  grantGroupAccess,
  listGroups,
  listUserOptions,
  revokeGroupAccess,
  updateGroup,
} from '@/api/workspaceApi'
import { listCompanies } from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { AccessLevelBadge } from '@/components/common/Badges'
import { ChipSelect } from '@/components/common/ChipSelect'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { TextField } from '@/components/common/Fields'
import { GrantPicker } from '@/components/people/GrantPicker'
import { EmptyState, ErrorState, InlineLoading, TableSkeleton } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Switch } from '@/components/ui/switch'
import { cn } from '@/lib/utils'
import type { AccessLevel } from '@/types/auth'
import type { Group } from '@/types/admin'

/**
 * Groups: a team that access can be attached to once instead of person by
 * person.
 *
 * A list on the left, the selected group on the right. That shape is the point
 * of the screen - groups are usually few and are edited by comparison ("does
 * Sales have this too?"), which a full-page-per-group flow makes awkward.
 *
 * The same screen serves both shells. A platform account sees which company
 * each group belongs to and must name one when creating; a company
 * administrator's groups are all their own, and the server supplies the company
 * without being asked.
 */
export default function GroupsPage() {
  const { can, user: me } = useAuth()
  const isPlatform = me?.companyId === null

  const groups = useAsync(() => listGroups(), [])
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Group | null>(null)
  const [deletePending, setDeletePending] = useState(false)

  const rows = groups.data ?? []

  /*
   * Which group is open, DERIVED rather than stored: null means "the first
   * one", and a stored choice that has since been deleted falls back to the
   * first. That recovery is automatic here; as an effect it was a second render
   * on every load and a stale id whenever the list changed underneath it.
   */
  const [picked, setPicked] = useState<number | null>(null)
  const selectedId =
    picked !== null && rows.some((group) => group.id === picked) ? picked : (rows[0]?.id ?? null)

  const confirmDelete = async () => {
    if (!deleting) return
    setDeletePending(true)
    try {
      await deleteGroup(deleting.id)
      notify.success(`${deleting.name} was deleted.`, 'The access it carried went with it.')
      setPicked(null)
      groups.reload()
      setDeleting(null)
    } catch (err) {
      notify.failure('delete that group', err)
    } finally {
      setDeletePending(false)
    }
  }


  return (
    <Page>
      <PageHeader
        title="Groups"
        description="Give a dashboard to a whole team at once. Everyone active in a group gets what the group has."
        actions={
          can('group.create') && (
            <Button onClick={() => setCreating(true)}>
              <Plus aria-hidden />
              New group
            </Button>
          )
        }
      />

      {groups.error ? (
        <Section>
          <ErrorState error={groups.error} title="Unable to load groups" onRetry={groups.reload} />
        </Section>
      ) : groups.loading ? (
        <Section flush>
          <TableSkeleton rows={4} columns={3} />
        </Section>
      ) : rows.length === 0 ? (
        <Section flush>
          <EmptyState
            title="No groups yet"
            body="A group is the tidiest way to give the same dashboards to a whole team — add people once, and grant access once."
            icon={UsersRound}
            action={
              can('group.create') && (
                <Button onClick={() => setCreating(true)}>
                  <Plus aria-hidden />
                  Create a group
                </Button>
              )
            }
          />
        </Section>
      ) : (
        <div className="grid gap-6 lg:grid-cols-[18rem_1fr]">
          <Section title="Groups" flush>
            <ul className="divide-y divide-border" role="listbox" aria-label="Groups">
              {rows.map((group) => {
                const active = group.id === selectedId
                return (
                  <li key={group.id}>
                    <button
                      type="button"
                      role="option"
                      aria-selected={active}
                      onClick={() => setPicked(group.id)}
                      className={cn(
                        'w-full px-4 py-3 text-left transition-colors',
                        'focus-visible:outline-ring focus-visible:outline-2 focus-visible:-outline-offset-2',
                        active ? 'bg-accent' : 'hover:bg-muted/50'
                      )}
                    >
                      <span
                        className={cn(
                          'block truncate text-sm',
                          active ? 'font-medium text-accent-foreground' : 'text-foreground'
                        )}
                      >
                        {group.name}
                      </span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {group.memberCount} {group.memberCount === 1 ? 'member' : 'members'}
                        {isPlatform && group.companyName ? ` · ${group.companyName}` : ''}
                        {group.active ? '' : ' · paused'}
                      </span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Section>

          {selectedId !== null && (
            <div className="space-y-6">
              <GroupEditor
                key={selectedId}
                groupId={selectedId}
                onChanged={groups.reload}
                onDelete={() => {
                  const group = rows.find((row) => row.id === selectedId)
                  if (group) setDeleting(group)
                }}
              />
              <GroupAccess groupId={selectedId} />
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
            setPicked(id)
            groups.reload()
          }}
        />
      )}

      <ConfirmDialog
        open={deleting !== null}
        onOpenChange={(open) => !open && setDeleting(null)}
        title={deleting ? `Delete ${deleting.name}?` : ''}
        body="The group is removed along with its membership."
        consequence={
          deleting && deleting.memberCount > 0
            ? `${deleting.memberCount} ${deleting.memberCount === 1 ? 'person' : 'people'} will lose any dashboard access they had only through this group.`
            : undefined
        }
        confirmLabel="Delete group"
        destructive
        pending={deletePending}
        onConfirm={confirmDelete}
      />
    </Page>
  )
}

/* ------------------------------------------------------------- the group --- */

function GroupEditor({
  groupId,
  onChanged,
  onDelete,
}: {
  groupId: number
  onChanged: () => void
  onDelete: () => void
}) {
  const { can } = useAuth()
  const editable = can('group.update')

  const group = useAsync(() => fetchGroup(groupId), [groupId])
  const people = useAsync(() => listUserOptions(), [])

  /*
   * The form, DERIVED from the loaded group until it is edited. Null means "as
   * saved", so reloading after a save shows the server's answer without an
   * effect copying three fields back into state on every load.
   */
  type Draft = { name: string; active: boolean; memberIds: number[] }
  const [draft, setDraft] = useState<Draft | null>(null)
  const [pending, setPending] = useState(false)

  const asSaved: Draft = {
    name: group.data?.name ?? '',
    active: group.data?.active ?? true,
    memberIds: group.data?.userIds ?? [],
  }
  const { name, active, memberIds } = draft ?? asSaved

  const edit = (change: Partial<Draft>) =>
    setDraft((current) => ({ ...(current ?? asSaved), ...change }))

  const save = async () => {
    setPending(true)
    try {
      await updateGroup(groupId, { name: name.trim(), active, userIds: memberIds })
      // Back to deriving from the group, which the reload refreshes.
      setDraft(null)
      notify.success('Group saved.')
      group.reload()
      onChanged()
    } catch (err) {
      notify.failure('save this group', err)
    } finally {
      setPending(false)
    }
  }

  if (group.error) {
    return (
      <Section title="Group">
        <ErrorState error={group.error} onRetry={group.reload} compact />
      </Section>
    )
  }

  if (group.loading || !group.data) {
    return (
      <Section title="Group" flush>
        <InlineLoading label="Loading the group…" />
      </Section>
    )
  }

  return (
    <Section
      title="Group"
      description="A paused group keeps its access but stops passing it on to members."
      actions={
        <>
          {editable && (
            <Button size="sm" onClick={() => void save()} disabled={pending}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Save
            </Button>
          )}
          {can('group.delete') && (
            <Button
              variant="ghost"
              size="sm"
              className="text-destructive hover:text-destructive"
              onClick={onDelete}
            >
              <Trash2 aria-hidden />
              Delete
            </Button>
          )}
        </>
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <TextField
          label="Name"
          value={name}
          onChange={(value) => edit({ name: value })}
          disabled={!editable || pending}
          required
        />
        <div className="flex items-start justify-between gap-4 self-end rounded-lg border border-border p-3">
          <div className="min-w-0">
            <Label htmlFor={`group-active-${groupId}`} className="text-sm font-medium">
              Active
            </Label>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Pausing withholds this group&rsquo;s access without deleting it.
            </p>
          </div>
          <Switch
            id={`group-active-${groupId}`}
            checked={active}
            disabled={!editable || pending}
            onCheckedChange={(value) => edit({ active: value })}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className="mb-2 text-xs font-medium text-foreground">Members</p>
        {people.error ? (
          <ErrorState error={people.error} onRetry={people.reload} compact />
        ) : people.loading ? (
          <InlineLoading label="Loading colleagues…" />
        ) : (
          <ChipSelect
            options={people.data ?? []}
            selected={memberIds}
            onToggle={(person) =>
              edit({
                memberIds: memberIds.includes(person.id)
                  ? memberIds.filter((id) => id !== person.id)
                  : [...memberIds, person.id],
              })
            }
            keyOf={(person) => person.id}
            labelOf={(person) => person.username}
            disabled={!editable || pending}
            emptyMessage="There is nobody to add yet."
          />
        )}
      </div>
    </Section>
  )
}

/* ------------------------------------------------------------ its access --- */

/**
 * What this group carries.
 *
 * One request answers both what the group holds and what its company could give
 * it, so the picker and the list come from the same snapshot and cannot
 * disagree about what is available.
 */
function GroupAccess({ groupId }: { groupId: number }) {
  const { can } = useAuth()
  const mayGrant = can('access.grant')
  const mayRevoke = can('access.revoke')

  const access = useAsync(() => fetchGroupDashboards(groupId), [groupId])
  const [pending, setPending] = useState(false)

  const grant = async (dashboardId: string, level: AccessLevel) => {
    setPending(true)
    try {
      await grantGroupAccess(dashboardId, groupId, level)
      notify.success('Access given to the group.', 'Every active member has it now.')
      access.reload()
    } catch (err) {
      notify.failure('give that access', err)
      throw err
    } finally {
      setPending(false)
    }
  }

  const revoke = async (dashboardId: string, title: string) => {
    setPending(true)
    try {
      await revokeGroupAccess(dashboardId, groupId)
      notify.success(`The group no longer has ${title}.`)
      access.reload()
    } catch (err) {
      notify.failure('remove that access', err)
    } finally {
      setPending(false)
    }
  }

  const held = access.data?.held ?? []

  return (
    <Section
      title="Dashboard access"
      description="Reaches every active member of this group."
      flush
    >
      {mayGrant && (
        <GrantPicker
          dashboards={access.data?.available ?? []}
          disabled={pending}
          onGrant={grant}
        />
      )}

      {access.error ? (
        <ErrorState error={access.error} title="Unable to load access" onRetry={access.reload} compact />
      ) : access.loading ? (
        <InlineLoading label="Loading access…" />
      ) : held.length === 0 ? (
        <EmptyState
          title="This group has no dashboards"
          body={mayGrant ? 'Give it one above and every member gets it at once.' : undefined}
          compact
        />
      ) : (
        <ul className="divide-y divide-border">
          {held.map((dashboard) => {
            const title = dashboard.title || dashboard.id
            return (
              <li
                key={dashboard.id}
                className="flex flex-wrap items-center justify-between gap-3 px-5 py-3"
              >
                <span className="min-w-0 truncate text-sm font-medium text-foreground">{title}</span>
                <span className="flex items-center gap-2">
                  <AccessLevelBadge level={dashboard.level} />
                  {mayRevoke && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-destructive hover:text-destructive"
                      disabled={pending}
                      onClick={() => void revoke(dashboard.id, title)}
                    >
                      <Trash2 aria-hidden />
                      Remove
                    </Button>
                  )}
                </span>
              </li>
            )
          })}
        </ul>
      )}
    </Section>
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
  onCreated: (groupId: number) => void
}) {
  const [name, setName] = useState('')
  const [companyId, setCompanyId] = useState('')
  const [pending, setPending] = useState(false)

  // Only a platform account has to say which company; a company administrator
  // has exactly one and the server uses it without being told.
  const companies = useAsync(
    () => (isPlatform ? listCompanies() : Promise.resolve([])),
    [isPlatform]
  )

  const ready = name.trim().length > 0 && (!isPlatform || companyId !== '')

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    if (pending || !ready) return
    setPending(true)
    try {
      const group = await createGroup({
        name: name.trim(),
        companyId: isPlatform ? Number(companyId) : undefined,
      })
      notify.success(`${group.name} was created.`, 'Add members and give it access next.')
      onCreated(group.id)
    } catch (err) {
      notify.failure('create that group', err)
      setPending(false)
    }
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>New group</DialogTitle>
          <DialogDescription>
            Members and dashboard access are set once it exists.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={submit} className="space-y-4" noValidate>
          <TextField
            label="Name"
            value={name}
            onChange={setName}
            placeholder="Sales team"
            autoFocus
            disabled={pending}
            required
          />

          {isPlatform && (
            <div className="space-y-1.5">
              <Label htmlFor="new-group-company" className="text-xs font-medium">
                Company
              </Label>
              <Select value={companyId} onValueChange={setCompanyId} disabled={pending}>
                <SelectTrigger id="new-group-company" className="w-full">
                  <SelectValue placeholder="Choose a company…" />
                </SelectTrigger>
                <SelectContent>
                  {(companies.data ?? [])
                    .filter((company) => company.active)
                    .map((company) => (
                      <SelectItem key={company.id} value={String(company.id)}>
                        {company.name}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !ready}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              Create group
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
