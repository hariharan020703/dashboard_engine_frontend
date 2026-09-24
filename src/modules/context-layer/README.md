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

### Two backends, and exactly where the line is

| Steps | Backend | Configured by |
|---|---|---|
| 1 Connect · 2 Discover · 3 Profile | **Node** (`backend/`) | `VITE_CONTEXT_API_URL`, blank = same-origin `/api` |
| 4 Understand | **Context Layer service** (`Elze-backend/adk_agents/api`) | `VITE_ADK_API_BASE_URL`, default `:8300` |
| 5–7 | not built | — |

Steps 1–3 are source data and belong to the Node API. Step 4 is an AI job and is the **one
place the workflow leaves it**, which is why `api/extractionApi.ts` goes through
`@/api/adkAgentApi` instead of this module's `api/client.ts` — two backends, two
transports, the boundary stated in one file rather than discovered in a component.

**Profile's "Analyse with AI" is what runs it.** Two calls, in order:

```
POST /workspaces/{connectionId}/agents/context_layer_extractor/sessions
     {}
POST /workspaces/{connectionId}/agents/context_layer_extractor/sessions/{sessionId}/messages
     { "text": "", "dataset_ids": [...selected...], "stream": false }
```

Three things about that payload:

- **`workspace_id` IS the connection id.** That service has no workspaces table;
  `adk_agents/api/db.py:workspace_exists` checks `SELECT 1 FROM connections WHERE id = %s`
  against the same rows this application writes.
- **`text` is empty on purpose.** The service builds the extraction prompt from
  `dataset_ids` (`_build_extraction_prompt`); `text` is a slot for *extra* instructions
  appended after it, not the message itself.
- **`dataset_ids` is the saved selection, not the draft** — the set the profile was built
  from and the one the service can resolve.

`stream: false` holds the request open for the whole run — minutes, not seconds — so
Profile stays put and shows progress rather than advancing to an empty screen. A failed run
keeps you on Profile with the selection intact.

**Demo mode (temporary).** When `GET /context/settings` reports `extractionMode: 'demo'`
(backend `CONTEXT_EXTRACTION_MODE=demo`, while the Anthropic credit is unavailable), the
same hooks call the **Node** backend instead: `POST …/extraction` generates agent-shaped
facts from the selected tables' real schema, and Understand reads the report
(`GET …/extraction`) from Node too. The facts (`GET …/context-objects`) are read from Node
in **both** modes — both engines write the same `context_objects` rows. The result carries
`mode: 'demo'` for the record, but the screen presents it like any extraction run — no
"demo" wording anywhere in the UI (product decision); provenance stays server-side. The choice is made inside
`queries/hooks.ts` (`extractionMode()`), so no step component knows which engine ran.
Setting the backend back to `agent` is the whole switch.

### What Understand shows, and in what order

**The business glossary leads** (`steps/understand/GlossaryView.tsx`, `GET …/understanding`,
served by Node in both modes). Three tiles — terms generated, average confidence, human
approved (+ this week) — over a searchable table of Term · Type · Definition · Applies to ·
Confidence · State, 10 per page, filtered by All / AI generated / Needs review / Approved /
Overridden. **Filtering, search and paging are the server's** (`?filter=all|ai|review|approved|override&search&page&pageSize`):
the response carries the whole-glossary `stats`, the `matched` count and one page of `terms`. The backend maps `table` → Entity, `metric` → Metric, `glossary` → Dimension
(when `payload.kind = 'dimension'`) or Term, and derives the state: *Human override* (edited
in Review — `context_object_reviews.edited`), *Human approved*, *Source verified* (verified by
the run itself), *AI generated* (pending, confidence ≥ 0.8), *AI suggested* (pending, lower),
*Rejected*. Columns are not glossary terms; they stay under "All facts written" and Review.

Below it, collapsed, the two reads described next:

Two things, from two different reads, and the order is deliberate:

1. **Facts written to the context layer** — `GET /context/connections/:id/context-objects`
   (Node, in both modes), the latest run. These are the actual `context_objects` rows: one
   per table, column, transformation or example the agent recorded, each with `objectType`,
   `qualifiedName`, `sourceType`, `verified` and `payload`. **One page at a time**
   (`?type&search&page&pageSize`, 25 per page) with `counts` per type across the whole run
   for the chips — a run is mostly `column_stats`, and the list used to receive all of them.
2. **Agent report** — the markdown the run returned, plus the tools it called (it *writes*,
   so "what did that run do" shouldn't need the server logs).

Facts first because they are what the run *did*; the report is its own *account* of the
run, and the two can disagree. Leading with the prose would invite reading the account as
the outcome.

`payload` is JSONB whose shape varies by `object_type`, and `ContextObjectList` renders it
**generically** — chips for arrays, JSON for objects, `description` promoted to body text
because every type carries it. No renderer per type: that set belongs to the extraction
skill, it will grow, and a switch here would silently hide anything new. Type filter chips
are built from the server's per-type `counts`, never a hardcoded list.

`verified` splits the trust bands visually (green / amber) because it is the skill's own
flag — true for structural facts, false for anything that needed interpretation, which is
exactly what a human has to review.

Both reads survive a reload: the report comes from the agent's own session transcript
(`useExtraction`), the facts from the store (`useContextObjects`). Neither lives only in
the query cache. A finished run invalidates the facts rather than seeding them — the chat
response carries the agent's prose, not the rows it wrote.

There is no Node-side `/understanding` contract any more. It was removed along with
`blocks.tsx` when this step moved to the extraction agent — recoverable from git if a
structured Node-side understanding is ever wanted.

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

### Steps 5–7 — derived from the facts, decided by a human

All three run against the Node backend, which reads `context_objects` **directly** — the
two services share one database, so this needs no call to the Python tier. The ADK API is
read-only for those rows, and the only service that can mutate them (`api/` on :8100) is
one you would have to run and hand an admin token to.

**Model** is derived, not stored: `table` rows become nodes, their `column_stats` rows
become those nodes' columns, and `join` rows become edges carrying the join keys,
cardinality and confidence the agent recorded. So the tables shown follow from the datasets
chosen in Discover. There is no "detect" button — detection happened in step 4. A join
naming a table with no `table` row still produces a node; dropping the edge would hide a
relationship that was actually found.

**Review** is every object the run wrote. Approve / Edit and approve / Reject / Skip, with
type-specific editors. Two things make the persistence worth reading:

- **Approving mirrors into `context_objects.verified`**, in the same transaction as our own
  status. That column is what the read-side MCP server and the analyst agent filter on, so
  an approval that only updated our table would look settled here and stay invisible
  downstream.
- **Four states do not fit in one boolean.** `pending`, `rejected` and `skipped` live in
  `context_object_reviews`, a table this application owns. `skip` deliberately leaves
  `verified` alone — it means "not now", not "this is wrong".

Accepting a relationship on the Model canvas is the *same* call as approving that join in
the queue. One endpoint, one flag, so the two screens cannot disagree.

Editing merges the payload rather than replacing it: an editor sends the keys it renders,
and replacing would drop the distinct values, sample sizes and notes it does not.

**Versions.** A context is a **draft** from its first write (the backend opens it — saving
a selection, running an extraction, a review decision) until it is published; editing after
that opens the **next version** as a new draft, and published versions never change. The
builder header shows `Draft · v2` / `Published · v1` (`components/VersionBadge.tsx`,
`useContextVersions`), the landing cards show the same, and moving between steps sends
`PATCH …/draft` to move an existing draft's step marker — it never opens one.

**Publish** turns the open draft into a named, versioned snapshot in
`context_layer_versions` (formerly `context_publications`), and lists every version. The **name** is
the point — a connection is where the data came from ("Domo — Sales"), a published context
is what it is *for* ("Revenue", "Site safety"), and one connection can produce several. The
version counts **per name**, so republishing "Revenue" makes v2 of Revenue while a new name
starts again at v1. Only approved facts are included, and the snapshot stores the facts
themselves rather than pointing at live rows — a version that changed whenever somebody
edited a description would not be a version. Rather than fake them, each renders an
`EndpointPendingState` naming the exact route it is waiting for. `STEP_ENDPOINT_LIVE` in
`api/endpoints.ts` records which is which; flip a step to `true` when its route ships.

### The endpoint contract

All under `/context/connections/:id`. Full response shapes are in `types.ts`. The two
Profile rows are marked LIVE; the rest are `PROPOSED`.

| Step | Method | Path | Returns |
|---|---|---|---|
| Profile  | `GET` | `/profile` | **LIVE** — `ProfileOverview`, from the stored selection |
| Profile  | `GET` | `/tables/:tableId` | **LIVE** — `TableProfile`, read live from the warehouse |
| Understand | `GET` | `/understanding` | **LIVE** — `Understanding`: `stats`, `matched`, one page of `terms` (`?filter&search&page&pageSize`) |
| Understand | `GET` | `/context-objects` | **LIVE** — `ContextObjects`: `count`, `counts`, `matched`, one page of `objects` (`?type&search&page&pageSize`) |
| Model | `GET` | `/model` | `ModelGraph` — `nodes`, `edges` |
| Model | `POST` | `/model/generate` | starts detection, same shape |
| Model | `POST`/`PATCH`/`DELETE` | `/model/relationships[/:id]` | `ModelEdge` |
| Review | `GET` | `/review` | **LIVE** — `ReviewQueue`: one page of `items`, `counts`/`total` (whole run), `matched` (`?type&status&search&page&pageSize`, filtered in SQL) |
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

## Returning to a connection

Discover shows what is **already configured** for the connection you came back to. Three
parts, and the third is the one that matters:

1. A banner: *"7 datasets already configured for this connection."*
2. A **Configured** badge on each such row, and a **Reset to saved** action once the ticked
   set differs from the stored one — compared by contents, not by length, so swapping one
   dataset for another still counts as a change.
3. **Rows for configured datasets the current listing did not reach**, rendered first.

That third part is a correctness fix, not a nicety. The listing is capped (20 by default),
`saveSelection` **replaces** the whole selection, and the save used to be built by
filtering the fetched page — so a dataset configured earlier that fell outside the current
page rendered nowhere, looked unconfigured, and was silently deleted the next time anyone
pressed Next. The merged row set is what the save is now built from, so nothing can be
dropped that nobody unticked.

Those stand-in rows carry only what the server actually stored at selection time — id,
name, `rowCount`, `columnCount`. Description, owner and the rest are `null` and render as
`—`, because this application never saw them for those rows.

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
