import { useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { fetchMyCompany } from '@/api/workspaceApi'
import { updateCompany } from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { ActiveBadge } from '@/components/common/Badges'
import { CompanyAvatar } from '@/components/common/CompanyAvatar'
import { TextField } from '@/components/common/Fields'
import { CardGridSkeleton, ErrorState } from '@/components/common/States'
import { notify } from '@/components/common/notify'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

/**
 * A customer administrator's view of their own company.
 *
 * Read through /api/workspace/company, which takes the company from the session
 * - there is no id in the request, so there is nothing to point at somebody
 * else's company.
 *
 * Renaming still goes through the platform company endpoint, which is what owns
 * that write and re-checks the tenant before performing it. A COMPANY_ADMIN
 * holds `company.read` but not `company.update` by default, so for most of them
 * the form is read-only and says so rather than failing on submit.
 */
export default function CompanySettingsPage() {
  const { can } = useAuth()
  const editable = can('company.update')

  const company = useAsync(() => fetchMyCompany(), [])

  /* Null means "as loaded", so a reload is reflected without an effect. */
  const [edited, setEdited] = useState<string | null>(null)
  const name = edited ?? company.data?.name ?? ''
  const [saving, setSaving] = useState(false)

  if (company.error) {
    return (
      <Page>
        <PageHeader title="Company" />
        <Section>
          <ErrorState
            error={company.error}
            title="Unable to load your company"
            onRetry={company.reload}
          />
        </Section>
      </Page>
    )
  }

  if (company.loading || !company.data) {
    return (
      <Page>
        <PageHeader title="Loading company…" />
        <CardGridSkeleton count={2} />
      </Page>
    )
  }

  const record = company.data

  const save = async (event: FormEvent) => {
    event.preventDefault()
    setSaving(true)
    try {
      await updateCompany(record.id, { name: name.trim() })
      // Back to deriving from the record, which the reload refreshes.
      setEdited(null)
      company.reload()
      notify.success('Company name updated.')
    } catch (err) {
      notify.failure('save the company name', err)
    } finally {
      setSaving(false)
    }
  }

  return (
    <Page>
      <PageHeader
        icon={<CompanyAvatar name={record.name} size="lg" />}
        title={record.name}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ActiveBadge active={record.active} />
            <span className="text-xs">{record.slug}</span>
          </span>
        }
      />

      <div className="max-w-2xl space-y-6">
        <Section title="Details">
          <form onSubmit={save} className="space-y-4" noValidate>
            <TextField
              label="Company name"
              value={name}
              onChange={setEdited}
              disabled={!editable || saving}
              hint={
                editable
                  ? 'Shown across the product to everyone here.'
                  : 'Only the platform owner can rename a company. Ask them if this needs to change.'
              }
              required
            />

            <div className="space-y-1.5">
              <Label htmlFor="company-slug" className="text-xs font-medium">
                Identifier
              </Label>
              <Input id="company-slug" value={record.slug} disabled readOnly />
              <p className="text-xs text-muted-foreground">
                Fixed when the company was created. It appears in links and records, so it does not
                change.
              </p>
            </div>

            {editable && (
              <Button type="submit" disabled={saving || !name.trim() || name.trim() === record.name}>
                {saving && <Loader2 className="animate-spin" aria-hidden />}
                Save changes
              </Button>
            )}
          </form>
        </Section>

        <Section title="At a glance">
          <dl className="grid gap-4 sm:grid-cols-3 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">Status</dt>
              <dd className="mt-1.5">
                <ActiveBadge active={record.active} />
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">People</dt>
              <dd className="mt-1.5 font-medium tabular-nums text-foreground">
                {record.userCount ?? 0}
              </dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">Dashboards available</dt>
              <dd className="mt-1.5 font-medium tabular-nums text-foreground">
                {record.dashboardCount ?? 0}
              </dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Which dashboards your company may use is decided by the platform owner. You decide who
            here sees each of them.
          </p>
        </Section>
      </div>
    </Page>
  )
}
