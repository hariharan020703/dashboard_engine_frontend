import { useEffect, useState } from 'react'
import { CheckCircle2, RefreshCw } from 'lucide-react'
import { fetchHealth, type HealthStatus } from '@/api/adminApi'
import { PageHeader, Panel } from '@/ui/page'
import { actionButtonCls } from '@/ui/styles'

export default function PlatformSettingsPage() {
  const [health, setHealth] = useState<HealthStatus | null>(null)
  const [loading, setLoading] = useState(true)

  const [reloadToken, setReloadToken] = useState(0)
  const reload = () => {
    setLoading(true)
    setReloadToken((n) => n + 1)
  }

  useEffect(() => {
    let cancelled = false
    const run = async () => {
      try {
        const data = await fetchHealth()
        if (cancelled) return
        setHealth(data)
      } catch {
        if (cancelled) return
        setHealth(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    void run()
    return () => {
      cancelled = true
    }
  }, [reloadToken])

  return (
    <div className="p-6">
      <PageHeader
        title="Platform Settings & Configuration"
        description="Active runtime environment parameters, security controls, and infrastructure health."
        actions={
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className={actionButtonCls}
          >
            <RefreshCw size={14} className={loading ? 'animate-spin' : ''} />
            Check Health
          </button>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Panel title="System Status & Infrastructure">
          <dl className="grid gap-4 sm:grid-cols-2 text-xs">
            <div>
              <dt className="font-semibold uppercase tracking-wider text-slate-400">API Gateway</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-bold text-slate-800">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Operational
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-slate-400">RBAC Database</dt>
              <dd className="mt-1 flex items-center gap-1.5 font-bold text-slate-800">
                {health?.status === 'ok' ? (
                  <>
                    <CheckCircle2 size={14} className="text-emerald-600" />
                    Schema Synchronized
                  </>
                ) : (
                  <span className="text-amber-600">Initializing…</span>
                )}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-slate-400">Email Delivery Relay</dt>
              <dd className="mt-1 font-mono text-slate-700">
                {health?.email ? `Provider: ${health.email}` : 'Configured via SMTP'}
              </dd>
            </div>
            <div>
              <dt className="font-semibold uppercase tracking-wider text-slate-400">Primary Database</dt>
              <dd className="mt-1 font-mono text-slate-700">PostgreSQL 14+ (pg pool)</dd>
            </div>
          </dl>
        </Panel>

        {/* Authentication & Token Policy */}
        <Panel title="Authentication Architecture & Token Lifecycle">
          <div className="space-y-3 text-xs">
            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div>
                <span className="font-semibold text-slate-800">Access Token</span>
                <p className="text-[11px] text-slate-500">
                  Short-lived, held in memory (never localStorage).
                </p>
              </div>
              <span className="rounded bg-blue-50 px-2 py-0.5 font-mono font-bold text-blue-700">
                15 Minutes
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div>
                <span className="font-semibold text-slate-800">Refresh Token</span>
                <p className="text-[11px] text-slate-500">
                  Rotating HttpOnly cookie (`Path=/api/auth`, `SameSite=Strict`).
                </p>
              </div>
              <span className="rounded bg-indigo-50 px-2 py-0.5 font-mono font-bold text-indigo-700">
                30 Days
              </span>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-slate-100 bg-slate-50/50 p-3">
              <div>
                <span className="font-semibold text-slate-800">Activation Link TTL</span>
                <p className="text-[11px] text-slate-500">
                  Single-use onboarding link dispatched to user email.
                </p>
              </div>
              <span className="rounded bg-purple-50 px-2 py-0.5 font-mono font-bold text-purple-700">
                72 Hours
              </span>
            </div>
          </div>
        </Panel>

        {/* Security & Multi-Tenancy Boundary */}
        <Panel title="Multi-Tenant Isolation Guarantee">
          <ul className="space-y-2.5 text-xs text-slate-600">
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                <strong>Zero Trust in Frontend Headers:</strong> The tenant context is derived
                strictly server-side from the verified JWT identity.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                <strong>SQL-Enforced Tenant Filtering:</strong> All company queries apply
                mandatory parameterized filters (`company_id = ?`).
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                <strong>Probing Prevention:</strong> Cross-tenant resource lookups respond with
                HTTP 404 Resource Not Found rather than 403, preventing account enumeration.
              </span>
            </li>
            <li className="flex items-start gap-2">
              <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-600" />
              <span>
                <strong>No Silent Fallbacks:</strong> Missing tokens, missing tenant context, or
                invalid roles trigger explicit authentication errors.
              </span>
            </li>
          </ul>
        </Panel>

        {/* Query Engine & Analytics Specs */}
        <Panel title="Query Engine & Specification Runtime">
          <dl className="grid gap-3 sm:grid-cols-2 text-xs">
            <div>
              <dt className="text-slate-400 font-semibold uppercase tracking-wider">Engine Mode</dt>
              <dd className="mt-0.5 font-medium text-slate-800">Metadata-Driven JSON Specs</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase tracking-wider">Query Concurrency</dt>
              <dd className="mt-0.5 font-medium text-slate-800">6 Parallel Visual Queries Max</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase tracking-wider">Cache Layer</dt>
              <dd className="mt-0.5 font-medium text-slate-800">Redis Cache + In-Memory Fallback</dd>
            </div>
            <div>
              <dt className="text-slate-400 font-semibold uppercase tracking-wider">Default Schema</dt>
              <dd className="mt-0.5 font-mono text-slate-800">public</dd>
            </div>
          </dl>
        </Panel>
      </div>
    </div>
  )
}
