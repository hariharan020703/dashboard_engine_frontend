import { CheckCircle2, RefreshCw, ShieldCheck } from 'lucide-react'
import { fetchPlatformSettings } from '@/api/platformApi'
import { fetchHealth } from '@/api/workspaceApi'
import { useAsync } from '@/hooks/useAsync'
import { Page, PageHeader, Section } from '@/components/common/Page'
import { CardGridSkeleton, ErrorState } from '@/components/common/States'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'

/** Seconds as the unit a person would say out loud. */
function duration(seconds: number): string {
  if (seconds % 86400 === 0) {
    const days = seconds / 86400
    return `${days} ${days === 1 ? 'day' : 'days'}`
  }
  if (seconds % 3600 === 0) {
    const hours = seconds / 3600
    return `${hours} ${hours === 1 ? 'hour' : 'hours'}`
  }
  if (seconds % 60 === 0) {
    const minutes = seconds / 60
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`
  }
  return `${seconds} seconds`
}

function Row({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-border py-3 last:border-0">
      <div className="min-w-0">
        <p className="text-sm text-foreground">{label}</p>
        {hint && <p className="mt-0.5 text-xs text-muted-foreground">{hint}</p>}
      </div>
      <p className="shrink-0 text-sm font-medium tabular-nums text-foreground">{value}</p>
    </div>
  )
}

/**
 * How this deployment is configured.
 *
 * Every value is read from the running process through /api/platform/settings.
 * The previous version of this screen printed the same numbers as literals in
 * the markup, which made it a description of what the configuration was on the
 * day the page was written - and a settings page that can be wrong is worse
 * than no settings page.
 *
 * It is read-only, and that is honest: these are product decisions that live in
 * source (token lifetimes, throttling) or in the environment (the mail relay).
 * There is no backend endpoint that changes them, so there is no form here
 * pretending otherwise.
 */
export default function PlatformSettingsPage() {
  const settings = useAsync(() => fetchPlatformSettings(), [])
  const health = useAsync(() => fetchHealth(), [])

  const reloadAll = () => {
    settings.reload()
    health.reload()
  }

  return (
    <Page>
      <PageHeader
        title="Settings"
        description="How this deployment is configured, read from the running service."
        actions={
          <Button
            variant="outline"
            onClick={reloadAll}
            disabled={settings.loading || health.loading}
          >
            <RefreshCw
              className={settings.loading || health.loading ? 'animate-spin' : undefined}
              aria-hidden
            />
            Refresh
          </Button>
        }
      />

      {settings.error ? (
        <Section>
          <ErrorState
            error={settings.error}
            title="Unable to read the configuration"
            onRetry={settings.reload}
          />
        </Section>
      ) : settings.loading || !settings.data ? (
        <CardGridSkeleton count={4} />
      ) : (
        <div className="grid gap-6 lg:grid-cols-2">
          <Section title="Service">
            <div className="-mt-3">
              <Row
                label="Status"
                value={
                  health.error
                    ? 'Unreachable'
                    : health.loading
                      ? 'Checking…'
                      : health.data?.status === 'ok'
                        ? 'Serving'
                        : 'Starting'
                }
                hint={health.data?.detail ?? undefined}
              />
              <Row
                label="Mail transport"
                value={settings.data.email.provider.toUpperCase()}
                hint={`Sending as ${settings.data.email.from}`}
              />
              <Row
                label="Dashboards in the registry"
                value={String(settings.data.engine.dashboardCount)}
              />
              <Row
                label="Queries per dashboard request"
                value={String(settings.data.engine.queryConcurrency)}
                hint="How many of a dashboard's cards are queried at once."
              />
            </div>
          </Section>

          <Section title="Sessions">
            <div className="-mt-3">
              <Row
                label="Access token"
                value={duration(settings.data.tokens.accessTokenTtlSeconds)}
                hint="Short-lived and held in memory. Nothing can revoke one before it expires, which is why it is measured in minutes."
              />
              <Row
                label="Stay signed in for"
                value={duration(settings.data.tokens.refreshTokenTtlSeconds)}
                hint="An HttpOnly cookie, rotated on every use and revocable."
              />
              <Row
                label="Activation link"
                value={duration(settings.data.tokens.activationTokenTtlSeconds)}
                hint="Single-use regardless of how long it has left."
              />
              <Row
                label="Cookie"
                value={`${settings.data.session.cookieSecure ? 'Secure' : 'Not secure'} · SameSite=${settings.data.session.cookieSameSite}`}
                hint={
                  settings.data.session.cookieSecure
                    ? undefined
                    : 'Only appropriate for local development over plain http.'
                }
              />
            </div>
          </Section>

          <Section title="Passwords and sign-in">
            <div className="-mt-3">
              <Row
                label="Minimum password length"
                value={`${settings.data.password.minLength} characters`}
              />
              <Row label="Hashing cost" value={`bcrypt, ${settings.data.password.bcryptRounds} rounds`} />
              <Row
                label="Failed attempts allowed"
                value={`${settings.data.login.maxAttempts} in ${duration(settings.data.login.windowSeconds)}`}
              />
              <Row
                label="Lockout"
                value={duration(settings.data.login.lockoutSeconds)}
                hint="Counted per account and self-clearing, so nobody can lock a colleague out for long."
              />
            </div>
          </Section>

          <Section title="Tenant isolation">
            <p className="mb-3 flex items-center gap-2 text-sm">
              <ShieldCheck className="size-4 text-success" aria-hidden />
              <span className="text-foreground">Enforced server-side on every request.</span>
            </p>
            <ul className="space-y-2.5 text-sm text-muted-foreground">
              {[
                'The company is derived from the verified identity, never from the request. A companyId sent by a client is ignored rather than validated.',
                'Every company-scoped query filters on company_id as a bound parameter.',
                'A resource in another company answers 404, not 403, so an id cannot be used to discover what exists.',
                'A missing token, company or role fails explicitly. There is no fallback identity and no default company.',
              ].map((line) => (
                <li key={line} className="flex items-start gap-2">
                  <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-success" aria-hidden />
                  <span>{line}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-xs text-muted-foreground">
              These are properties of the API, not switches.{' '}
              <Badge variant="outline" className="ml-0.5">
                Not configurable
              </Badge>
            </p>
          </Section>
        </div>
      )}
    </Page>
  )
}
