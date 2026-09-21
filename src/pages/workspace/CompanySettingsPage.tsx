import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { fetchCompany, updateCompany } from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import { useAuth } from '@/context/authContext'
import { useNotification } from '@/ui/notificationContext'
import { TextField } from '@/ui/fields'
import { Badge, Loading, PageHeader, Panel } from '@/ui/page'
import { actionPrimaryCls } from '@/ui/styles'
import type { Company } from '@/types/admin'

export default function CompanySettingsPage() {
  const { user } = useAuth()
  const notify = useNotification()

  const [company, setCompany] = useState<Company | null>(null)
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const companyId = user?.companyId

  useEffect(() => {
    if (!companyId) return
    let active = true
    fetchCompany(companyId)
      .then((data) => {
        if (!active) return
        setCompany(data)
        setName(data.name)
      })
      .catch((err) => {
        notify.error('Could not load company settings.', errorMessage(err, ''))
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [companyId, notify])

  const handleSave = async (e: FormEvent) => {
    e.preventDefault()
    if (!companyId) return
    setSaving(true)
    try {
      const updated = await updateCompany(companyId, { name: name.trim() })
      setCompany(updated)
      notify.success('Company settings saved successfully.')
    } catch (err) {
      notify.error('Unable to update company name.', errorMessage(err, ''))
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <Loading label="Loading company settings…" />
      </div>
    )
  }

  if (!company) {
    return (
      <div className="p-6">
        <PageHeader title="Company Settings" />
        <Panel>
          <p className="text-sm text-slate-500">No company details found for your account.</p>
        </Panel>
      </div>
    )
  }

  return (
    <div className="p-6">
      <PageHeader
        title="Company Profile & Settings"
        description="Manage company details and view tenant configuration."
      />

      <div className="max-w-2xl space-y-6">
        <Panel title="General Information">
          <form onSubmit={handleSave} className="space-y-4">
            <TextField
              label="Company Name"
              value={name}
              onChange={setName}
              required
            />

            <div>
              <label className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                Tenant Slug (System Identifier)
              </label>
              <input
                type="text"
                disabled
                value={company.slug}
                className="h-10 w-full rounded-md border border-slate-200 bg-slate-100 px-3 font-mono text-sm text-slate-500 cursor-not-allowed"
              />
              <p className="mt-1 text-[11px] text-slate-400">
                The tenant slug is immutable once created to ensure API URL stability.
              </p>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={saving}
                className={actionPrimaryCls}
              >
                {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          </form>
        </Panel>

        <Panel title="Tenant Status & Capacity">
          <dl className="grid gap-4 sm:grid-cols-3 text-xs">
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Status</dt>
              <dd className="mt-1">
                <Badge tone={company.active ? 'success' : 'danger'}>
                  {company.active ? 'Active' : 'Disabled'}
                </Badge>
              </dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Registered Users</dt>
              <dd className="mt-1 font-semibold text-slate-800">{company.userCount ?? 0}</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase">Assigned Dashboards</dt>
              <dd className="mt-1 font-semibold text-slate-800">{company.dashboardCount ?? 0}</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  )
}
