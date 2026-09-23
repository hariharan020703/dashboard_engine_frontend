import { useCallback, useMemo, useState } from 'react'
import type { ReactNode } from 'react'
import type { WorkflowStepId } from '../types'
import {
  WORKFLOW_STEPS,
  WorkflowContext,
  stepIndex,
  type WorkflowState,
} from './workflowContext'

/**
 * The state that belongs to the WORKFLOW rather than to any one step.
 *
 * Deliberately tiny. Everything the backend owns — datasets, profiles,
 * understanding, relationships, review items, publish counts — lives in the
 * query cache, not here. What is left is the handful of things the workflow
 * itself decides: which connection is being built from, which step is open,
 * which datasets are ticked, and which table the profile pane is showing.
 *
 * `furthestStep` only ever moves forward, so stepping back to change a dataset
 * does not lock the later steps you had already reached.
 *
 * There is no credential in here, and there never should be. The token is
 * submitted once from the connect form and exchanged for a connection id; the
 * id is what the rest of the workflow carries.
 */
export function WorkflowProvider({
  children,
  initialConnectionId = null,
}: {
  children: ReactNode
  initialConnectionId?: string | null
}) {
  const [connectionId, setConnectionIdRaw] = useState<string | null>(initialConnectionId)
  const [step, setStep] = useState<WorkflowStepId>(
    initialConnectionId ? 'discover' : 'connect'
  )
  const [furthestStep, setFurthestStep] = useState<WorkflowStepId>(
    initialConnectionId ? 'discover' : 'connect'
  )
  const [selectedDatasetIds, setSelectedDatasetIds] = useState<string[] | null>(null)
  const [activeTableId, setActiveTableId] = useState<string | null>(null)

  /**
   * Changing the connection invalidates every choice made from the old one.
   * Carrying a dataset selection across would leave ids belonging to a
   * different warehouse ticked, which the next save would write back.
   */
  const setConnectionId = useCallback((id: string | null) => {
    setConnectionIdRaw((current) => {
      if (current !== id) {
        setSelectedDatasetIds(null)
        setActiveTableId(null)
      }
      return id
    })
  }, [])

  const goToStep = useCallback((id: WorkflowStepId) => {
    setStep(id)
    setFurthestStep((furthest) => (stepIndex(id) > stepIndex(furthest) ? id : furthest))
  }, [])

  const next = useCallback(() => {
    setStep((current) => {
      const target =
        WORKFLOW_STEPS[Math.min(stepIndex(current) + 1, WORKFLOW_STEPS.length - 1)]
      setFurthestStep((furthest) =>
        stepIndex(target.id) > stepIndex(furthest) ? target.id : furthest
      )
      return target.id
    })
  }, [])

  const back = useCallback(() => {
    setStep((current) => WORKFLOW_STEPS[Math.max(stepIndex(current) - 1, 0)].id)
  }, [])

  const canEnter = useCallback(
    (id: WorkflowStepId) => stepIndex(id) <= stepIndex(furthestStep),
    [furthestStep]
  )

  const value = useMemo<WorkflowState>(
    () => ({
      connectionId,
      setConnectionId,
      step,
      goToStep,
      next,
      back,
      furthestStep,
      canEnter,
      selectedDatasetIds,
      setSelectedDatasetIds,
      activeTableId,
      setActiveTableId,
    }),
    [
      connectionId,
      setConnectionId,
      step,
      goToStep,
      next,
      back,
      furthestStep,
      canEnter,
      selectedDatasetIds,
      activeTableId,
    ]
  )

  return <WorkflowContext.Provider value={value}>{children}</WorkflowContext.Provider>
}
