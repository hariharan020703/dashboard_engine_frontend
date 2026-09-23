import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { AlertTriangle, HelpCircle, Lightbulb, Sparkles } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ConfidenceMeter } from '../../components/primitives'
import type { UnderstandingBlock } from '../../types'

/**
 * The renderer for one piece of AI output.
 *
 * The backend decides what it produces and tags each piece with a `type`; this
 * switches on that tag and nothing else. No block's content is known here —
 * there is no expected metric name, no fallback definition, no placeholder
 * term. What the mockup shows as "Net revenue" or "Region" is whatever the
 * backend returned for that deployment's data.
 *
 * A type this frontend has never seen renders as a visible, labelled fallback
 * rather than being dropped. Silently discarding output is how a backend team
 * ships a new block type and cannot work out why it never appears.
 */

export function BlockRenderer({ block }: { block: UnderstandingBlock }) {
  switch (block.type) {
    case 'text':
      return (
        <Card title={block.title}>
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{block.body}</p>
        </Card>
      )

    case 'markdown':
      return (
        <Card title={block.title}>
          <div className="prose prose-sm dark:prose-invert max-w-none [&_table]:text-xs">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{block.body}</ReactMarkdown>
          </div>
        </Card>
      )

    case 'insight':
      return (
        <Card
          title={block.title}
          icon={<Sparkles className="size-4 text-violet-500" aria-hidden />}
          accent="violet"
          trailing={<ConfidenceMeter value={block.confidence} />}
        >
          <p className="text-sm leading-relaxed">{block.body}</p>
        </Card>
      )

    case 'recommendation':
      return (
        <Card
          title={block.title ?? 'Recommendation'}
          icon={<Lightbulb className="size-4 text-emerald-500" aria-hidden />}
          accent="emerald"
        >
          <p className="text-sm leading-relaxed">{block.body}</p>
        </Card>
      )

    case 'warning':
      return (
        <Card
          title={block.title ?? 'Warning'}
          icon={<AlertTriangle className="size-4 text-amber-500" aria-hidden />}
          accent="amber"
        >
          <p className="text-sm leading-relaxed">{block.body}</p>
        </Card>
      )

    case 'metric':
      return (
        <Card title={block.name} trailing={<ConfidenceMeter value={block.confidence} />}>
          {block.description ? (
            <p className="text-sm text-muted-foreground">{block.description}</p>
          ) : null}
          {block.formula ? (
            <pre className="mt-2 overflow-x-auto rounded-md bg-muted px-3 py-2 font-mono text-xs">
              {block.formula}
            </pre>
          ) : null}
          {block.unit ? (
            <p className="mt-2 text-xs text-muted-foreground">Unit: {block.unit}</p>
          ) : null}
        </Card>
      )

    case 'definition':
      return (
        <Card title={block.name} trailing={<ConfidenceMeter value={block.confidence} />}>
          <p className="text-sm leading-relaxed">{block.definition}</p>
          {block.source ? (
            <p className="mt-2 text-xs text-muted-foreground">Source: {block.source}</p>
          ) : null}
        </Card>
      )

    case 'entity':
      return (
        <Card title={block.name} trailing={<ConfidenceMeter value={block.confidence} />}>
          {block.description ? (
            <p className="text-sm text-muted-foreground">{block.description}</p>
          ) : null}
          {block.attributes?.length ? (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {block.attributes.map((attribute) => (
                <span
                  key={attribute}
                  className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs"
                >
                  {attribute}
                </span>
              ))}
            </div>
          ) : null}
        </Card>
      )

    case 'dimension':
      return (
        <Card title={block.name} trailing={<ConfidenceMeter value={block.confidence} />}>
          {block.description ? (
            <p className="text-sm text-muted-foreground">{block.description}</p>
          ) : null}
          {block.hierarchy?.length ? (
            <p className="mt-2 font-mono text-xs text-muted-foreground">
              {block.hierarchy.join(' → ')}
            </p>
          ) : null}
        </Card>
      )

    case 'list':
      return (
        <Card title={block.title}>
          {block.ordered ? (
            <ol className="list-decimal space-y-1 pl-5 text-sm">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ol>
          ) : (
            <ul className="list-disc space-y-1 pl-5 text-sm">
              {block.items.map((item, i) => (
                <li key={i}>{item}</li>
              ))}
            </ul>
          )}
        </Card>
      )

    case 'key-value':
      return (
        <Card title={block.title}>
          <dl className="grid gap-x-4 gap-y-1.5 sm:grid-cols-[minmax(0,auto)_minmax(0,1fr)]">
            {block.pairs.map((pair, i) => (
              <div key={i} className="contents">
                <dt className="text-sm text-muted-foreground">{pair.key}</dt>
                <dd className="text-sm font-medium">{pair.value}</dd>
              </div>
            ))}
          </dl>
        </Card>
      )

    case 'table':
      return (
        <Card title={block.title} padded={false}>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-xs text-muted-foreground">
                <tr className="border-b">
                  {block.columns.map((column) => (
                    <th
                      key={column}
                      scope="col"
                      className="whitespace-nowrap px-3 py-2 text-left font-medium"
                    >
                      {column}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y">
                {block.rows.map((row, i) => (
                  <tr key={i}>
                    {row.map((cell, j) => (
                      <td key={j} className="px-3 py-2">
                        {cell === null ? (
                          <span className="text-muted-foreground">—</span>
                        ) : (
                          String(cell)
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )

    default:
      return <UnsupportedBlock block={block} />
  }
}

/**
 * A block type this build does not know how to draw.
 *
 * Shown rather than skipped, with its payload available, so a new backend block
 * type is visibly unhandled instead of invisibly missing.
 */
function UnsupportedBlock({ block }: { block: UnknownBlock }) {
  return (
    <Card
      title="Unsupported content"
      icon={<HelpCircle className="size-4 text-muted-foreground" aria-hidden />}
    >
      <p className="text-sm text-muted-foreground">
        The backend returned a block of type{' '}
        <code className="rounded bg-muted px-1 py-0.5 font-mono text-xs">
          {String(block.type)}
        </code>
        , which this version of the app cannot render.
      </p>
      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-muted-foreground">Show payload</summary>
        <pre className="mt-1.5 max-h-56 overflow-auto rounded bg-muted p-2 font-mono text-xs">
          {JSON.stringify(block, null, 2)}
        </pre>
      </details>
    </Card>
  )
}

/** Narrow escape hatch for the default branch, where the union is exhausted. */
type UnknownBlock = { type: string } & Record<string, unknown>

function Card({
  title,
  icon,
  trailing,
  accent,
  padded = true,
  children,
}: {
  title?: string | null
  icon?: React.ReactNode
  trailing?: React.ReactNode
  accent?: 'violet' | 'emerald' | 'amber'
  padded?: boolean
  children: React.ReactNode
}) {
  return (
    <article
      className={cn(
        'rounded-lg border bg-card',
        accent === 'violet' && 'border-l-2 border-l-violet-400',
        accent === 'emerald' && 'border-l-2 border-l-emerald-400',
        accent === 'amber' && 'border-l-2 border-l-amber-400'
      )}
    >
      {title || trailing ? (
        <header className="flex items-center gap-2 border-b px-3.5 py-2.5">
          {icon}
          {title ? <h4 className="min-w-0 truncate text-sm font-medium">{title}</h4> : null}
          {trailing ? <div className="ml-auto shrink-0">{trailing}</div> : null}
        </header>
      ) : null}
      <div className={cn(padded && 'px-3.5 py-3')}>{children}</div>
    </article>
  )
}
