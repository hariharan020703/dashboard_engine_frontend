import { useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import { Loader2 } from 'lucide-react'
import { errorCode, errorMessage } from '@/api/http'
import { listCompanies } from '@/api/platformApi'
import { useAsync } from '@/hooks/useAsync'
import { useAuth } from '@/context/authContext'
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
import { PasswordField, TextField } from '@/components/common/Fields'
import { notify } from '@/components/common/notify'
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
  const isPlatform = user?.companyId === null

  const [values, setValues] = useState<Record<string, string>>({})
  const [companyId, setCompanyId] = useState('')
  const [pending, setPending] = useState(false)
  const [failure, setFailure] = useState<{ message: string; retryable: boolean } | null>(null)

  /*
   * A platform account has no company of its own, so it has to say which
   * company the connection belongs to — the same rule as creating a user. A
   * company account never sees this, and the backend ignores any companyId it
   * might send.
   */
  const companies = useAsync(
    () => (isPlatform ? listCompanies() : Promise.resolve([])),
    [isPlatform]
  )

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

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
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
    <Dialog open onOpenChange={(open) => !open && !pending && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Connect {connector.name}</DialogTitle>
          <DialogDescription>
            The token is checked against {connector.name} before anything is saved.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="space-y-4" noValidate>
          {isPlatform && (
            <div className="space-y-1.5">
              <Label htmlFor="context-company" className="text-xs font-medium">
                Company
              </Label>
              <Select
                value={companyId}
                onValueChange={setCompanyId}
                disabled={pending || companies.loading}
              >
                <SelectTrigger id="context-company" className="w-full">
                  <SelectValue
                    placeholder={companies.loading ? 'Loading companies…' : 'Choose a company…'}
                  />
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
              <p className="text-xs text-muted-foreground">
                A connection holds a credential for one company&rsquo;s warehouse, so it belongs to
                that company and nobody outside it can see it.
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
              <TextField
                key={field.id}
                label={field.label}
                value={values[field.id] || ''}
                onChange={(value) => set(field.id, value)}
                disabled={pending}
                hint={field.help}
                required
              />
            )
          )}

          {failure && (
            <div
              role="alert"
              className="rounded-md border border-destructive/20 bg-destructive/10 px-3 py-2 text-sm text-destructive"
            >
              {failure.message}
              {failure.retryable && (
                <span className="mt-1 block text-xs opacity-80">
                  Nothing was saved. The address and the token are still as you typed them.
                </span>
              )}
            </div>
          )}

          <p className="rounded-md bg-muted px-3 py-2 text-xs text-muted-foreground">
            The token is stored encrypted and never shown again — only its last four characters.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || !ready}>
              {pending && <Loader2 className="animate-spin" aria-hidden />}
              {pending ? 'Checking…' : 'Validate and connect'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
