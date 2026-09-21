import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, ChevronRight, Mail } from 'lucide-react'
import { createCompany } from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import Modal from '@/ui/Modal'
import { FormError, FormNotice } from '@/ui/feedback'
import { TextField } from '@/ui/fields'
import { actionPrimaryCls, ghostButtonCls, primaryButtonCls } from '@/ui/styles'
import type { Company } from '@/types/admin'

interface CompanyOnboardingModalProps {
  onCreated: (company: Company) => void
  onClose: () => void
}

function slugify(text: string) {
  return text
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
}

export default function CompanyOnboardingModal({
  onCreated,
  onClose,
}: CompanyOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')
  const [slugModified, setSlugModified] = useState(false)

  // Admin details
  const [adminUsername, setAdminUsername] = useState('')
  const [adminEmail, setAdminEmail] = useState('')
  const [adminDisplayName, setAdminDisplayName] = useState('')

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdCompany, setCreatedCompany] = useState<Company | null>(null)

  const handleNameChange = (val: string) => {
    setName(val)
    if (!slugModified) {
      setSlug(slugify(val))
    }
  }

  const handleNextToStep2 = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!name.trim()) {
      setError('Company name is required.')
      return
    }
    setStep(2)
  }

  const handleNextToStep3 = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!adminUsername.trim()) {
      setError('Administrator username is required.')
      return
    }
    if (!adminEmail.trim()) {
      setError('Administrator email is required.')
      return
    }
    setStep(3)
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const company = await createCompany({
        name: name.trim(),
        slug: slug.trim() || undefined,
        admin: {
          username: adminUsername.trim(),
          email: adminEmail.trim().toLowerCase(),
          displayName: adminDisplayName.trim() || undefined,
        },
      })
      setCreatedCompany(company)
      onCreated(company)
      setStep(4)
    } catch (err) {
      setError(errorMessage(err, 'Unable to create the customer company.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Onboard Customer Company" onClose={onClose} width="max-w-lg">
      {step < 4 && (
        <div className="mb-6 flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                step >= 1 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              1
            </span>
            <span className={`text-xs ${step === 1 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
              Company Details
            </span>
          </div>

          <ChevronRight size={14} className="text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                step >= 2 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              2
            </span>
            <span className={`text-xs ${step === 2 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
              Primary Admin
            </span>
          </div>

          <ChevronRight size={14} className="text-slate-300" />

          <div className="flex items-center gap-2">
            <span
              className={`grid h-6 w-6 place-items-center rounded-full text-xs font-bold ${
                step >= 3 ? 'bg-blue-600 text-white' : 'bg-slate-100 text-slate-500'
              }`}
            >
              3
            </span>
            <span className={`text-xs ${step === 3 ? 'font-bold text-slate-800' : 'text-slate-500'}`}>
              Review
            </span>
          </div>
        </div>
      )}

      {error && (
        <div className="mb-4">
          <FormError message={error} />
        </div>
      )}

      {/* Step 1: Company Info */}
      {step === 1 && (
        <form onSubmit={handleNextToStep2} className="space-y-4">
          <TextField
            label="Company Name"
            value={name}
            onChange={handleNameChange}
            autoFocus
            required
          />
          <TextField
            label="URL Identifier / Slug"
            value={slug}
            onChange={(val) => {
              setSlug(val)
              setSlugModified(true)
            }}
            required
          />
          <p className="text-[11px] text-slate-400">
            Used as the unique tenant slug for URL routing and API identifier validation.
          </p>

          <div className="mt-6 flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className={ghostButtonCls}>
              Cancel
            </button>
            <button type="submit" className={actionPrimaryCls}>
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Step 2: Primary Administrator */}
      {step === 2 && (
        <form onSubmit={handleNextToStep3} className="space-y-4">
          <TextField
            label="Admin Username"
            value={adminUsername}
            onChange={setAdminUsername}
            autoFocus
            required
          />
          <TextField
            label="Admin Work Email"
            autoComplete="email"
            value={adminEmail}
            onChange={setAdminEmail}
            required
          />
          <TextField
            label="Display Name (optional)"
            value={adminDisplayName}
            onChange={setAdminDisplayName}
            required={false}
          />

          <FormNotice message="Creating the company automatically provisions its initial COMPANY_ADMIN account and dispatches an invitation email with an activation link." />

          <div className="mt-6 flex justify-between gap-2 pt-2">
            <button type="button" onClick={() => setStep(1)} className={ghostButtonCls}>
              Back
            </button>
            <button type="submit" className={actionPrimaryCls}>
              Next
              <ChevronRight size={14} />
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Review */}
      {step === 3 && (
        <div className="space-y-4">
          <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 text-xs">
            <dl className="grid grid-cols-2 gap-3">
              <div>
                <dt className="text-slate-400">Company Name</dt>
                <dd className="font-semibold text-slate-800">{name}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Tenant Slug</dt>
                <dd className="font-mono font-semibold text-slate-800">{slug}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Admin Username</dt>
                <dd className="font-semibold text-slate-800">{adminUsername}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Admin Email</dt>
                <dd className="font-semibold text-slate-800">{adminEmail}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Admin Display Name</dt>
                <dd className="font-semibold text-slate-800">{adminDisplayName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Admin Role</dt>
                <dd className="font-semibold text-slate-800">COMPANY_ADMIN</dd>
              </div>
            </dl>
          </div>

          <p className="text-xs text-slate-500">
            The company, its tenant boundary, and the administrator account will be committed in a
            single transaction and the invitation link will be sent to the administrator.
          </p>

          <div className="mt-6 flex justify-between gap-2 pt-2">
            <button
              type="button"
              disabled={loading}
              onClick={() => setStep(2)}
              className={ghostButtonCls}
            >
              Back
            </button>
            <button
              type="button"
              disabled={loading}
              onClick={() => void handleCreate()}
              className={actionPrimaryCls}
            >
              <Mail size={14} />
              {loading ? 'Creating Company & Sending Invite…' : 'Create Company & Invite Admin'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success Result */}
      {step === 4 && createdCompany && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">Company Created Successfully</h3>
          <p className="mt-1 text-xs text-slate-600">
            The company <strong className="text-slate-800">{createdCompany.name}</strong> is now
            active. An onboarding invitation has been emailed to:
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-slate-800">
            {createdCompany.admin?.email || adminEmail}
          </p>

          <div className="mt-6">
            <button type="button" onClick={onClose} className={primaryButtonCls}>
              Done
            </button>
          </div>
        </div>
      )}
    </Modal>
  )
}
