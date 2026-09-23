import { Database } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { Connector, CredentialField } from '../types'

/**
 * Provider-specific behaviour, in one place.
 *
 * The connector LIST is not here — it comes from the backend
 * (`GET /context/connectors`), which is also what refuses a provider that is
 * not built. Duplicating that list client-side would let the two disagree
 * about what is connectable, and the one that matters is the server's.
 *
 * What is here is the presentation and behaviour a provider needs that an API
 * response should not carry: its icon, its accent, and the hooks for anything
 * that genuinely differs between providers. The alternative — `if (provider ===
 * 'domo')` scattered through the connect form, the dataset table and the
 * profile header — is what makes adding Snowflake a rewrite instead of an
 * entry.
 *
 * Adding a provider: one entry below, and flip its `status` to `available` in
 * the backend's connectorCatalogue.js. No component changes.
 */

export interface ConnectorPresentation {
  /** Matches `Connector.id` from the API. */
  id: string
  /** Tailwind classes for the tile's icon chip. */
  accentClass: string
  /** Short label under the name in the gallery, when the API has no description. */
  tagline: string
  icon: LucideIcon
  /**
   * What the connect form calls the host field for this provider. Domo issues
   * a token per instance, so "Domo instance" is meaningfully different from
   * "Account URL" — and the field's own `label` from the API takes precedence
   * over this when it has one.
   */
  hostLabel: string
}

const PRESENTATION: Record<string, ConnectorPresentation> = {
  domo: {
    id: 'domo',
    accentClass: 'bg-sky-50 text-sky-600 dark:bg-sky-950/50 dark:text-sky-400',
    tagline: 'Connect with an access token',
    icon: Database,
    hostLabel: 'Domo instance',
  },
  snowflake: {
    id: 'snowflake',
    accentClass: 'bg-cyan-50 text-cyan-600 dark:bg-cyan-950/50 dark:text-cyan-400',
    tagline: 'Account, database, key pair',
    icon: Database,
    hostLabel: 'Account URL',
  },
  databricks: {
    id: 'databricks',
    accentClass: 'bg-orange-50 text-orange-600 dark:bg-orange-950/50 dark:text-orange-400',
    tagline: 'Workspace URL and token',
    icon: Database,
    hostLabel: 'Workspace URL',
  },
  bigquery: {
    id: 'bigquery',
    accentClass: 'bg-blue-50 text-blue-600 dark:bg-blue-950/50 dark:text-blue-400',
    tagline: 'Project and service account',
    icon: Database,
    hostLabel: 'Project',
  },
  redshift: {
    id: 'redshift',
    accentClass: 'bg-violet-50 text-violet-600 dark:bg-violet-950/50 dark:text-violet-400',
    tagline: 'Cluster and credentials',
    icon: Database,
    hostLabel: 'Cluster endpoint',
  },
  postgres: {
    id: 'postgres',
    accentClass: 'bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400',
    tagline: 'Host, database and role',
    icon: Database,
    hostLabel: 'Host',
  },
}

/** Presentation for a provider id, with a neutral default for one we have never seen. */
export function connectorPresentation(id: string): ConnectorPresentation {
  return (
    PRESENTATION[id] ?? {
      id,
      accentClass: 'bg-muted text-muted-foreground',
      tagline: 'Data source',
      icon: Database,
      hostLabel: 'Host',
    }
  )
}

/** The single test for "can this be configured". Nothing compares an id to 'domo'. */
export function isConnectable(connector: Pick<Connector, 'status'>): boolean {
  return connector.status === 'available'
}

/**
 * The credential fields to render, ordered.
 *
 * The backend describes its own form, which is what keeps the two from
 * disagreeing about which fields exist. This only guards against a provider
 * marked available with nothing declared — a configuration mistake worth
 * surfacing as an empty form rather than a crash.
 */
export function credentialFields(connector: Connector): CredentialField[] {
  return Array.isArray(connector.credentials) ? connector.credentials : []
}

/** Groups the gallery the way the mockup does, without hardcoding membership. */
export function connectorGroups(connectors: Connector[]) {
  const available = connectors.filter(isConnectable)
  const planned = connectors.filter((c) => !isConnectable(c))
  return { available, planned }
}
