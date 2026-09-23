import type { ModelEdge, ModelNode } from '../../types'

/**
 * Automatic layout, for a graph whose size is not known in advance.
 *
 * The canvas has to work for three tables and for three hundred, so positions
 * cannot be authored. This is a layered ("Sugiyama-lite") arrangement: assign
 * each node a depth by walking the relationship graph, then stack the nodes at
 * each depth into a column. It is not a force simulation — it is deterministic,
 * runs in one pass, and produces the left-to-right flow people expect of a
 * star or snowflake schema, where facts sit to one side of their dimensions.
 *
 * A node the backend already has a saved `position` for is left exactly where
 * it is: somebody moved it deliberately, and an auto-layout that overrides that
 * on every load is one nobody can use.
 */

const COLUMN_WIDTH = 320
const ROW_HEIGHT = 190
const ORIGIN = { x: 40, y: 40 }

export interface PositionedNode {
  id: string
  position: { x: number; y: number }
}

/**
 * Depth per node, from the connectivity graph.
 *
 * Roots are the nodes nothing points at — in a star schema, the facts. A cycle
 * cannot make this loop: `seen` stops a node being queued twice, so the walk
 * terminates whatever shape the backend sends.
 */
function assignDepths(nodes: ModelNode[], edges: ModelEdge[]): Map<string, number> {
  const ids = new Set(nodes.map((n) => n.id))
  const outgoing = new Map<string, string[]>()
  const indegree = new Map<string, number>(nodes.map((n) => [n.id, 0]))

  for (const edge of edges) {
    // Edges can name a node the node list does not contain; ignore those
    // rather than inventing a node to hang them off.
    if (!ids.has(edge.source) || !ids.has(edge.target)) continue
    if (!outgoing.has(edge.source)) outgoing.set(edge.source, [])
    outgoing.get(edge.source)!.push(edge.target)
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1)
  }

  const depth = new Map<string, number>()
  const seen = new Set<string>()
  const roots = nodes.filter((n) => (indegree.get(n.id) ?? 0) === 0).map((n) => n.id)

  // A graph that is entirely cyclic has no root; start somewhere rather than
  // laying every node at depth zero on top of each other.
  const queue = roots.length > 0 ? [...roots] : nodes.slice(0, 1).map((n) => n.id)
  for (const id of queue) {
    depth.set(id, 0)
    seen.add(id)
  }

  while (queue.length > 0) {
    const id = queue.shift()!
    const current = depth.get(id) ?? 0
    for (const next of outgoing.get(id) ?? []) {
      const candidate = current + 1
      if (!depth.has(next) || candidate > depth.get(next)!) depth.set(next, candidate)
      if (!seen.has(next)) {
        seen.add(next)
        queue.push(next)
      }
    }
  }

  // Anything unreachable — an isolated table, a disconnected component — gets
  // its own column at the end rather than being dropped.
  const orphanDepth = Math.max(0, ...depth.values()) + 1
  for (const node of nodes) {
    if (!depth.has(node.id)) depth.set(node.id, orphanDepth)
  }

  return depth
}

/** Positions for every node, honouring any the backend already saved. */
export function autoLayout(nodes: ModelNode[], edges: ModelEdge[]): PositionedNode[] {
  const depths = assignDepths(nodes, edges)

  const byDepth = new Map<number, ModelNode[]>()
  for (const node of nodes) {
    const d = depths.get(node.id) ?? 0
    if (!byDepth.has(d)) byDepth.set(d, [])
    byDepth.get(d)!.push(node)
  }

  // Tallest column decides the vertical centring, so the graph reads as
  // balanced rather than hanging off the top edge.
  const tallest = Math.max(...[...byDepth.values()].map((c) => c.length), 1)

  const positioned: PositionedNode[] = []
  for (const [depth, column] of byDepth) {
    const offset = ((tallest - column.length) * ROW_HEIGHT) / 2
    column.forEach((node, row) => {
      positioned.push({
        id: node.id,
        position: node.position ?? {
          x: ORIGIN.x + depth * COLUMN_WIDTH,
          y: ORIGIN.y + offset + row * ROW_HEIGHT,
        },
      })
    })
  }

  return positioned
}
