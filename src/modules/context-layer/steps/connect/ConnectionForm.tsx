import { useState } from 'react'
import { AlertCircle, CheckCircle2, Loader2, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/api/http'
import { useAsync } from '@/hooks/useAsync'
import { listCompanies } from '@/api/platformApi'
import { useAuth } from '@/context/authContext'
import { cn } from '@/lib/utils'
import type { Connector, CreatedConnection } from '../../types'
import { credentialFields, connectorPresentation } from '../../connectors/registry'
import { DEFAULT_DATASET_LIMIT } from '../../config'
import { useCreateConnection } from '../../queries/hooks'

/**
 * The credential form, rendered from the connector's own field list.
 *
 * The backend describes the form (`connector.credentials`), so adding a
 * provider needs no second dialog that can drift from this one, and the two
 * sides cannot disagree about which fields exist.
 *
 * What this component does NOT do is as important as what it does. It does not
 * authenticate against the provider, does not hold a token after submitting,
 * and does not persist one anywhere — not in localStorage, not in sessionStorage,
 * not in a URL, not in a log line. The credential is submitted once over HTTPS;
 * the backend validates it against the provider, encrypts it, and returns a
 * connection id. The id is what the rest of the workflow carries, and the
 * secret field is cleared the moment the exchange succeeds.
 *
 * Validation and saving are one request, deliberately. A saved connection whose
 * credential was never checked looks identical on screen to one that works, and
 * the moment it is relied on is the moment somebody is waiting on a context
 * that will never build.
 */

type Phase = 'idle' | 'validating' | 'connected' | 'failed'

export function ConnectionForm({
  connector,
  onConnected,
  onCancel,
}: {
  connector: Connector
  onConnected: (result: CreatedConnection) => void
  onCancel: () => void
}) {
  const { user } = useAuth()
  const fields = credentialFields(connector)
  const presentation = connectorPresentation(connector.id)

  const [values, setValues] = useState<Record<string, string>>({})
  const [companyId, setCompanyId] = useState('')
  const [phase, setPhase] = useState<Phase>('idle')
  const [failure, setFailure] = useState<string | null>(null)
  const [result, setResult] = useState<CreatedConnection | null>(null)

  const createConnection = useCreateConnection()

  /*
   * A connection belongs to exactly one company, and a platform account has
   * none of its own to fall back on — so it has to say which company this is
   * for. A company account never sees this field, and the backend ignores any
   * companyId in the body for them: the only correct value there is one the
   * client cannot influence.
   */
  const isPlatform = user?.companyId === null
  const companies = useAsync(
    () => (isPlatform ? listCompanies() : Promise.resolve([])),
    [isPlatform]
  )

  const setValue = (id: string, value: string) => {
    setValues((v) => ({ ...v, [id]: value }))
    // Any edit invalidates a previous verdict — leaving "Connection successful"
    // on screen beside a changed host is worse than showing nothing.
    if (phase !== 'idle') {
      setPhase('idle')
      setFailure(null)
      setResult(null)
    }
  }

  const missing = fields.filter((f) => !values[f.id]?.trim()).map((f) => f.label)
  const canSubmit =
    missing.length === 0 && (!isPlatform || companyId !== '') && phase !== 'validating'

  const submit = async () => {
    setPhase('validating')
    setFailure(null)
    try {
      const created = await createConnection.mutateAsync({
        provider: connector.id,
        name: values.name?.trim() ?? '',
        host: values.host?.trim() ?? '',
        token: values.token ?? '',
        // Explicit, not left to the backend's default: the limit is part of
        // the query cache key, so the create response and the picker's first
        // request have to agree on it or the rows are cached twice.
        limit: DEFAULT_DATASET_LIMIT,
        ...(isPlatform ? { companyId: Number(companyId) } : {}),
      })
      /*
       * The token is dropped here, as soon as it has been exchanged. What is
       * left on screen is the connection's `secretHint` — the last four
       * characters the backend chose to return — and nothing more.
       */
      setValues((v) => ({ ...v, token: '' }))
      setResult(created)
      setPhase('connected')
    } catch (err) {
      setPhase('failed')
      setFailure(
        errorMessage(
          err,
          'The credential could not be validated. Check the instance address and the token, then try again.'
        )
      )
    }
  }

  return (
    <div className="rounded-lg border bg-card">
      <header className="flex items-center gap-3 border-b px-4 py-3">
        <span
          className={cn('flex size-8 items-center justify-center rounded-md', presentation.accentClass)}
        >
          <presentation.icon className="size-4" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{connector.name} connection</p>
          <p className="truncate text-xs text-muted-foreground">{connector.description}</p>
        </div>
        {connector.docsUrl ? (
          <a
            href={connector.docsUrl}
            target="_blank"
            rel="noreferrer noopener"
            className="text-xs text-primary underline-offset-4 hover:underline"
          >
            Where do I find this?
          </a>
        ) : null}
      </header>

      <div className="space-y-4 p-4">
        {isPlatform ? (
          <div className="space-y-1.5">
            <Label htmlFor="cred-company">Company</Label>
            <select
              id="cred-company"
              value={companyId}
              onChange={(e) => setCompanyId(e.target.value)}
              disabled={phase === 'validating' || phase === 'connected'}
              className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <option value="">Select a company…</option>
              {(companies.data ?? []).map((company) => (
                <option key={company.id} value={String(company.id)}>
                  {company.name}
                </option>
              ))}
            </select>
            <p className="text-xs text-muted-foreground">
              A connection belongs to one company. Platform accounts have none of their own, so
              this has to be stated.
            </p>
          </div>
        ) : null}

        {fields.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            This connector declares no credential fields. That is a backend configuration
            problem — a provider marked available must describe its own form.
          </p>
        ) : (
          fields.map((field) => (
            <div key={field.id} className="space-y-1.5">
              <Label htmlFor={`cred-${field.id}`}>
                {field.id === 'host' ? field.label || presentation.hostLabel : field.label}
              </Label>
              <Input
                id={`cred-${field.id}`}
                type={field.type === 'secret' ? 'password' : 'text'}
                value={values[field.id] ?? ''}
                placeholder={field.placeholder}
                onChange={(e) => setValue(field.id, e.target.value)}
                autoComplete={field.type === 'secret' ? 'off' : undefined}
                // Keeps a credential out of password managers and out of the
                // browser's own form history.
                {...(field.type === 'secret'
                  ? { spellCheck: false, 'data-1p-ignore': true, 'data-lpignore': 'true' }
                  : {})}
                disabled={phase === 'validating' || phase === 'connected'}
              />
              {field.help ? (
                <p className="text-xs text-muted-foreground">{field.help}</p>
              ) : null}
            </div>
          ))
        )}

        {phase === 'connected' && result ? (
          <div className="flex items-start gap-2.5 rounded-md border border-emerald-300 bg-emerald-50 p-3 text-sm dark:border-emerald-900 dark:bg-emerald-950/40">
            <CheckCircle2
              className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
              aria-hidden
            />
            <div className="min-w-0">
              <p className="font-medium text-emerald-800 dark:text-emerald-200">
                Connection successful
              </p>
              <p className="mt-0.5 text-emerald-700 dark:text-emerald-300">
                Connected to {result.connection.host}
                {result.account.accountName ? ` as ${result.account.accountName}` : ''}.
              </p>
              <p className="mt-1 text-xs text-emerald-700/80 dark:text-emerald-300/80">
                The token is stored encrypted by the backend and is not shown again.
              </p>
            </div>
          </div>
        ) : null}

        {phase === 'failed' && failure ? (
          <div
            role="alert"
            className="flex items-start gap-2.5 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm"
          >
            <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
            <div className="min-w-0">
              <p className="font-medium text-destructive">Connection failed</p>
              <p className="mt-0.5 text-muted-foreground">{failure}</p>
            </div>
          </div>
        ) : null}

        <p className="flex items-start gap-2 text-xs text-muted-foreground">
          <ShieldCheck className="mt-0.5 size-3.5 shrink-0" aria-hidden />
          Credentials are sent once to the backend, which validates and encrypts them. This
          application never stores the token in the browser.
        </p>
      </div>

      <footer className="flex items-center justify-between gap-3 border-t px-4 py-3">
        <Button variant="ghost" size="sm" onClick={onCancel}>
          Cancel
        </Button>

        {phase === 'connected' && result ? (
          <Button size="sm" onClick={() => onConnected(result)}>
            Continue
          </Button>
        ) : (
          <Button size="sm" onClick={submit} disabled={!canSubmit}>
            {phase === 'validating' ? (
              <>
                <Loader2 className="size-4 animate-spin" aria-hidden />
                Validating…
              </>
            ) : (
              'Test connection'
            )}
          </Button>
        )}
      </footer>
    </div>
  )
}
