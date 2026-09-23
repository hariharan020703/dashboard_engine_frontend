import { createContext, useContext } from 'react'
import type { WorkflowStepId } from '../types'

/**
 * The workflow's shape and its hook, separated from the provider component.
 *
 * Split purely so each file exports one kind of thing — a module that exports
 * both a component and constants defeats fast refresh, and the resulting full
 * reload loses the step you were on every time you touch the file.
 */

export const WORKFLOW_STEPS: ReadonlyArray<{
  id: WorkflowStepId
  label: string
  description: string
}> = [
  { id: 'connect', label: 'Connect', description: 'Select a data source' },
  { id: 'discover', label: 'Discover', description: 'Select datasets' },
  { id: 'profile', label: 'Profile', description: 'Tables & schema' },
  { id: 'understand', label: 'Understand', description: 'AI generated insights' },
  { id: 'model', label: 'Model', description: 'Relationships' },
  { id: 'review', label: 'Review', description: 'Approve and edit' },
  { id: 'publish', label: 'Publish', description: 'Finalize and publish' },
]

const STEP_INDEX = new Map(WORKFLOW_STEPS.map((s, i) => [s.id, i]))

export function stepIndex(id: WorkflowStepId): number {
  return STEP_INDEX.get(id) ?? 0
}

export interface WorkflowState {
  connectionId: string | null
  setConnectionId: (id: string | null) => void

  step: WorkflowStepId
  goToStep: (id: WorkflowStepId) => void
  next: () => void
  back: () => void

  /** The furthest step reached, which is how far the stepper allows jumping. */
  furthestStep: WorkflowStepId
  canEnter: (id: WorkflowStepId) => boolean

  /**
   * The dataset selection draft.
   *
   * `null` means "nobody has touched this yet", which is what lets Discover
   * fall back to the selection already saved on the server without an effect
   * copying one into the other. The moment somebody ticks a box it becomes an
   * array and stops tracking the server — so a background refetch can never
   * revert a half-made choice.
   */
  selectedDatasetIds: string[] | null
  setSelectedDatasetIds: (ids: string[]) => void

  /** Which table the Profile pane is showing. Null until one is chosen. */
  activeTableId: string | null
  setActiveTableId: (id: string | null) => void
}

export const WorkflowContext = createContext<WorkflowState | null>(null)

export function useWorkflow(): WorkflowState {
  const ctx = useContext(WorkflowContext)
  if (!ctx) throw new Error('useWorkflow must be used inside <WorkflowProvider>')
  return ctx
}
