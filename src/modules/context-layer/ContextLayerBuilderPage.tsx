import { Suspense, lazy, useEffect } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Page } from '@/components/common/Page'
import { usePaths } from '@/app/usePaths'
import { ContextQueryProvider } from './queries/QueryProvider'
import { WorkflowProvider } from './state/WorkflowProvider'
import { useWorkflow } from './state/workflowContext'
import { Stepper } from './components/Stepper'
import { LoadingState } from './components/DataStates'
import { VersionBadge } from './components/VersionBadge'
import { formatRelativeTime } from './components/format'
import { useContextVersions, useTrackStep } from './queries/hooks'

/*
 * Each step is its own chunk, fetched when somebody first opens it.
 *
 * Not a micro-optimisation: Model pulls in the graph library, which is the
 * single largest dependency this feature has, and Understand pulls in the
 * markdown renderer. Bundling all seven together meant anyone opening step one
 * downloaded the relationship canvas they might never reach. Splitting here
 * also matches how the data loads — a step's code and its queries both arrive
 * when the step does.
 */
const ConnectStep = lazy(() =>
  import('./steps/connect/ConnectStep').then((m) => ({ default: m.ConnectStep }))
)
const DiscoverStep = lazy(() =>
  import('./steps/discover/DiscoverStep').then((m) => ({ default: m.DiscoverStep }))
)
const ProfileStep = lazy(() =>
  import('./steps/profile/ProfileStep').then((m) => ({ default: m.ProfileStep }))
)
const UnderstandStep = lazy(() =>
  import('./steps/understand/UnderstandStep').then((m) => ({ default: m.UnderstandStep }))
)
const ModelStep = lazy(() =>
  import('./steps/model/ModelStep').then((m) => ({ default: m.ModelStep }))
)
const ReviewStep = lazy(() =>
  import('./steps/review/ReviewStep').then((m) => ({ default: m.ReviewStep }))
)
const PublishStep = lazy(() =>
  import('./steps/publish/PublishStep').then((m) => ({ default: m.PublishStep }))
)

/**
 * The Context Layer Builder — the seven-step workflow, as one screen.
 *
 * One page rather than seven routes, because it is one continuous task: the
 * connection, the dataset selection and the position in the workflow have to
 * survive moving between steps, and a route per step would mean either
 * threading that through the URL or losing it on every navigation.
 *
 * The connection can still be named in the URL (`?connection=<id>`), so a link
 * to a specific build is shareable and a reload keeps its place. Nothing else
 * about the workflow lives there — a half-made dataset selection in a query
 * string is a link that means something different tomorrow.
 *
 * Two providers wrap it: the query client, scoped to this module so the rest of
 * the app keeps its own server-state conventions, and the workflow state.
 */
export default function ContextLayerBuilderPage() {
  const [params] = useSearchParams()
  const initialConnectionId = params.get('connection')

  return (
    <ContextQueryProvider>
      <WorkflowProvider initialConnectionId={initialConnectionId}>
        <BuilderShell />
      </WorkflowProvider>
    </ContextQueryProvider>
  )
}

function BuilderShell() {
  const { step, connectionId } = useWorkflow()
  const paths = usePaths()
  const { mutate: trackStep } = useTrackStep(connectionId)

  /*
   * Keeps the open draft's step marker where somebody actually is. It moves
   * an existing draft only - the backend opens drafts on writes, so stepping
   * through a published context to read it does not create a new version.
   */
  useEffect(() => {
    if (connectionId) trackStep(step)
  }, [connectionId, step, trackStep])

  return (
    <Page>
      <div className="flex flex-col gap-4">
        <header className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-lg font-semibold tracking-tight">Context Layer Builder</h1>
            <p className="mt-0.5 text-sm text-muted-foreground">
              Connect a source, choose datasets, and build the context your agents and dashboards
              read from.
            </p>
            <VersionLine connectionId={connectionId} />
          </div>
          <Button asChild variant="outline" size="sm">
            <Link to={paths.context}>
              <ArrowLeft className="size-4" aria-hidden />
              All connections
            </Link>
          </Button>
        </header>

        <div className="rounded-xl border bg-card">
          <div className="border-b px-6 py-3.5">
            <Stepper />
          </div>

          {/*
            Only the active step is mounted. An unmounted step runs no query, so
            the workflow's cost is the step somebody is actually on rather than
            all seven — which matters most for Profile and Model, the two that
            can be expensive.
          */}
          <div className="flex min-h-[520px] flex-col">
            <Suspense fallback={<LoadingState label="Loading step…" />}>
              {step === 'connect' ? <ConnectStep /> : null}
              {step === 'discover' ? <DiscoverStep /> : null}
              {step === 'profile' ? <ProfileStep /> : null}
              {step === 'understand' ? <UnderstandStep /> : null}
              {step === 'model' ? <ModelStep /> : null}
              {step === 'review' ? <ReviewStep /> : null}
              {step === 'publish' ? <PublishStep /> : null}
            </Suspense>
          </div>
        </div>
      </div>
    </Page>
  )
}

/**
 * Where this context stands: which version is being edited, and what it was
 * edited from. Nothing renders until the context exists - a new connection
 * with no writes yet has no version to describe.
 */
function VersionLine({ connectionId }: { connectionId: string | null }) {
  const versions = useContextVersions(connectionId)
  const state = versions.data
  if (!state || state.status === 'none') return null

  const { draft, latestPublished } = state
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
      {draft ? (
        <>
          <VersionBadge status="draft" label={draft.label} />
          <span>
            <strong className="font-medium text-foreground">{draft.name}</strong>
            {latestPublished
              ? ` — editing a new version of published ${latestPublished.label}, which stays live until this is published.`
              : ' — not published yet. Changes are saved as you go.'}
          </span>
        </>
      ) : latestPublished ? (
        <>
          <VersionBadge status="published" label={latestPublished.label} />
          <span>
            <strong className="font-medium text-foreground">{latestPublished.name}</strong>
            {` — published ${formatRelativeTime(latestPublished.publishedAt)}. Any change opens the next version as a draft.`}
          </span>
        </>
      ) : null}
    </div>
  )
}
