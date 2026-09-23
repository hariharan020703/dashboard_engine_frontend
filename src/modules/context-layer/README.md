# Context Layer Builder (frontend)

A seven-step workflow for turning a warehouse connection into published context:

```
Connect → Discover → Profile → Understand → Model → Review → Publish
```

One screen, not seven routes: the connection, the dataset selection and the position in
the workflow have to survive moving between steps.

| Route | Screen | Permission |
|---|---|---|
| `/context` (`/platform/context`) | `ContextLayerPage` — the connected sources, and **New connection** | `context.read` |
| `/context/builder[?connection=<id>]` | `ContextLayerBuilderPage` — the seven-step workflow | `context.manage` |
| `/context/connections/:id` | `ConnectionDatasetsPage` — dataset picker for one connection | `context.read` |

The sidebar's "Context layer" opens the landing page, which answers one question — what is
already connected, and is it still working. **New connection** enters the builder at
Connect; a connection card's **Continue building** enters it at Discover with
`?connection=<id>`. A read-only account is not offered either, so it never lands on a
permission refusal.

Connecting happens in the builder's first step **and nowhere else**. There used to be a
second connect dialog on the landing page; two forms for one credential is how the wording,
the validation and the field list drift apart.

## The one rule

**No business data is authored in this module.** Not a dataset name, a row count, a
storage size, a metric, a definition, an entity, a relationship, a confidence value or a
publish count. Every one of those comes from the backend, and a field the backend does not
send renders as `—` rather than as a plausible-looking number.

Two consequences worth stating, because they are easy to undo by accident:

- **Storage size is never calculated here.** The backend reads it from source metadata and
  sends `sizeBytes`; `components/format.ts` turns that integer into "2.4 GB". Nothing in
  this module fetches rows, serialises a response or measures a payload to find out how big
  something is.
- **`null` and `0` stay distinguishable.** `null` means "the backend did not report this",
  `0` means zero. A formatter that collapsed them would be inventing data.

## Layout

```
config.ts             VITE_CONTEXT_API_URL -> the module's base URL, read once
types.ts              the whole API contract, marked LIVE or PROPOSED per section

api/
  endpoints.ts        every path, in one table; STEP_ENDPOINT_LIVE
  client.ts           the one transport; isEndpointMissing()
  connectionApi.ts    step 1      understandingApi.ts  step 4
  datasetApi.ts       step 2      modelApi.ts          step 5
  profileApi.ts       step 3      reviewApi.ts         step 6
                                  publishApi.ts        step 7
  index.ts            the `contextApi` facade

queries/
  keys.ts             one hierarchical key factory
  QueryProvider.tsx   the module's own QueryClient
  hooks.ts            every read and write, one hook each

state/
  workflowContext.ts  step list, WorkflowState, useWorkflow
  WorkflowProvider.tsx

connectors/registry.ts  per-provider presentation; isConnectable()
components/             Stepper, StepFrame, DataStates, primitives, format
steps/<step>/           one folder per step
```

**Nothing above `queries/` knows about HTTP.** No component imports a service, builds a URL
or calls axios. That boundary is what lets the backend contract change without a step
component being touched.

## Pointing it at a backend

`VITE_CONTEXT_API_URL` is the only thing to set, and normally it is left blank:

- **blank / relative** — calls `/api/...` through `src/api/http.ts`, which carries the
  bearer token, the CSRF header and silent session renewal. Correct for every supported
  deployment today.
- **absolute origin** — calls that service directly with a bare axios client and **no
  credentials attached**, because this app's access token is not valid there and sending it
  to another origin would leak it. Configure that service's own auth in `api/client.ts`.

Re-pointing an individual step is an edit to `api/endpoints.ts` and nowhere else.

## What is built and what is not

**Steps 1–3 run against the Express backend today** (`backend/src/modules/context-layer/`) —
real Domo authentication, real dataset listing, real table profiling, the credential
encrypted server-side.

### Where the line between Profile and Understand falls

This is the distinction the workflow is built around, and it is easy to blur:

| | Source | Step |
|---|---|---|
| Tables, columns, types, row/column counts, storage, null rates, distinct counts, sample rows | **the warehouse** — what the data says about itself | 3 — Profile |
| Business definitions, metrics, entities, dimensions, relationships, insights | **the AI** — an interpretation of the above | 4 onward |

So Profile never calls the AI, and the AI never supplies a row count. **Pressing Next in
Profile is what starts the AI run** (`generateUnderstanding`), because generating an
interpretation costs real time and money and should happen when somebody decides the
profile is right — not when a page mounts. Advancing is not blocked on that run: Understand
polls its own `status` and has a Generate button of its own.

Profile's two reads are deliberately different in cost:

- `GET .../profile` — the dataset → table tree, read from **this** database. It is the
  selection stored in step 2, so the tree draws instantly and a warehouse that is briefly
  unreachable does not empty the screen. Its counts are from selection time.
- `GET .../tables/:tableId` — read **live** from the warehouse, only when a table is opened.
  One dataset-detail call plus one `SELECT * LIMIT 500`: that query is the only place Domo's
  API exposes per-column types at all, and the same response yields the sample rows and the
  values the statistics are computed from.

Statistics are computed **in the backend** over that sample, and the sample size travels
with them — the schema tab says *"computed from a sample of 500 rows out of 4.2M. Column
names and types are exact."* A null rate presented without its basis reads as a fact about
the whole table. Domo exposes no semantic types, keys or quality score on this surface, so
those come back `null` and render as `—` rather than being guessed from column names.

Steps 4–7 have no backend yet. Rather than fake them, each renders an
`EndpointPendingState` naming the exact route it is waiting for. `STEP_ENDPOINT_LIVE` in
`api/endpoints.ts` records which is which; flip a step to `true` when its route ships.

### The endpoint contract

All under `/context/connections/:id`. Full response shapes are in `types.ts`. The two
Profile rows are marked LIVE; the rest are `PROPOSED`.

| Step | Method | Path | Returns |
|---|---|---|---|
| Profile  | `GET` | `/profile` | **LIVE** — `ProfileOverview`, from the stored selection |
| Profile  | `GET` | `/tables/:tableId` | **LIVE** — `TableProfile`, read live from the warehouse |
| Understand | `GET` | `/understanding` | `Understanding` — `stats`, `sections[].blocks[]` |
| Understand | `POST` | `/understanding/generate` | starts a run, same shape |
| Model | `GET` | `/model` | `ModelGraph` — `nodes`, `edges` |
| Model | `POST` | `/model/generate` | starts detection, same shape |
| Model | `POST`/`PATCH`/`DELETE` | `/model/relationships[/:id]` | `ModelEdge` |
| Review | `GET` | `/review` | `ReviewQueue` — `items`, `counts`, `total` |
| Review | `POST` | `/review/:itemId/decision` | approve / reject / skip, optional `update` |
| Review | `PATCH` | `/review/:itemId` | edit without deciding |
| Review | `POST` | `/review/decision` | bulk, by filter not by id list |
| Publish | `GET` | `/publish/summary` | `PublishSummary` — `stats`, `datasets`, `content`, `blockers` |
| Publish | `POST` | `/publish/validate` | `PublishValidation` |
| Publish | `POST` | `/publish` | `PublishResult` — `version`, `publishedAt` |

Three shapes are deliberately open-ended so the backend can change what it produces without
a frontend release:

- **`Understanding.sections[].blocks[]`** is a discriminated union on `type` (`metric`,
  `definition`, `entity`, `dimension`, `insight`, `warning`, `table`, `markdown`, …).
  `steps/understand/blocks.tsx` has a renderer per type and a visible *"unsupported
  content"* card for one it does not know — new block types are additive, never silently
  dropped.
- **`Understanding.stats`** and **`PublishSummary.stats`** are `{id, label, value}` lists.
  The tiles are drawn from whatever comes back; no count is hardcoded.
- **`ReviewQueue.counts`** drives the filter chips, so a new review item type appears in the
  filters on its own.

## Dataset listings are capped

Listing is the slowest thing a connector does, so Discover asks for **20 by default** and
offers 10 / 20 / 50 / 100 / 250. The cap is the **backend's** — it stops paging once it has
that many, so the round trips for the rest are never made. This is not a client-side slice
of a full list.

Three things follow, and each is load-bearing:

- **The limit is part of the query key** (`contextKeys.datasets(id, limit)`). Raising it is
  a new request; lowering it back comes from cache.
- **It is always sent explicitly**, never left to the backend's default, even though the two
  agree on 20. A request that omitted it would cache under `"default"` while the
  create-connection response caches under `20` — the same rows under two keys, and the
  picker refetches for an answer it already had. `DEFAULT_DATASET_LIMIT` in `config.ts` is
  the one value both use.
- **`truncated` is surfaced, not swallowed.** When the backend proves there is more, the
  table says *"Showing the first 20"* with a **Load more** button and the count reads `20+`.
  Somebody selecting from a capped list without being told is how a context ends up quietly
  missing most of a warehouse.

## Connectors

The list comes from `GET /context/connectors`, and `status` decides what is connectable —
tested through `isConnectable()` in `connectors/registry.ts`. **Nothing in this module
compares a provider id to `'domo'`.**

Domo is `available`. Snowflake, Databricks, BigQuery, Amazon Redshift and PostgreSQL are
`planned`: listed so the roadmap is visible, rendered as inert `div`s with no click handler
and no tab stop, and refused by the API as well. There is no fake connection flow to
stumble into.

Adding a provider is one entry in `registry.ts` (icon, accent, host label) plus flipping
`status` in the backend's `connectorCatalogue.js`. No component changes.

## Credentials

The form is rendered from `connector.credentials`, which the backend describes — so the two
sides cannot disagree about which fields exist.

The credential is submitted **once**, over HTTPS, and exchanged for a connection id. It is
never persisted in `localStorage`, `sessionStorage`, a URL, Redux or a log line; the secret
field is cleared the moment the exchange succeeds, and what stays on screen is
`secretHint`, the last four characters the backend chose to return. Every later call in the
workflow is made with the connection id.

Validation and saving are one request. A saved connection whose credential was never checked
looks identical on screen to one that works.

## Server state

TanStack Query, with its own `QueryClient` scoped to this module's routes — the rest of the
app uses `useAsync` and a Context session, and putting a second server-state system under
all of it would be a change to every screen.

- **Lazy per step.** Every hook is gated on `enabled`, and only the active step is mounted,
  so an unmounted step runs no query. Opening the workflow costs the step you are on.
- **Code-split per step.** Each step is a `lazy()` chunk. Model alone pulls in the graph
  library (~178 kB); bundling it meant anyone opening step one downloaded a canvas they
  might never reach.
- **Retry is off for settled answers.** A refused credential, a permission denial and an
  unbuilt route are not worth three attempts; only transport failures and 5xx are retried.
- **Mutations invalidate, they do not patch.** Approving a review item can cascade
  server-side — resolve a blocker, change the counts, remove another item — so the queue and
  the publish summary are refetched rather than guessed at locally.
- **Drafts are derived, not synchronised.** The dataset selection is `null` until somebody
  touches it and falls back to the server's saved selection until then; the review edit
  draft re-seeds on the item's id during render. Neither uses an effect, so a background
  refetch cannot land mid-edit and revert a half-made choice.

## The stepper

`components/Stepper.tsx` is a navigation control, not a progress decoration. A step already
reached can be jumped back to; a step not yet reached is disabled but **visible**, so the
shape of the workflow is clear from step one.

Every step button carries the same sentence in three places — the styled tooltip, the
`aria-label` and the native `title` — produced by one `stepHint()` function so they cannot
drift:

| State | Hint |
|---|---|
| current | "You are here." |
| complete | "Completed — select to revisit this step." |
| locked | **"Complete “<step>” to proceed to this step."** |
| upcoming, endpoint unbuilt | "Waiting on its backend endpoint." |

The step named in the locked message is the **furthest step reached**, not the one
immediately before the target. If somebody is on Discover and hovers Publish, telling them
to "complete Review" is true but useless — the thing actually in their way is the step they
are standing on. Locked steps also show a padlock instead of their number, and a step whose
backend route is unbuilt carries an amber dot.

## States

Four, not three — `components/DataStates.tsx`:

| | When |
|---|---|
| Loading | request in flight (`TableSkeleton` where the shape is known) |
| Empty | the backend answered, with nothing in it |
| Error | the request failed — the backend's own message, plus Retry |
| **Endpoint pending** | the route does not exist yet — names the route, no Retry |

The fourth exists because "not built yet" and "something went wrong" are different facts,
and offering a Retry button for the first wastes the user's time. `QueryBoundary` decides
between them in one place so seven step components cannot each get the precedence subtly
wrong. No raw exception, status code or stack trace is ever shown.
