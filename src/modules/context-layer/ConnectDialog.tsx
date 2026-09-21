import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { errorCode, errorMessage } from '@/api/client'
import { listCompanies } from '@/api/adminApi'
import { useAuth } from '@/context/authContext'
import Modal from '@/ui/Modal'
import { PasswordField, TextField } from '@/ui/fields'
import { labelCls, primaryButtonCls, selectCls } from '@/ui/styles'
import { useNotification } from '@/ui/notificationContext'
import type { Company } from '@/types/admin'
import { createConnection } from './api'
import type { Connector, CreatedConnection } from './types'

/**
 * The connect form, rendered from the connector's declared fields.
 *
 * Generic on purpose. Domo is the only provider today, but a dialog written
 * around Domo's three fields is a dialog that gets copied for Snowflake, and
 * then the two drift. The backend publishes what each connector needs; this
 * renders it.
 *
 * There is no "save without testing". The credential is checked against the
 * warehouse before anything is stored, so a connection on the list is one that
 * worked at least once — the alternative is a row that looks identical to a
 * working one until somebody depends on it.
 */
export default function ConnectDialog({
  connector,
  onClose,
  onConnected,
}: {
  connector: Connector
  onClose: () => void
  onConnected: (result: CreatedConnection) => void
}) {
  const { user } = useAuth()
  const notify = useNotification()
  const isPlatform = user?.role === 'SUPER_ADMIN'

  const [values, setValues] = useState<Record<string, string>>({})
  const [companyId, setCompanyId] = useState('')
  const [companies, setCompanies] = useState<Company[] | null>(null)
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null)

  /*
   * A platform account has no company of its own, so it has to say which
   * company the connection belongs to — the same rule as creating a user. A
   * company account never sees this and the backend ignores any companyId it
   * might send.
   */
  useEffect(() => {
    if (!isPlatform) return
    let cancelled = false
    void (async () => {
      try {
        const found = await listCompanies()
        if (!cancelled) setCompanies(found.filter((c) => c.active))
      } catch (err) {
        if (cancelled) return
        setCompanies([])
        notify.error('Could not load the company list.', errorMessage(err, ''))
      }
    })()
    return () => {
      cancelled = true
    }
  }, [isPlatform, notify])

  const set = (id: string, value: string) => {
    setValues((current) => ({ ...current, [id]: value }))
    // The previous failure described the previous credential.
    setFailure(null)
  }

  const ready = useMemo(
    () =>
      connector.credentials.every((field) => (values[field.id] || '').trim().length > 0) &&
      (!isPlatform || companyId !== ''),
    [connector.credentials, values, isPlatform, companyId]
  )

  const onSubmit = async (e: FormEvent) => {
    e.preventDefault()
    if (pending || !ready) return
    setPending(true)
    setFailure(null)

    const progress = notify.pending(`Checking the token with ${connector.name}…`)
    try {
      const result = await createConnection({
        provider: connector.id,
        name: (values.name || '').trim(),
        host: (values.host || '').trim(),
        token: (values.token || '').trim(),
        ...(isPlatform ? { companyId: Number(companyId) } : {}),
      })
      notify.dismiss(progress)
      notify.success(
        `Connected to ${connector.name}.`,
        `${result.datasets.length} dataset${result.datasets.length === 1 ? '' : 's'} visible to this token.`
      )
      onConnected(result)
    } catch (err) {
      notify.dismiss(progress)
      /*
       * Shown in the dialog rather than only as a toast. A rejected token means
       * retyping the field that is on screen, and a notification that slides
       * away takes the reason with it.
       */
      const code = errorCode(err)
      setFailure({
        message: errorMessage(err, `${connector.name} could not be reached.`),
        retryable: code === 'CONNECTOR_UNREACHABLE' || code === 'NETWORK_ERROR',
      })
      setPending(false)
    }
  }

  return (
    <Modal title={`Connect ${connector.name}`} onClose={onClose} width="max-w-lg">
      <form onSubmit={onSubmit} className="space-y-4">
        {isPlatform && (
          <div>
            <label className={labelCls} htmlFor="context-company">
              Company
            </label>
            <select
              id="context-company"
              className={selectCls}
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={pending || companies === null}
            >
              <option value="">
                {companies === null ? 'Loading companies…' : 'Choose a company…'}
              </option>
              {(companies ?? []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <p className="mt-1 text-[12px] text-slate-500">
              A connection holds a credential for one company's warehouse, so it belongs to that
              company and nobody outside it can see it.
            </p>
          </div>
        )}

        {connector.credentials.map((field) =>
          field.type === 'secret' ? (
            <PasswordField
              key={field.id}
              label={field.label}
              value={values[field.id] || ''}
              onChange={(value) => set(field.id, value)}
              autoComplete="off"
              disabled={pending}
              hint={field.help}
            />
          ) : (
            <div key={field.id}>
              <TextField
                label={field.label}
                value={values[field.id] || ''}
                onChange={(value) => set(field.id, value)}
                disabled={pending}
              />
              {field.help && <p className="mt-1 text-[12px] text-slate-500">{field.help}</p>}
            </div>
          )
        )}

        {failure && (
          <div
            role="alert"
            className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-[12px] leading-snug text-red-700"
          >
            {failure.message}
            {failure.retryable && (
              <span className="mt-1 block text-red-600/80">
                Nothing was saved. The address and the token are still as you typed them.
              </span>
            )}
          </div>
        )}

        <p className="rounded-md bg-slate-50 px-3 py-2 text-[12px] leading-snug text-slate-500">
          The token is checked against {connector.name} before it is stored, and stored encrypted.
          It is never shown again — only its last four characters.
        </p>

        <button type="submit" className={primaryButtonCls} disabled={pending || !ready}>
          {pending ? 'Checking…' : `Validate and connect`}
        </button>
      </form>
    </Modal>
  )
}
