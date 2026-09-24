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
import { Check, Loader2, RefreshCw, Sparkles, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { notify } from '@/components/common/notify'
import { cn } from '@/lib/utils'
import { StepFrame } from '../../components/StepFrame'
import {
  EmptyState,
  NoConnectionState,
  QueryBoundary,
} from '../../components/DataStates'
import { AiBadge, ConfidenceMeter, StatusBadge } from '../../components/primitives'
import { formatRelativeTime, formatText } from '../../components/format'
import { endpoints } from '../../api'
import { useDecideRelationship, useModel } from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { ModelEdge, ModelGraph } from '../../types'
import { TableNode } from './TableNode'
import { autoLayout } from './layout'

/**
 * Step 5 — Model.
 *
 * The graph is DERIVED, by the backend, from what the extraction wrote:
 * `table` rows become nodes, their `column_stats` rows become those nodes'
 * columns, and `join` rows become edges carrying the join keys, cardinality
 * and confidence the agent recorded. So the tables shown here are the ones the
 * run covered, which follows from the datasets chosen in Discover.
 *
 * There is nothing to detect from this screen — detection happened in step 4.
 * Accepting or rejecting a relationship is a review decision on that join row,
 * the same one the Review step records.
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

  if (!connectionId) {
    return (
      <StepFrame title="Model relationships" hideNext>
        <NoConnectionState onConnect={() => goToStep('connect')} />
      </StepFrame>
    )
  }

  const nodeCount = model.data?.nodes.length ?? 0
  const edgeCount = model.data?.edges.length ?? 0

  return (
    <StepFrame
      title="Model relationships"
      description="The tables the extraction recorded, and the relationships it found between them."
      actions={
        <Button
          variant="outline"
          size="sm"
          onClick={() => model.refetch()}
          disabled={model.isFetching}
        >
          <RefreshCw
            className={cn('size-4', model.isFetching && 'animate-spin')}
            aria-hidden
          />
          Refresh
        </Button>
      }
      footerNote={
        model.data?.generatedAt
          ? `${nodeCount} table${nodeCount === 1 ? '' : 's'} · ${edgeCount} relationship${
              edgeCount === 1 ? '' : 's'
            } · from the run of ${formatRelativeTime(model.data.generatedAt)}`
          : undefined
      }
      refreshing={model.isFetching && !model.isPending}
    >
      <QueryBoundary
        query={model}
        step="Model"
        endpoint={`GET ${endpoints.model(connectionId)}`}
        context="load the data model"
        loading={<ModelSkeleton />}
      >
        {(data) => (
          <ReactFlowProvider>
            <ModelCanvas
              graph={data}
              connectionId={connectionId}
              onGoToUnderstand={() => goToStep('understand')}
            />
          </ReactFlowProvider>
        )}
      </QueryBoundary>
    </StepFrame>
  )
}

function ModelCanvas({
  graph,
  connectionId,
  onGoToUnderstand,
}: {
  graph: ModelGraph
  connectionId: string
  onGoToUnderstand: () => void
}) {
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null)

  const decideRelationship = useDecideRelationship(connectionId)

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

  /*
   * Accepting or rejecting here is the SAME decision the Review step records
   * on this join, reached from the canvas instead of from the queue. One
   * endpoint, one `verified` flag — so the two screens cannot end up
   * disagreeing about whether a relationship is trusted.
   */
  const decide = async (edge: ModelEdge, status: 'accepted' | 'rejected') => {
    try {
      await decideRelationship.mutateAsync({ id: edge.id, status })
      notify.success(status === 'accepted' ? 'Relationship accepted.' : 'Relationship rejected.')
      if (status === 'rejected') setSelectedEdgeId(null)
    } catch (err) {
      notify.failure(`${status === 'accepted' ? 'accept' : 'reject'} the relationship`, err)
    }
  }

  /*
   * An empty graph is not a failure, and there is nothing to retry from here.
   *
   * The graph is derived from what the extraction wrote: no `table` rows means
   * no run has happened, and the fix is in Understand rather than on this
   * screen. Offering a "detect" button here would imply this step can produce
   * a model on its own, which it cannot.
   */
  if (graph.nodes.length === 0) {
    return (
      <EmptyState
        title="No model yet"
        detail="The model is built from what the extraction recorded. Run it in Understand, and any tables and relationships it finds will appear here."
        action={
          <Button size="sm" onClick={onGoToUnderstand}>
            <Sparkles className="size-4" aria-hidden />
            Go to Understand
          </Button>
        }
      />
    )
  }

  /*
   * Tables but no relationships is a real and common answer — three unrelated
   * Domo datasets genuinely share no join. Said plainly rather than left as an
   * empty canvas somebody reads as broken.
   */
  const noRelationships = graph.edges.length === 0

  return (
    <div className="space-y-3">
      {noRelationships ? (
        <p className="rounded-md border border-dashed px-3 py-2 text-xs text-muted-foreground">
          The extraction recorded {graph.nodes.length} table
          {graph.nodes.length === 1 ? '' : 's'} but no relationships between them. That is a
          real answer for datasets that genuinely share no join — not a failure to look.
        </p>
      ) : null}

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
            busy={decideRelationship.isPending}
            pending={decideRelationship.isPending ? decideRelationship.variables?.status ?? null : null}
            onAccept={() => decide(selectedEdge, 'accepted')}
            onReject={() => decide(selectedEdge, 'rejected')}
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
    </div>
  )
}

function RelationshipDetail({
  edge,
  busy,
  pending,
  onAccept,
  onReject,
  onClose,
}: {
  edge: ModelEdge
  busy: boolean
  pending: 'accepted' | 'rejected' | null
  onAccept: () => void
  onReject: () => void
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
              {pending === 'accepted' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <Check className="size-4" aria-hidden />
              )}
              Accept
            </Button>
            <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
              {pending === 'rejected' ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : (
                <X className="size-4" aria-hidden />
              )}
              Reject
            </Button>
          </>
        ) : (
          /*
           * A decided relationship can be changed, not deleted.
           *
           * The edge is a fact the extraction recorded; removing it would be
           * erasing what the source said rather than disagreeing with it, and
           * the next run would find it again anyway. Rejecting is the move,
           * and it sticks.
           */
          <Button size="sm" variant="outline" onClick={onReject} disabled={busy}>
            {pending === 'rejected' ? (
              <Loader2 className="size-4 animate-spin" aria-hidden />
            ) : (
              <X className="size-4" aria-hidden />
            )}
            Reject instead
          </Button>
        )}
      </footer>
    </div>
  )
}

/** The canvas and its side panel, while the graph loads. */
function ModelSkeleton() {
  return (
    <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_320px]" aria-busy="true">
      <span className="sr-only">Loading the data model…</span>
      <div className="relative h-[520px] overflow-hidden rounded-xl border bg-card">
        <Skeleton className="absolute left-[10%] top-[18%] h-28 w-48 rounded-lg" />
        <Skeleton className="absolute right-[12%] top-[30%] h-32 w-52 rounded-lg" />
        <Skeleton className="absolute bottom-[14%] left-[32%] h-28 w-48 rounded-lg" />
      </div>
      <div className="space-y-3 rounded-xl border bg-card p-4">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
      </div>
    </div>
  )
}
