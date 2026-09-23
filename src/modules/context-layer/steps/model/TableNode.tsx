import { memo } from 'react'
import { Handle, Position } from '@xyflow/react'
import type { NodeProps } from '@xyflow/react'
import { cn } from '@/lib/utils'
import type { ModelNode } from '../../types'

/**
 * One table on the relationship canvas.
 *
 * Renders whatever columns the backend attached to the node, capped so a wide
 * table does not become a tall ribbon that makes the rest of the graph
 * unreadable — the full column list belongs in the detail panel, not on the
 * canvas.
 *
 * `kind` only chooses an accent colour. It is the backend's own classification
 * and is not interpreted: an unfamiliar value renders neutrally rather than
 * being coerced into "fact" or "dimension".
 */

const MAX_VISIBLE_COLUMNS = 7

export type TableNodeData = {
  node: ModelNode
  highlighted: boolean
}

function TableNodeImpl({ data, selected }: NodeProps) {
  const { node, highlighted } = data as TableNodeData
  const visible = node.columns.slice(0, MAX_VISIBLE_COLUMNS)
  const overflow = node.columns.length - visible.length

  return (
    <div
      className={cn(
        'w-56 overflow-hidden rounded-lg border bg-card shadow-sm transition-all',
        selected && 'ring-2 ring-primary',
        highlighted && !selected && 'ring-1 ring-primary/50',
        !selected && !highlighted && 'opacity-95'
      )}
    >
      {/*
        Handles on both sides so an edge can attach whichever way the layout
        puts two tables, rather than routing around a node to reach one side.
      */}
      <Handle type="target" position={Position.Left} className="!size-2 !border-2 !bg-background" />
      <Handle type="source" position={Position.Right} className="!size-2 !border-2 !bg-background" />

      <header
        className={cn(
          'flex items-center gap-1.5 border-b px-2.5 py-1.5',
          node.kind === 'fact' && 'bg-violet-50 dark:bg-violet-950/40',
          node.kind === 'dimension' && 'bg-sky-50 dark:bg-sky-950/40',
          node.kind !== 'fact' && node.kind !== 'dimension' && 'bg-muted/50'
        )}
      >
        <span
          className={cn(
            'size-1.5 shrink-0 rounded-full',
            node.kind === 'fact' && 'bg-violet-500',
            node.kind === 'dimension' && 'bg-sky-500',
            node.kind !== 'fact' && node.kind !== 'dimension' && 'bg-muted-foreground'
          )}
          aria-hidden
        />
        <p className="min-w-0 flex-1 truncate text-xs font-semibold">{node.label}</p>
      </header>

      <ul className="divide-y text-[11px]">
        {visible.map((column) => (
          <li key={column.name} className="flex items-center gap-1.5 px-2.5 py-1">
            <span className="min-w-0 flex-1 truncate font-mono">{column.name}</span>
            {column.isPrimaryKey ? (
              <span className="shrink-0 rounded bg-amber-100 px-1 text-[9px] font-semibold text-amber-800 dark:bg-amber-950 dark:text-amber-300">
                PK
              </span>
            ) : null}
            {column.isForeignKey ? (
              <span className="shrink-0 rounded bg-sky-100 px-1 text-[9px] font-semibold text-sky-800 dark:bg-sky-950 dark:text-sky-300">
                FK
              </span>
            ) : null}
          </li>
        ))}
        {overflow > 0 ? (
          <li className="px-2.5 py-1 text-[11px] italic text-muted-foreground">
            +{overflow} more
          </li>
        ) : null}
        {node.columns.length === 0 ? (
          <li className="px-2.5 py-1 text-[11px] italic text-muted-foreground">
            No columns reported
          </li>
        ) : null}
      </ul>
    </div>
  )
}

export const TableNode = memo(TableNodeImpl)
