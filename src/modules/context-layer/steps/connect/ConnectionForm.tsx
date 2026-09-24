import { useState } from 'react'
import type { ReactNode } from 'react'
import {
  AlertCircle,
  ArrowRight,
  CheckCircle2,
  ExternalLink,
  Loader2,
  ShieldCheck,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { errorMessage } from '@/api/http'
import { useAsync } from '@/hooks/useAsync'
import { listCompanyOptions } from '@/api/platformApi'
import { useAuth } from '@/context/authContext'
import { cn } from '@/lib/utils'
import type { Connector, CreatedConnection } from '../../types'
import { credentialFields, connectorPresentation } from '../../connectors/registry'
import { DEFAULT_DATASET_LIMIT } from '../../config'
import { useCreateConnection } from '../../queries/hooks'

/**
 * The credential dialog, rendered from the connector's own field list.
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
    () => (isPlatform ? listCompanyOptions() : Promise.resolve([])),
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

  /** Fields are read-only once a credential has been accepted, and while checking. */
  const locked = phase === 'validating' || phase === 'connected'

  /*
   * A dialog rather than a panel below the gallery.
   *
   * Inline, the form sat under a grid of other connectors that all still
   * looked clickable, so the thing being configured was whichever tile you
   * last pressed — stated only by a highlight some distance above the fields.
   * A modal names it in the title and takes the choice off the table.
   *
   * One field per row, with generous gutters. The alternative — pairing the
   * short fields two to a row — fitted more into less height, but it made the
   * form read as a grid to be scanned rather than a sequence to be worked
   * through.
   *
   * Padding is ONE knob: `p-6` on the dialog. The header, body and footer
   * carry no horizontal padding of their own, so changing that single value
   * moves everything together. An earlier version tinted the header and footer
   * edge to edge, which looked good but forced the dialog to `p-0` and pushed
   * every gutter into three places that then had to agree.
   *
   * Dismissal is routed through `onCancel` rather than handled internally, so
   * Escape, the close button and the overlay all do exactly what Cancel does —
   * including clearing the chosen connector in the step above.
   */
  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="gap-0 overflow-hidden p-6 sm:max-w-lg">
        {/* pr-8 keeps the title clear of the dialog's own close button. */}
        <DialogHeader className="flex-row items-center gap-3.5 space-0 text-left">
          <span
            className={cn(
              'flex size-10 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ring-black/5 dark:ring-white/10',
              presentation.accentClass
            )}
          >
            <presentation.icon className="size-5" aria-hidden />
          </span>
          <div className="min-w-0 flex-1">
            <DialogTitle className="text-base font-semibold leading-tight">
              Connect {connector.name}
            </DialogTitle>
            <DialogDescription className="mt-1 line-clamp-1 text-xs leading-relaxed">
              {connector.description}
            </DialogDescription>
          </div>
        </DialogHeader>

        {/*
          The body, and the one place a scrollbar may ever appear.

          Stacked with this much air the form runs to roughly 580px, which fits
          any normal window without one. But `overflow-hidden` on the dialog
          clips rather than scrolls, so on a short viewport — a laptop with the
          console open, or a 768px screen with an error banner showing — the
          footer would be cut off and the Connect button unreachable. Bounding
          the body instead keeps the header and footer always visible: no
          scrollbar in practice, and a reachable button when there would
          otherwise be none.

          `py-6` here is the gap to the header above and the footer below; the
          side gutters come from the dialog's own padding.
        */}
        <div className="max-h-[calc(100vh-15rem)] space-y-6 overflow-y-auto py-6">
          {isPlatform ? (
            <Field
              id="cred-company"
              label="Company"
              help="A connection belongs to one company. Platform accounts have none of their own."
            >
              <select
                id="cred-company"
                value={companyId}
                onChange={(e) => setCompanyId(e.target.value)}
                disabled={locked}
                className="flex h-10 w-full rounded-md border border-input bg-transparent px-3 text-sm shadow-xs outline-none transition-colors focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                <option value="">Select a company…</option>
                {(companies.data ?? []).map((company) => (
                  <option key={company.id} value={String(company.id)}>
                    {company.name}
                  </option>
                ))}
              </select>
            </Field>
          ) : null}

          {fields.length === 0 ? (
            <p className="rounded-lg border border-dashed px-3 py-8 text-center text-sm text-muted-foreground">
              This connector declares no credential fields. That is a backend configuration
              problem — a provider marked available must describe its own form.
            </p>
          ) : (
            /*
             * One field per row, in the order the connector declares them.
             *
             * Pairing the short ones two to a row fitted more into less height,
             * but it made the form read as a grid to be scanned rather than a
             * sequence to be worked through — and the order a provider declares
             * its credentials in is usually the order they are gathered.
             */
            <div className="space-y-6">
              {fields.map((field) => (
                <Field
                  key={field.id}
                  id={`cred-${field.id}`}
                  label={
                    field.id === 'host' ? field.label || presentation.hostLabel : field.label
                  }
                  help={field.help}
                  /* The docs link belongs beside the credential it explains. */
                  action={
                    field.type === 'secret' && connector.docsUrl ? (
                      <a
                        href={connector.docsUrl}
                        target="_blank"
                        rel="noreferrer noopener"
                        className="inline-flex items-center gap-1 text-xs text-primary underline-offset-4 hover:underline"
                      >
                        Where do I find this?
                        <ExternalLink className="size-3" aria-hidden />
                      </a>
                    ) : null
                  }
                >
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
                      ? {
                          spellCheck: false,
                          'data-1p-ignore': true,
                          'data-lpignore': 'true',
                          className: 'h-10 font-mono tracking-wide',
                        }
                      : { className: 'h-10' })}
                    disabled={locked}
                  />
                </Field>
              ))}
            </div>
          )}

          {phase === 'connected' && result ? (
            <div className="flex items-start gap-3 rounded-lg border border-emerald-300 bg-emerald-50 px-3.5 py-3 dark:border-emerald-900 dark:bg-emerald-950/40">
              <CheckCircle2
                className="mt-0.5 size-4 shrink-0 text-emerald-600 dark:text-emerald-400"
                aria-hidden
              />
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-medium text-emerald-800 dark:text-emerald-200">
                  Connection successful
                </p>
                <p className="truncate text-emerald-700 dark:text-emerald-300">
                  {result.connection.host}
                  {result.account.accountName ? ` · ${result.account.accountName}` : ''}
                </p>
                <p className="text-xs text-emerald-700/80 dark:text-emerald-300/80">
                  The token is stored encrypted and is not shown again.
                </p>
              </div>
            </div>
          ) : null}

          {phase === 'failed' && failure ? (
            <div
              role="alert"
              className="flex items-start gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3.5 py-3"
            >
              <AlertCircle className="mt-0.5 size-4 shrink-0 text-destructive" aria-hidden />
              <div className="min-w-0 space-y-0.5 text-sm">
                <p className="font-medium text-destructive">Connection failed</p>
                <p className="text-muted-foreground">{failure}</p>
              </div>
            </div>
          ) : null}
        </div>

        <DialogFooter className="flex-row items-center gap-3 border-t pt-4 sm:justify-between">
          {/*
            The security note sits in the footer rather than above the buttons:
            it is reassurance, not an instruction, and it was taking a full row
            of height in the middle of the form to say so. Hidden on a narrow
            screen, where that row is the difference between fitting and not.
          */}
          <p className="hidden items-center gap-1.5 text-xs text-muted-foreground sm:flex">
            <ShieldCheck className="size-3.5 shrink-0" aria-hidden />
            Sent once, encrypted by the backend, never stored in the browser.
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Button variant="ghost" size="sm" onClick={onCancel}>
              Cancel
            </Button>

            {phase === 'connected' && result ? (
              <Button size="sm" onClick={() => onConnected(result)}>
                Continue
                <ArrowRight className="size-4" aria-hidden />
              </Button>
            ) : (
              <Button size="sm" onClick={submit} disabled={!canSubmit}>
                {phase === 'validating' ? (
                  <>
                    <Loader2 className="size-4 animate-spin" aria-hidden />
                    Validating…
                  </>
                ) : (
                  'Connect'
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

/**
 * One labelled field, with its help text and an optional action beside the label.
 *
 * Collected into a component so every field has identical spacing and the same
 * relationship between label, control and help — which is most of what makes a
 * form of mixed field types read as deliberate rather than assembled.
 */
function Field({
  id,
  label,
  help,
  action,
  className,
  children,
}: {
  id: string
  label: string
  help?: string
  action?: ReactNode
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id} className="text-sm font-medium">
          {label}
        </Label>
        {action}
      </div>
      {children}
      {help ? (
        <p className="text-xs leading-relaxed text-muted-foreground">{help}</p>
      ) : null}
    </div>
  )
}
