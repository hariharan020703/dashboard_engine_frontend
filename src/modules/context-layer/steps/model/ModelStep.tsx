import { useCallback, useEffect, useMemo, useState } from 'react'
import {
  Background,
  ConnectionMode,
  Controls,
  MiniMap,
  ReactFlow,
  ReactFlowProvider,
  useEdgesState,
  useNodesState,
} from '@xyflow/react'
import type { Edge, Node } from '@xyflow/react'
import '@xyflow/react/dist/style.css'
import { Check, Loader2, RefreshCw, Sparkles, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { notify } from '@/components/common/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '../../components/StepFrame'
import {
  EmptyState,
  ErrorState,
  NoConnectionState,
  QueryBoundary,
  TableSkeleton,
} from '../../components/DataStates'
import { AiBadge, ConfidenceMeter, StatusBadge } from '../../components/primitives'
import { formatRelativeTime, formatText } from '../../components/format'
import { endpoints } from '../../api'
import {
  useDeleteRelationship,
  useGenerateModel,
  useModel,
  useUpdateRelationship,
} from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { ModelEdge, ModelGraph } from '../../types'
import { TableNode } from './TableNode'
import { autoLayout } from './layout'

/**
 * Step 5 — Model.
 *
 * The graph is the backend's. Nodes, edges, join conditions, relationship types
 * and confidences all arrive from `GET .../model`; the canvas draws them and
 * lets somebody accept, reject, edit or delete a relationship.
 *
 * It is built to work at any size. Positions come from `autoLayout` unless the
 * backend saved one, the node component caps its own column list, and zoom, pan
 * and fit-to-screen come from the graph library rather than being approximated
 * — which is what stops this being a picture that only makes sense for three
 * example tables.
 */

const nodeTypes = { table: TableNode }

export function ModelStep() {
  const { connectionId, goToStep } = useWorkflow()
  const model = useModel(connectionId)
  const generate = useGenerateModel(connectionId)

  if (!connectionId) {
    return (
      <StepFrame title="Model relationships" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const runGeneration = async () => {
    try {
      await generate.mutateAsync()
      notify.success('Relationship detection started.')
    } catch (err) {
      notify.failure('start relationship detection', err)
    }
  }

  return (
    <StepFrame
      title="Model relationships"
      description="Relationships the backend detected between your tables. Review each one before it becomes part of the context."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={runGeneration}
          disabled={generate.isPending || model.data?.status === 'generating'}
        >
          {generate.isPending || model.data?.status === 'generating' ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <RefreshCw className="size-4" aria-hidden />
          )}
          {model.data?.generatedAt ? 'Re-detect' : 'Detect'}
        </Button>
      }
      footerNote={
        model.data?.generatedAt
          ? `Detected ${formatRelativeTime(model.data.generatedAt)}`
          : undefined
      }
    >
      <QueryBoundary
        query={model}
        step="Model"
        endpoint={`GET ${endpoints.model(connectionId)}`}
        context="load the data model"
        loading={<TableSkeleton rows={6} columns={4} />}
      >
        {(data) => (
          <ReactFlowProvider>
            <ModelCanvas graph={data} connectionId={connectionId} onGenerate={runGeneration} />
          </ReactFlowProvider>
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function ModelCanvas({
  graph,
  connectionId,
  onGenerate,
}: {
  graph: ModelGraph
  connectionId: string
  onGenerate: () => void
}) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const updateRelationship = useUpdateRelationship(connectionId)
  const deleteRelationship = useDeleteRelationship(connectionId)

  /* Backend graph -> React Flow's shape. Recomputed when the backend data changes. */
  const initialNodes = useMemo<Node[]>(() => {
    const positions = new Map(autoLayout(graph.nodes, graph.edges).map((p) => [p.id, p.position]))
    return graph.nodes.map((node) => ({
      id: node.id,
      type: 'table',
      position: positions.get(node.id) ?? { x: 0, y: 0 },
      data: { node, highlighted: false },
    }))
  }, [graph.nodes, graph.edges])

  const initialEdges = useMemo<Edge[]>(
    () =>
      graph.edges
        // A rejected suggestion stays rejected server-side but is not drawn —
        // it would otherwise clutter the canvas with decisions already made.
        .filter((edge) => edge.status !== 'rejected')
        .map((edge) => ({
          id: edge.id,
          source: edge.source,
          target: edge.target,
          label: edge.relationshipType,
          animated: edge.status === 'suggested',
          style: {
            strokeDasharray: edge.status === 'suggested' ? '4 3' : undefined,
          },
          labelStyle: { fontSize: 10 },
          data: { edge },
        })),
    [graph.edges]
  )

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes)
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges)

  // Re-seed when the backend sends a new graph (a re-detection run, an accept).
  useEffect(() => setNodes(initialNodes), [initialNodes, setNodes])
  useEffect(() => setEdges(initialEdges), [initialEdges, setEdges])

  const selectedEdge = useMemo(
    () => graph.edges.find((e) => e.id === selectedEdgeId) ?? null,
    [graph.edges, selectedEdgeId]
  )

  /* Highlight the two tables an inspected relationship joins. */
  useEffect(() => {
    setNodes((current) =>
      current.map((node) => ({
        ...node,
        data: {
          ...(node.data as { node: unknown }),
          highlighted:
            Boolean(selectedEdge) &&
            (node.id === selectedEdge!.source || node.id === selectedEdge!.target),
        },
      })) as Node[]
    )
  }, [selectedEdge, setNodes])

  const onEdgeClick = useCallback((_: unknown, edge: Edge) => setSelectedEdgeId(edge.id), [])

  const decide = async (edge: ModelEdge, status: 'accepted' | 'rejected') => {
    try {
      await updateRelationship.mutateAsync({ id: edge.id, body: { status } })
      notify.success(status === 'accepted' ? 'Relationship accepted.' : 'Relationship rejected.')
      if (status === 'rejected') setSelectedEdgeId(null)
    } catch (err) {
      notify.failure(`${status === 'accepted' ? 'accept' : 'reject'} the relationship`, err)
    }
  }

  const remove = async (edge: ModelEdge) => {
    try {
      await deleteRelationship.mutateAsync(edge.id)
      setSelectedEdgeId(null)
      notify.success('Relationship deleted.')
    } catch (err) {
      notify.failure('delete the relationship', err)
    }
  }

  if (graph.status === 'generating') {
    return (
      <div className="flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-16 text-center">
        <Loader2 className="mb-4 size-6 animate-spin text-primary" aria-hidden />
        <p className="text-sm font-medium">Detecting relationships</p>
        <p className="mt-1 text-sm text-muted-foreground">
          This screen updates on its own when the run finishes.
        </p>
      </div>
    )
  }

  if (graph.status === 'failed') {
    return (
      <ErrorState
        context="detect relationships"
        error={new Error(graph.error ?? 'Detection did not complete.')}
        onRetry={onGenerate}
      />
    )
  }

  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        title="No model yet"
        detail="Run detection to find relationships between the tables you profiled."
        action={
          <Button size="sm" onClick={onGenerate}>
            <Sparkles className="size-4" aria-hidden />
            Detect relationships
          </Button>
        }
      />
    )
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="h-[560px] overflow-hidden rounded-lg border bg-muted/20">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onEdgeClick={onEdgeClick}
          onPaneClick={() => setSelectedEdgeId(null)}
          nodeTypes={nodeTypes}
          connectionMode={ConnectionMode.Loose}
          fitView
          // Stops a large graph zooming in so far that a single table fills
          // the pane, and so far out that nothing is legible.
          minZoom={0.1}
          maxZoom={1.75}
          proOptions={{ hideAttribution: false }}
        >
          <Background gap={16} />
          <Controls showInteractive={false} />
          <MiniMap pannable zoomable className="!bg-background" />
        </ReactFlow>
      </div>

      <aside className="min-w-0">
        {selectedEdge ? (
          <RelationshipDetail
            edge={selectedEdge}
            busy={updateRelationship.isPending || deleteRelationship.isPending}
            onAccept={() => decide(selectedEdge, 'accepted')}
            onReject={() => decide(selectedEdge, 'rejected')}
            onDelete={() => remove(selectedEdge)}
            onClose={() => setSelectedEdgeId(null)}
          />
        ) : (
          <div className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">Relationship details</p>
            <p className="mt-1">
              Select a relationship on the canvas to see its join condition, confidence and the
              reasoning behind it.
            </p>
            <dl className="mt-4 space-y-1.5 text-xs">
              <div className="flex justify-between gap-2">
                <dt>Tables</dt>
                <dd className="tabular-nums text-foreground">{graph.nodes.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Relationships</dt>
                <dd className="tabular-nums text-foreground">{edges.length}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt>Awaiting review</dt>
                <dd className="tabular-nums text-foreground">
                  {graph.edges.filter((e) => e.status === 'suggested').length}
                </dd>
              </div>
            </dl>
          </div>
        )}
      </aside>
    </div>
  )
}

function RelationshipDetail({
  edge,
  busy,
  onAccept,
  onReject,
  onDelete,
  onClose,
}: {
  edge: ModelEdge
  busy: boolean
  onAccept: () => void
  onReject: () => void
  onDelete: () => void
  onClose: () => void
}) {
  return (
    <div className="rounded-lg border bg-card">
      <header className="flex items-center gap-2 border-b px-3.5 py-2.5">
        <p className="min-w-0 flex-1 truncate text-sm font-medium">Relationship details</p>
        <Button variant="ghost" size="icon" className="size-6" onClick={onClose}>
          <X className="size-3.5" aria-hidden />
          <span className="sr-only">Close</span>
        </Button>
      </header>

      <div className="space-y-3 px-3.5 py-3 text-sm">
        <p className="font-mono text-xs">
          {edge.source} <span className="text-muted-foreground">→</span> {edge.target}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge status={edge.status} />
          {edge.status === 'suggested' ? <AiBadge /> : null}
        </div>

        <dl className="space-y-2">
          <div>
            <dt className="text-xs text-muted-foreground">Type</dt>
            <dd className="capitalize">{formatText(edge.relationshipType)}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Join condition</dt>
            <dd>
              <code className="mt-0.5 block overflow-x-auto rounded bg-muted px-2 py-1 font-mono text-xs">
                {edge.joinCondition ??
                  `${edge.source}.${edge.sourceColumn} = ${edge.target}.${edge.targetColumn}`}
              </code>
            </dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">Confidence</dt>
            <dd className="mt-1">
              <ConfidenceMeter value={edge.confidence} />
            </dd>
          </div>
        </dl>

        {edge.suggestion ? (
          <div className="rounded-md border-l-2 border-l-violet-400 bg-violet-50/50 px-3 py-2 dark:bg-violet-950/20">
            <p className="text-xs font-medium text-violet-700 dark:text-violet-300">
              Why this was suggested
            </p>
            <p className="mt-1 text-xs text-muted-foreground">{edge.suggestion}</p>
          </div>
        ) : null}
      </div>

      <footer className="flex flex-wrap items-center gap-2 border-t px-3.5 py-2.5">
        {edge.status === 'suggested' ? (
          <>
            <Button size="sm" onClick={onAccept} disabled={busy}>
              <Check className="size-4" aria-hidden />
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
              <X className="size-4" aria-hidden />
              Reject
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className={cn('text-destructive hover:text-destructive')}
            onClick={onDelete}
            disabled={busy}
          >
            <Trash2 className="size-4" aria-hidden />
            Delete
          </Button>
        )}
      </footer>
    </div>
  )
}
