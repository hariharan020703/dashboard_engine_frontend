import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Loader2, Mail, Trash2 } from 'lucide-react'
import {
  fetchScopeOptions,
  fetchUserGrants,
  fetchUserScope,
  grantUserAccess,
  listGrantableDashboards,
  revokeUserAccess,
  saveUserScope,
} from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { usePaths } from '@/app/usePaths'
import { Section } from '@/components/common/Page'
import { AccessLevelBadge } from '@/components/common/Badges'
import { ChipSelect } from '@/components/common/ChipSelect'
import { ConfirmDialog } from '@/components/common/ConfirmDialog'
import { FormNotice } from '@/components/common/Fields'
import { RoleSelect } from '@/components/common/RoleSelect'
import { GrantPicker } from '@/components/people/GrantPicker'
import { EmptyState, ErrorState, InlineLoading } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Button } from '@/components/ui/button'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { AccessLevel, RoleName } from '@/types/auth'
import type { AdminUser } from '@/types/admin'

/**
 * One person, in either shell.
 *
 * The four things you do to somebody - change their role, switch them on or
 * off, decide which dashboards they see, and restrict which rows of data they
 * see - are separate sections because they are separate decisions with separate
 * permissions behind them. A section the caller may not use is not rendered
 * disabled; it is not rendered.
 *
 * The operations are passed in, because they are the one thing the two shells
 * do differently: the platform console calls /api/platform/users and a company
 * administrator calls /api/users. Everything visible is identical, so it is
 * written once.
 */

export interface PersonActions {
  updateRole: (role: RoleName) => Promise<unknown>
  activate: () => Promise<unknown>
  deactivate: () => Promise<unknown>
  resendInvitation: () => Promise<unknown>
}

export function PersonDetail({
  person,
  actions,
  onChanged,
}: {
  person: AdminUser
  actions: PersonActions
  onChanged: () => void
}) {
  const { can, user: me } = useAuth()
  const isSelf = person.id === me?.id

  return (
    <div className="space-y-6">
      <AccountSection person={person} isSelf={isSelf} actions={actions} onChanged={onChanged} />
      {can('access.read') && <AccessSection person={person} />}
      {can('scope.read') && <ScopeSection userId={person.id} />}
    </div>
  )
}

/* --------------------------------------------------------------- account --- */

function AccountSection({
  person,
  isSelf,
  actions,
  onChanged,
}: {
  person: AdminUser
  isSelf: boolean
  actions: PersonActions
  onChanged: () => void
}) {
  const { can, user: me } = useAuth()
  const isPlatformActor = me?.companyId === null
  const editable = can('user.update') && !isSelf

  /*
   * Null means "whatever the record says". Deriving rather than copying the
   * role into state is what makes a saved change stop looking unsaved when the
   * record reloads, without an effect writing state on every load.
   */
  const [chosenRole, setChosenRole] = useState<RoleName | null>(null)
  const role = chosenRole ?? person.role

  const [pending, setPending] = useState(false)
  const [confirming, setConfirming] = useState<'deactivate' | 'reissue' | null>(null)

  const run = async (work: () => Promise<unknown>, success: string, detail?: string) => {
    setPending(true)
    try {
      await work()
      notify.success(success, detail)
      onChanged()
      setConfirming(null)
    } catch (err) {
      notify.failure('complete that change', err)
    } finally {
      setPending(false)
    }
  }

  return (
    <Section
      title="Account"
      description="Role and access to sign in. Both are re-checked by the server on every request."
    >
      {isSelf && (
        <div className="mb-4">
          <FormNotice message="This is your own account. Change it from your profile — an administrator who can demote themselves can lock everyone out." />
        </div>
      )}
      {!can('user.update') && !isSelf && (
        <div className="mb-4">
          <FormNotice message="You can see this account but not change it. That needs a role with permission to update users." />
        </div>
      )}

      <div className="grid gap-6 sm:grid-cols-2">
        <div className="space-y-3">
          <RoleSelect
            value={role}
            onChange={setChosenRole}
            includePlatform={isPlatformActor}
            disabled={!editable || pending}
          />
          <Button
            size="sm"
            disabled={!editable || pending || role === person.role}
            onClick={() =>
              void run(
                async () => {
                  await actions.updateRole(role)
                  // Back to deriving from the record, which onChanged refreshes.
                  setChosenRole(null)
                },
                'Role changed.',
                'Their sessions were ended, so the new role applies immediately.'
              )
            }
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save role
          </Button>
        </div>

        <dl className="grid grid-cols-2 gap-4 self-start text-sm">
          <div>
            <dt className="text-xs text-muted-foreground">Added</dt>
            <dd className="mt-0.5 text-foreground">
              {person.createdAt ? new Date(person.createdAt).toLocaleDateString() : '—'}
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Last signed in</dt>
            <dd className="mt-0.5 text-foreground">
              {person.lastLoginAt ? new Date(person.lastLoginAt).toLocaleString() : 'Never'}
            </dd>
          </div>
        </dl>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-2 border-t border-border pt-4">
        {person.status !== 'disabled' && can('user.deactivate') && !isSelf && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming('deactivate')}
          >
            Deactivate
          </Button>
        )}

        {person.status === 'disabled' && can('user.activate') && (
          <Button
            size="sm"
            disabled={pending}
            onClick={() =>
              void run(() => actions.activate(), `${person.username} can sign in again.`)
            }
          >
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Reactivate
          </Button>
        )}

        {can('user.update') && person.status !== 'disabled' && (
          <Button
            variant="outline"
            size="sm"
            disabled={pending}
            onClick={() => setConfirming('reissue')}
          >
            <Mail aria-hidden />
            {person.status === 'pending' ? 'Resend invitation' : 'Reset access'}
          </Button>
        )}

        <p className="text-xs text-muted-foreground">
          {person.status === 'pending'
            ? 'This person has not set a password yet.'
            : 'Resetting access clears their password and emails them a new link.'}
        </p>
      </div>

      <ConfirmDialog
        open={confirming === 'deactivate'}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={`Deactivate ${person.username}?`}
        body="They will be signed out and refused at sign-in."
        consequence="Their sessions end immediately. Nothing is deleted, and you can reactivate them later."
        confirmLabel="Deactivate"
        destructive
        pending={pending}
        onConfirm={() =>
          void run(
            () => actions.deactivate(),
            `${person.username} has been deactivated.`,
            'They were signed out of every session.'
          )
        }
      />

      <ConfirmDialog
        open={confirming === 'reissue'}
        onOpenChange={(open) => !open && setConfirming(null)}
        title={
          person.status === 'pending' ? 'Send a new invitation?' : `Reset access for ${person.username}?`
        }
        body={`A single-use activation link will be emailed to ${person.email}.`}
        consequence={
          person.status === 'pending'
            ? 'Any earlier link stops working.'
            : 'Their current password stops working immediately and their sessions end. They cannot sign in until they use the new link.'
        }
        confirmLabel="Send link"
        destructive={person.status !== 'pending'}
        pending={pending}
        onConfirm={() =>
          void run(
            () => actions.resendInvitation(),
            `A link was sent to ${person.email}.`,
            'It can be used once, and expires.'
          )
        }
      />
    </Section>
  )
}

/* ---------------------------------------------------------------- access --- */

/** Dashboard grants: what this person may open, directly and through groups. */
function AccessSection({ person }: { person: AdminUser }) {
  const { can } = useAuth()
  const paths = usePaths()
  const mayGrant = can('access.grant')
  const mayRevoke = can('access.revoke')

  const grants = useAsync(() => fetchUserGrants(person.id), [person.id])
  const grantable = useAsync(
    () => (mayGrant ? listGrantableDashboards(person.companyId ?? undefined) : Promise.resolve([])),
    [mayGrant, person.companyId]
  )

  const [pending, setPending] = useState(false)

  const grant = async (dashboardId: string, level: AccessLevel) => {
    setPending(true)
    try {
      await grantUserAccess(dashboardId, person.id, level)
      notify.success('Access granted.')
      grants.reload()
    } catch (err) {
      notify.failure('grant that access', err)
      throw err
    } finally {
      setPending(false)
    }
  }

  const revoke = async (dashboardId: string, title: string) => {
    setPending(true)
    try {
      await revokeUserAccess(dashboardId, person.id)
      notify.success(`${person.username} can no longer open ${title}.`)
      grants.reload()
    } catch (err) {
      notify.failure('revoke that access', err)
    } finally {
      setPending(false)
    }
  }

  const rows = grants.data ?? []

  return (
    <Section
      title="Dashboard access"
      description="Where a dashboard reaches this person twice, the stronger of the two applies."
      flush
    >
      {mayGrant && (
        <GrantPicker dashboards={grantable.data ?? []} disabled={pending} onGrant={grant} />
      )}

      {grants.error ? (
        <ErrorState error={grants.error} title="Unable to load access" onRetry={grants.reload} compact />
      ) : grants.loading ? (
        <InlineLoading label="Loading access…" />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No dashboards yet"
          body={
            mayGrant
              ? 'Give them a dashboard above, or add them to a group that already has one.'
              : 'Nothing has been shared with this person.'
          }
          compact
        />
      ) : (
        <div className="w-full overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="hover:bg-transparent">
                <TableHead>Dashboard</TableHead>
                <TableHead className="w-40">They can</TableHead>
                <TableHead className="w-48">Through</TableHead>
                <TableHead className="w-28 text-right">
                  <span className="sr-only">Actions</span>
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rows.map((row) => {
                const title = row.dashboardTitle || row.dashboardId
                return (
                  <TableRow key={`${row.origin}-${row.dashboardId}-${row.groupId ?? 0}`}>
                    <TableCell className="font-medium text-foreground">{title}</TableCell>
                    <TableCell>
                      <AccessLevelBadge level={row.level} />
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {row.origin === 'direct' ? 'Given to them' : `Group: ${row.groupName}`}
                    </TableCell>
                    <TableCell className="text-right">
                      {row.origin === 'direct' && mayRevoke && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-destructive hover:text-destructive"
                          disabled={pending}
                          onClick={() => void revoke(row.dashboardId, title)}
                        >
                          <Trash2 aria-hidden />
                          Remove
                        </Button>
                      )}
                      {row.origin === 'group' && (
                        // Inherited access is removed by changing the group, so
                        // this points there rather than offering a button that
                        // would have to explain why it cannot work.
                        <Button variant="ghost" size="sm" asChild>
                          <Link to={paths.groups}>Open group</Link>
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </Section>
  )
}

/* ---------------------------------------------------------------- scopes --- */

/**
 * Row-level data scopes.
 *
 * Which dimensions exist is backend configuration and the values come from the
 * data itself, so this offers exactly what the server will accept. It also says
 * plainly when nothing is filtering on them yet - a screen that lets somebody
 * carefully restrict a colleague to two regions, while every query still reads
 * the whole table, is worse than no screen.
 */
function ScopeSection({ userId }: { userId: number }) {
  const { can } = useAuth()
  const editable = can('scope.update')

  const options = useAsync(() => fetchScopeOptions(), [])
  const current = useAsync(() => fetchUserScope(userId), [userId])

  /* Null means "as saved", so a reload is reflected without an effect. */
  const [edited, setEdited] = useState<Record<string, string[]> | null>(null)
  const [pending, setPending] = useState(false)

  const selected = edited ?? current.data?.scopes ?? {}

  const dimensions = options.data?.dimensions ?? []
  const enforced = options.data?.enforced ?? false

  const toggle = (dimension: string, value: string) => {
    setEdited((previous) => {
      const base = previous ?? current.data?.scopes ?? {}
      const values = base[dimension] || []
      return {
        ...base,
        [dimension]: values.includes(value)
          ? values.filter((entry) => entry !== value)
          : [...values, value],
      }
    })
  }

  const save = async () => {
    setPending(true)
    try {
      // Every configured dimension is sent, so clearing one arrives as an empty
      // list - which is how "unrestricted" is stored.
      const payload: Record<string, string[]> = {}
      for (const dimension of dimensions) {
        payload[dimension.dimension] = selected[dimension.dimension] || []
      }
      await saveUserScope(userId, payload)
      // Back to deriving from the server's answer, which the reload refreshes.
      setEdited(null)
      notify.success('Data access saved.')
      current.reload()
    } catch (err) {
      notify.failure('save the data access', err)
    } finally {
      setPending(false)
    }
  }

  const loading = options.loading || current.loading
  const error = options.error ?? current.error

  return (
    <Section
      title="Data access"
      description="Which slices of the underlying data this person may see. A dimension with nothing selected means no restriction."
      actions={
        editable && dimensions.length > 0 ? (
          <Button size="sm" onClick={() => void save()} disabled={pending || loading}>
            {pending && <Loader2 className="animate-spin" aria-hidden />}
            Save
          </Button>
        ) : undefined
      }
    >
      {error ? (
        <ErrorState
          error={error}
          title="Unable to load data access"
          onRetry={() => {
            options.reload()
            current.reload()
          }}
          compact
        />
      ) : loading ? (
        <InlineLoading label="Loading data access…" />
      ) : dimensions.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No data dimensions are configured, so there is nothing to restrict.
        </p>
      ) : (
        <>
          {!enforced && (
            <div className="mb-5">
              <FormNotice message="These selections are saved but not yet applied — queries currently read the full table regardless. They will take effect when row-level filtering is switched on." />
            </div>
          )}

          <div className="space-y-5">
            {dimensions.map((dimension) => (
              <div key={dimension.dimension}>
                <p className="mb-2 text-xs font-medium text-foreground">{dimension.label}</p>
                {dimension.error ? (
                  <p className="text-xs text-destructive" role="alert">
                    {dimension.error}
                  </p>
                ) : (
                  <ChipSelect
                    options={dimension.values}
                    selected={selected[dimension.dimension] || []}
                    onToggle={(value) => toggle(dimension.dimension, value)}
                    keyOf={(value) => value}
                    labelOf={(value) => value}
                    disabled={!editable || pending}
                    emptyMessage="No values found in the data."
                  />
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </Section>
  )
}
