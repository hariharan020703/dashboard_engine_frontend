import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { Building2, Plus, Trash2 } from 'lucide-react'
import {
  assignDashboard,
  createCompany,
  deleteCompany,
  listCompanies,
  listCompanyDashboards,
  unassignDashboard,
  updateCompany,
} from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import ConfirmDialog from '@/ui/ConfirmDialog'
import Modal from '@/ui/Modal'
import SelectList from '@/ui/SelectList'
import { useNotification } from '@/ui/notificationContext'
import { TextField } from '@/ui/fields'
import { Badge, EmptyState, Loading, PageHeader, Panel } from '@/ui/page'
import { actionButtonCls, actionDangerCls, actionPrimaryCls, primaryButtonCls } from '@/ui/styles'
import type { Company, DashboardSummary } from '@/types/admin'

/**
 * Customer companies: the tenant boundary everything else hangs off.
 *
 * Creating and switching off a company is platform-only. A company
 * administrator reaching this screen sees exactly one row - their own - because
 * the backend narrows the query, not because this page filters it.
 *
 * Which dashboards a company may use is decided here too, and only here. That
 * assignment is the outer gate on data access: a company administrator can only
 * grant what appears in their company's list, so nothing they do can reach
 * another customer's dashboard.
 */
export default function CompaniesPage() {
  const { can } = useAuth()
  const notify = useNotification()

  /*
   * `null` means "not loaded yet", which is where the spinner comes from.
   *
   * A separate `loading` flag would have to be set at the top of the effect,
   * and writing state synchronously inside an effect is the cascading-render
   * pattern React warns about. Deriving it from the data removes the flag and
   * the write together - and a reload after a mutation swaps the rows in place
   * instead of flashing a spinner over a list that is about to look the same.
   */
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [selected, setSelected] = useState<number | null>(null)
  const [creating, setCreating] = useState(false)
  const [deleting, setDeleting] = useState<Company | null>(null)
  const loading = companies === null
  const rows = companies ?? []

  /*
   * Reloading bumps a counter rather than calling a loader, so the fetch lives
   * in the effect that owns it and there is one code path for the first load
   * and every refresh after a change.
   */
  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await listCompanies()
        if (cancelled) return
        setCompanies(found)
        // Keeps whatever is already selected; falls back to the first row.
        setSelected((current) => current ?? found[0]?.id ?? null)
      } catch (err) {
        if (cancelled) return
        setCompanies([])
        notify.error('Could not load companies.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [reloadToken, notify])

  const onDelete = async (company: Company) => {
    try {
      await deleteCompany(company.id)
      notify.success(`"${company.name}" was deleted.`)
      setSelected(null)
      reload()
    } catch (err) {
      notify.error('Unable to delete the company.', errorMessage(err, ''))
    }
  }

  const current = rows.find((c) => c.id === selected) ?? null

  return (
    <div className="p-6">
      <PageHeader
        title="Companies"
        description="Each company owns its own users, groups and dashboard access."
        actions={
          can('company.create') ? (
            <button type="button" className={actionPrimaryCls} onClick={() => setCreating(true)}>
              <Plus size={14} />
              New company
            </button>
          ) : null
        }
      />

      {loading && (
        <Panel flush>
          <Loading label="Loading companies…" />
        </Panel>
      )}

      {!loading && rows.length === 0 && (
        <Panel flush>
          <EmptyState
            message="No companies yet."
            hint="A company is the boundary that owns its users and their access."
          />
        </Panel>
      )}

      {!loading && rows.length > 0 && (
        <div className="grid gap-6 lg:grid-cols-[20rem_1fr]">
          <Panel title="Companies" flush>
            <SelectList
              items={rows}
              selectedKey={selected}
              onSelect={(c) => setSelected(c.id)}
              keyOf={(c) => c.id}
              primary={(c) => c.name}
              secondary={(c) =>
                `${c.userCount ?? 0} user${c.userCount === 1 ? '' : 's'} · ${c.dashboardCount ?? 0} dashboard${c.dashboardCount === 1 ? '' : 's'}`
              }
              trailing={(c) => (!c.active ? <Badge tone="danger">inactive</Badge> : null)}
            />
          </Panel>

          {current && (
            <div className="space-y-6">
              <CompanyPanel
                key={`company-${current.id}`}
                company={current}
                onChanged={reload}
                onDelete={() => setDeleting(current)}
              />
              {can('dashboard.assign') && (
                <CompanyDashboards key={`dash-${current.id}`} company={current} onChanged={reload} />
              )}
            </div>
          )}
        </div>
      )}

      {creating && (
        <CreateCompanyDialog
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
          title="Delete this company?"
          message={`"${deleting.name}" will be removed from the platform.`}
          consequence="This cannot be undone. The company must have no accounts left before it can be deleted."
          confirmLabel="Delete company"
          destructive
          onConfirm={() => onDelete(deleting)}
          onClose={() => setDeleting(null)}
        />
      )}
    </div>
  )
}

/* -------------------------------------------------------------- one company --- */

function CompanyPanel({
  company,
  onChanged,
  onDelete,
}: {
  company: Company
  onChanged: () => void
  onDelete: () => void
}) {
  const { can } = useAuth()
  const notify = useNotification()
  const editable = can('company.update')

  const [name, setName] = useState(company.name)
  const [pending, setPending] = useState(false)
  const [confirmDisable, setConfirmDisable] = useState(false)

  const rename = async () => {
    setPending(true)
    try {
      await updateCompany(company.id, { name: name.trim() })
      notify.success('Company renamed.')
      onChanged()
    } catch (err) {
      notify.error('Unable to rename the company.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  const setActive = async (active: boolean) => {
    setPending(true)
    try {
      await updateCompany(company.id, { active })
      notify.success(active ? 'Company reactivated.' : 'Company deactivated.')
      onChanged()
    } catch (err) {
      notify.error('Unable to change the company.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title={company.name}
      description={
        <span className="flex items-center gap-2">
          <code className="text-slate-600">{company.slug}</code>
          {!company.active && <Badge tone="danger">deactivated</Badge>}
        </span>
      }
      actions={
        can('company.delete') ? (
          <button type="button" className={actionDangerCls} onClick={onDelete}>
            <Trash2 size={14} />
            Delete
          </button>
        ) : null
      }
    >
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="flex items-end gap-2">
          <div className="flex-1">
            <TextField
              label="Name"
              value={name}
              onChange={setName}
              disabled={!editable || pending}
            />
          </div>
          <button
            type="button"
            className={actionPrimaryCls}
            disabled={!editable || pending || !name.trim() || name.trim() === company.name}
            onClick={rename}
          >
            Save
          </button>
        </div>

        <dl className="grid grid-cols-2 gap-4 self-end">
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Accounts
            </dt>
            <dd className="text-sm text-slate-800">{company.userCount ?? 0}</dd>
          </div>
          <div>
            <dt className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              Dashboards
            </dt>
            <dd className="text-sm text-slate-800">{company.dashboardCount ?? 0}</dd>
          </div>
        </dl>
      </div>

      {can('company.update') && (
        <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
          {company.active ? (
            <button
              type="button"
              className={actionDangerCls}
              disabled={pending}
              onClick={() => setConfirmDisable(true)}
            >
              Deactivate company
            </button>
          ) : (
            <button
              type="button"
              className={actionPrimaryCls}
              disabled={pending}
              onClick={() => void setActive(true)}
            >
              Reactivate company
            </button>
          )}
          <span className="text-[12px] text-slate-400">
            A deactivated company blocks sign-in for everyone in it, immediately.
          </span>
        </div>
      )}

      {confirmDisable && (
        <ConfirmDialog
          title="Deactivate this company?"
          message={`Everyone at "${company.name}" will be signed out and refused at sign-in.`}
          consequence="Their sessions end immediately. Reactivating restores access; nothing is deleted."
          confirmLabel="Deactivate"
          destructive
          onConfirm={() => setActive(false)}
          onClose={() => setConfirmDisable(false)}
        />
      )}
    </Panel>
  )
}

/* ------------------------------------------------------ dashboard assignment --- */

/**
 * Which dashboards this company may use.
 *
 * Unassigning removes the company's grants on that dashboard too, so
 * re-assigning it later does not silently restore access somebody revoked in
 * between. The confirmation says so, because that is the surprising half.
 */
function CompanyDashboards({ company, onChanged }: { company: Company; onChanged: () => void }) {
  const notify = useNotification()
  const [dashboards, setDashboards] = useState<DashboardSummary[] | null>(null)
  const [pending, setPending] = useState(false)
  const [confirmRemove, setConfirmRemove] = useState<DashboardSummary | null>(null)
  const loading = dashboards === null
  const rows = dashboards ?? []

  const [reloadToken, setReloadToken] = useState(0)
  const reload = useCallback(() => setReloadToken((n) => n + 1), [])

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const found = await listCompanyDashboards(company.id)
        if (!cancelled) setDashboards(found)
      } catch (err) {
        if (cancelled) return
        setDashboards([])
        notify.error('Could not load the dashboard list.', errorMessage(err, ''))
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [company.id, reloadToken, notify])

  const assign = async (dashboard: DashboardSummary) => {
    setPending(true)
    try {
      await assignDashboard(company.id, dashboard.id)
      notify.success(`"${dashboard.title || dashboard.id}" is now available to ${company.name}.`)
      reload()
      onChanged()
    } catch (err) {
      notify.error('Unable to assign the dashboard.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  const unassign = async (dashboard: DashboardSummary) => {
    setPending(true)
    try {
      await unassignDashboard(company.id, dashboard.id)
      notify.success(`"${dashboard.title || dashboard.id}" was removed from ${company.name}.`)
      reload()
      onChanged()
    } catch (err) {
      notify.error('Unable to remove the dashboard.', errorMessage(err, ''))
    } finally {
      setPending(false)
    }
  }

  return (
    <Panel
      title="Dashboards"
      description="Only assigned dashboards can be granted to this company's users."
      flush
    >
      {loading && <Loading label="Loading dashboards…" />}
      {!loading && rows.length === 0 && (
        <EmptyState message="The registry has no dashboards to assign." />
      )}
      {!loading && rows.length > 0 && (
        <ul className="divide-y divide-slate-100">
          {rows.map((d) => (
            <li key={d.id} className="flex items-center gap-3 px-5 py-2.5">
              <Building2 size={15} className="shrink-0 text-slate-300" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm text-slate-800">{d.title || d.id}</span>
                <span className="block text-[11px] text-slate-400">{d.id}</span>
              </span>
              {d.assigned ? (
                <button
                  type="button"
                  className={actionDangerCls}
                  disabled={pending}
                  onClick={() => setConfirmRemove(d)}
                >
                  Remove
                </button>
              ) : (
                <button
                  type="button"
                  className={actionButtonCls}
                  disabled={pending}
                  onClick={() => void assign(d)}
                >
                  Assign
                </button>
              )}
            </li>
          ))}
        </ul>
      )}

      {confirmRemove && (
        <ConfirmDialog
          title="Remove this dashboard?"
          message={`"${confirmRemove.title || confirmRemove.id}" will no longer be available to ${company.name}.`}
          consequence="Every grant on it inside this company is revoked as well, so re-assigning it later will not restore anybody's access."
          confirmLabel="Remove"
          destructive
          onConfirm={() => unassign(confirmRemove)}
          onClose={() => setConfirmRemove(null)}
        />
      )}
    </Panel>
  )
}

/* ----------------------------------------------------------------- creating --- */

/**
 * Onboarding a customer: the company and the person who will run it.
 *
 * Both are asked for at once because the backend creates them together - a
 * company with nobody in it cannot be administered or signed into, so there is
 * no useful moment between the two steps.
 *
 * No password field here either. The administrator receives a single-use link
 * and chooses their own, so the credential is never one that two people have
 * seen. If the email cannot be sent, the whole thing is rolled back and this
 * form says so rather than reporting a company that was never usable.
 */
function CreateCompanyDialog({
  onClose,
  onCreated,
}: {
  onClose: () => void
  onCreated: (id: number) => void
}) {
  const notify = useNotification()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [pending, setPending] = useState(false)

  /*
   * The username follows the email until somebody types in it.
   *
   * Two near-identical boxes is the part of this form most likely to be filled
   * in wrong, and the local part of a work address is almost always the
   * username anyway. Tracking whether the field has been touched - rather than
   * comparing it to the derived value - means clearing it deliberately stays
   * cleared instead of springing back.
   */
  const [usernameTouched, setUsernameTouched] = useState(false)
  const onEmailChange = (value: string) => {
    setEmail(value)
    if (!usernameTouched) {
      setUsername(
        value
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9._-]/g, '.')
      )
    }
  }

  const ready = name.trim() && email.trim() && username.trim()

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !ready) return
    setPending(true)

    const progress = notify.pending('Creating the company and sending the invitation…')
    try {
      const company = await createCompany({
        name: name.trim(),
        admin: {
          username: username.trim(),
          email: email.trim(),
          displayName: displayName.trim() || undefined,
        },
      })
      notify.dismiss(progress)
      notify.success(
        `"${company.name}" was created.`,
        `An activation link has been sent to ${company.admin?.email ?? email.trim()}. They set their own password from it.`
      )
      onCreated(company.id)
    } catch (err) {
      notify.dismiss(progress)
      notify.error('Unable to create the company.', errorMessage(err, ''))
      setPending(false)
    }
  }

  return (
    <Modal title="New company" onClose={onClose}>
      <form onSubmit={onSubmit} className="space-y-4">
        <TextField
          label="Company name"
          value={name}
          onChange={setName}
          autoFocus
          disabled={pending}
        />
        <p className="text-[12px] text-slate-500">
          A URL-safe identifier is derived from the name.
        </p>

        <div className="space-y-4 border-t border-slate-100 pt-4">
          <div>
            <h3 className="text-[13px] font-semibold text-slate-700">Company administrator</h3>
            <p className="text-[12px] text-slate-500">
              The person who requested the account. They will be able to add users and grant
              dashboards inside this company, and nothing outside it.
            </p>
          </div>

          <TextField
            label="Email"
            value={email}
            onChange={onEmailChange}
            autoComplete="email"
            disabled={pending}
          />
          <TextField
            label="Username"
            value={username}
            onChange={(value) => {
              setUsernameTouched(true)
              setUsername(value)
            }}
            disabled={pending}
          />
          <TextField
            label="Full name (optional)"
            value={displayName}
            onChange={setDisplayName}
            disabled={pending}
            required={false}
          />
        </div>

        <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] leading-snug text-slate-500">
          No password is set here. They receive a single-use link by email and choose their own,
          so nobody else ever sees it. If the email cannot be delivered, the company is not
          created.
        </p>

        <button type="submit" className={primaryButtonCls} disabled={pending || !ready}>
          {pending ? 'Creating…' : 'Create company and send invitation'}
        </button>
      </form>
    </Modal>
  )
}
