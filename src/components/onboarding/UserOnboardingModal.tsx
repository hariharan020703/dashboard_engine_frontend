import { useState } from 'react'
import type { FormEvent } from 'react'
import { CheckCircle2, ChevronRight, Mail } from 'lucide-react'
import { createUser } from '@/api/adminApi'
import { errorMessage } from '@/api/client'
import Modal from '@/ui/Modal'
import { FormError, FormNotice } from '@/ui/feedback'
import { TextField } from '@/ui/fields'
import RoleSelect from '@/components/rbac/RoleSelect'
import { actionPrimaryCls, ghostButtonCls, labelCls, primaryButtonCls, selectCls } from '@/ui/styles'
import type { AdminUser, Company } from '@/types/admin'
import type { RoleName } from '@/types/auth'
import { useAuth } from '@/context/authContext'

interface UserOnboardingModalProps {
  companies?: Company[]
  onCreated: (user: AdminUser) => void
  onClose: () => void
}

export default function UserOnboardingModal({
  companies = [],
  onCreated,
  onClose,
}: UserOnboardingModalProps) {
  const { user: me } = useAuth()
  const isPlatform = me?.companyId === null

  const [step, setStep] = useState<1 | 2 | 3 | 4>(1)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [role, setRole] = useState<RoleName>('USER')
  const [companyId, setCompanyId] = useState<number | undefined>(
    companies[0]?.id
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [createdUser, setCreatedUser] = useState<AdminUser | null>(null)

  const selectedCompany = companies.find((c) => c.id === companyId)

  const handleNextToStep2 = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!username.trim()) {
      setError('Username is required.')
      return
    }
    if (!email.trim()) {
      setError('Email is required.')
      return
    }
    setStep(2)
  }

  const handleNextToStep3 = (e: FormEvent) => {
    e.preventDefault()
    setError(null)
    setStep(3)
  }

  const handleCreate = async () => {
    setLoading(true)
    setError(null)
    try {
      const user = await createUser({
        username: username.trim(),
        email: email.trim().toLowerCase(),
        displayName: displayName.trim() || undefined,
        role,
        companyId: isPlatform ? companyId : undefined,
      })
      setCreatedUser(user)
      onCreated(user)
      setStep(4)
    } catch (err) {
      setError(errorMessage(err, 'Unable to create the user account.'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <Modal title="Onboard New Team Member" onClose={onClose} width="max-w-lg">
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
              Basic Info
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
              Access & Role
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

      {/* Step 1: Basic Info */}
      {step === 1 && (
        <form onSubmit={handleNextToStep2} className="space-y-4">
          <TextField
            label="Username"
            value={username}
            onChange={setUsername}
            autoFocus
            required
          />
          <TextField
            label="Work Email"
            autoComplete="email"
            value={email}
            onChange={setEmail}
            required
          />
          <TextField
            label="Display Name (optional)"
            value={displayName}
            onChange={setDisplayName}
            required={false}
          />

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

      {/* Step 2: Access & Role */}
      {step === 2 && (
        <form onSubmit={handleNextToStep3} className="space-y-4">
          {isPlatform && companies.length > 0 && (
            <div>
              <label htmlFor="onboarding-company" className={labelCls}>
                Company / Tenant
              </label>
              <select
                id="onboarding-company"
                className={selectCls}
                value={companyId ?? ''}
                onChange={(e) => setCompanyId(Number(e.target.value))}
              >
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          <div>
            <RoleSelect
              label="System Role"
              value={role}
              onChange={setRole}
              includePlatform={isPlatform}
            />
            <p className="mt-1.5 text-[11px] text-slate-500">
              {role === 'USER'
                ? 'Standard employee access: can only view granted dashboards and data.'
                : role === 'COMPANY_ADMIN'
                ? 'Company administrator: can manage company users, groups, and dashboard grants.'
                : 'Platform owner: full administrative access across the platform.'}
            </p>
          </div>

          <FormNotice message="An activation email will be automatically sent with a secure, single-use link for the user to set their password." />

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
                <dt className="text-slate-400">Username</dt>
                <dd className="font-semibold text-slate-800">{username}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Email Address</dt>
                <dd className="font-semibold text-slate-800">{email}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Display Name</dt>
                <dd className="font-semibold text-slate-800">{displayName || '—'}</dd>
              </div>
              <div>
                <dt className="text-slate-400">Assigned Role</dt>
                <dd className="font-semibold text-slate-800">{role}</dd>
              </div>
              {isPlatform && (
                <div className="col-span-2">
                  <dt className="text-slate-400">Assigned Company</dt>
                  <dd className="font-semibold text-slate-800">
                    {selectedCompany ? selectedCompany.name : 'Platform'}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <p className="text-xs text-slate-500">
            Clicking <strong>Send Invitation & Create</strong> will commit the user account to
            the database and dispatch the activation email through the mail provider.
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
              {loading ? 'Creating & Sending Email…' : 'Send Invitation & Create'}
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Success Result */}
      {step === 4 && createdUser && (
        <div className="py-4 text-center">
          <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-emerald-100 text-emerald-600">
            <CheckCircle2 size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-900">User Successfully Created</h3>
          <p className="mt-1 text-xs text-slate-600">
            An onboarding invitation with an expiring activation link has been sent to:
          </p>
          <p className="mt-1 font-mono text-xs font-semibold text-slate-800">
            {createdUser.email}
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
