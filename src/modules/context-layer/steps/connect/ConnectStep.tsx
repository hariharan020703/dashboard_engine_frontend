import { useState } from 'react'
import { notify } from '@/components/common/notify'
import { createAdkSession } from '@/api/adkAgentApi'
import { StepFrame } from '../../components/StepFrame'
import { QueryBoundary, TableSkeleton } from '../../components/DataStates'
import { endpoints } from '../../api'
import { useConnectors } from '../../queries/hooks'
import { useWorkflow } from '../../state/workflowContext'
import type { Connector } from '../../types'
import { ConnectorGallery } from './ConnectorGallery'
import { ConnectionForm } from './ConnectionForm'

/**
 * Step 1 — Connect.
 *
 * Two things, in the order somebody needs them: the connector gallery, and the
 * credential form once a connector is chosen.
 *
 * Existing connections are deliberately NOT listed here. They are the whole
 * subject of the Context Layer landing page, which is where somebody arrives
 * from — reaching this step means they pressed "New connection", so offering
 * the list again would be asking a question they have already answered.
 * Resuming an existing connection enters the workflow at Discover instead,
 * via `?connection=<id>`.
 *
 * Advancing requires a connection id, which only exists once the backend has
 * validated a credential. There is no way to reach Discover without one.
 */
export function ConnectStep() {
  const { connectionId, setConnectionId, goToStep } = useWorkflow()
  const [chosen, setChosen] = useState<Connector | null>(null)

  const connectors = useConnectors()

  return (
    <StepFrame
      title="Connect a data source"
      description="Choose a warehouse and provide credentials. We will validate them against the provider before anything is saved."
      nextDisabled={!connectionId}
      onNext={() => {
        if (!connectionId) return false
      }}
      footerNote={
        connectionId ? undefined : 'Connect or select a data source to continue.'
      }
    >
      <div className="space-y-8">

        {/* ------------------------------------------------------ gallery --- */}
        <QueryBoundary
          query={connectors}
          step="Connect"
          endpoint={`GET ${endpoints.connectors()}`}
          context="load the connector catalogue"
          loading={<TableSkeleton rows={2} columns={3} />}
        >
          {(list) => (
            <ConnectorGallery
              connectors={list}
              selectedId={chosen?.id ?? null}
              onSelect={setChosen}
            />
          )}
        </QueryBoundary>

        {/* --------------------------------------------------------- form --- */}
        {chosen ? (
          <ConnectionForm
            connector={chosen}
            onCancel={() => setChosen(null)}
            onConnected={(created) => {
              setChosen(null)
              setConnectionId(created.connection.id)

              /*
               * Fire-and-forget: the connection is already saved, so a failure
               * to open an extraction session must not block the workflow. The
               * connection's own id IS the ADK backend's workspace_id — that
               * service has no workspaces table of its own (see
               * adk_agents/api/main.py).
               */
              createAdkSession(created.connection.id, 'context_layer_extractor').catch(
                (err) => {
                  notify.failure('start the context extraction agent for this connection', err)
                }
              )

              goToStep('discover')
            }}
          />
        ) : null}
      </div>
    </StepFrame>
  )
}
