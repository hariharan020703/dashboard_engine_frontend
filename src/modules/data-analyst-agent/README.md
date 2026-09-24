# Data analyst agent (frontend)

Ported from `mojo-data-agent-app` (a sister app built specifically around this
backend). Pages live here:

| Route | Page | Purpose |
|---|---|---|
| `/data-analyst/:id?` (`/platform/data-analyst/:id?`) | `pages/AnalystChatPage.tsx` | The Data Analyst chat, on the **ADK Agent Runtime API** (see "Two backends" below). This is what the sidebar's "Data analyst" link opens. |
| `/agent/:id?` (`/platform/agent/:id?`) | `pages/CommandCenterPage.tsx` (`mode="analyst"`) | The older ad-hoc chat, on the Mojo backend. Not linked from the sidebar any more — kept only because Playbooks' "Test"/"Run" flow still navigates here (a sandbox-test session, flagged by `session.state.is_sandbox_test`, needs this component's sandbox banner/Edit/Promote UI). |
| `/playbook-builder/:id?` (`/platform/playbook-builder/:id?`) | `pages/CommandCenterPage.tsx` (`mode="builder"`) | Chat-driven playbook creation/editing. |
| `/playbooks` (`/platform/playbooks`) | `pages/PlaybooksPage.tsx` | Playbook list — run, edit, delete, promote from sandbox. |

## Two backends

This module now talks to **two** unrelated agent services:

- The **Mojo Analyst Agent** (below) — Playbook Builder, Playbooks, and the
  legacy `/agent` sandbox-test route. Unchanged.
- The **ADK Agent Runtime API** (`src/api/adkAgentApi.ts`, a top-level API
  module, not under `state/` — it has no Redux dependency and the
  context-layer module calls it too) — the Data Analyst chat at
  `/data-analyst`. Its sessions are scoped by `workspace_id`, which is a
  context-layer `Connection`'s id (that backend has no separate workspace
  concept — see `adk_agents/api/main.py`'s docstring in the
  `elze_data_exploration_agent` repo). `state/useAnalystChat.ts` is the hook
  behind `AnalystChatPage`: it resolves this company's connected warehouse,
  lazily creates a session on the first message or upload, and streams
  responses over SSE. It intentionally does not use this module's Redux
  store — there is nothing here for it to share with Playbook Builder, and
  reusing the old session/message slices would have meant bolting a second,
  incompatible response shape onto them.

## Why this looks different from the rest of the app

This is a deliberate lift-and-shift, not a rewrite in the app's usual style.
The source app's chat/playbook feature is built on Redux Toolkit, a handful
of shadcn-style primitives (`ui/`), and a rich tool-rendering engine
(`tools/`: charts, tables, KPIs, findings, PDF export) — reproducing all of
that from scratch in this app's plain-Context/hand-rolled-UI style would have
been a much larger and riskier effort than copying the working implementation
over. Everything it needs — Redux store, UI primitives, tool engine, theming
— is self-contained inside this module folder so it doesn't leak into the
rest of the app:

```
state/        Redux slices, store, hooks, the agent backend's axios client
ui/           shadcn-style primitives (button, dialog, table, ...), scoped here only
dialogs/      file-upload and row-metadata dialogs
tools/        chart/table/KPI/finding/insight/report/markdown renderers + the
              tool_engine dispatcher that picks among them per agent response
lib/          cn() helper, PDF/Excel export helpers
theme.css     the color/radius tokens those components need, scoped under a
              .agent-workbench wrapper class so they never affect the rest
              of the app's styling
pages/        CommandCenterPage, PlaybooksPage, and their sub-components
```

## Backend

These pages talk to the **agent backend** (the "Mojo Analyst Agent" service),
which is a completely different service from this app's own `BACKEND_URL`.
`state/api.ts` is a standalone axios client pointed at
`VITE_AGENT_API_BASE_URL` (see `.env.example`) — independent of `@/api/client`
and its Bearer/CSRF handling, mirroring exactly how the source app reaches
this backend. `state/slices/messagesSlice.ts`'s `sendMessage` thunk streams
NDJSON "thinking" events over a raw `fetch` against the same base URL rather
than going through axios.

**The agent backend's CORS allow-list must include this app's origin(s)** for
any of this to work — that's a backend-side config change outside this repo.

## User identity

The Mojo Analyst Agent has no auth of its own, but it is NOT arbitrary-id
tolerant either — it has its own fixed roster (`GET /users`: Deep Blue,
Exxon, Sterling, each a GUID `userid`), and every call scopes playbooks/
sessions by that same id (playbooks live under a `playbooks/{user_id}/` GCS
prefix). Bridging this app's own numeric `user.id` into that role (what this
used to do) sends an id the Mojo backend has never seen.

`state/hooks.ts`'s `useAgentUserId()` currently returns one hardcoded,
seeded id (`"42af3369-6ed7-441d-ba61-a378399c5ba4"`, "Exxon") for every
dashboard account — a temporary trade-off until dashboard accounts are
mapped to Mojo users one-for-one, which does not exist yet. Every dashboard
user sees the same Mojo playbooks/sessions until that mapping is built.

Separately: a `500` from this backend on `/playbooks` or similar is not
necessarily a `user_id` problem — `services/playbooks.py` reads/writes
Google Cloud Storage, and a missing `PLAYBOOKS_GCS_BUCKET` (or bad
`GOOGLE_APPLICATION_CREDENTIALS`) fails exactly the same way, for every
user_id, real or not. Confirmed by hand: `GET /playbooks?user_id=<any
value, including a real one from /users>` 500s identically when that env
var is unset.

## Already wired

- Routes: `src/App.tsx` (both the platform and workspace route trees).
- Nav: `src/app/navigation.ts`'s `Intelligence` group, both consoles ("Data
  analyst" now points at `paths.dataAnalyst()` / `/data-analyst`, and
  "Playbooks").
- Redux: `<Provider store={agentStore}>` wraps the whole app in `src/main.tsx`
  — still only backs Playbook Builder/Playbooks; `AnalystChatPage` uses plain
  React state instead (see "Two backends" above).
- Theming: `theme.css` imported from `src/index.css`.

No `RequirePermission` guard yet on any of these routes, same as before —
add one once a capability exists in the backend permission catalogue.

## Deliberately left out of the port

- The source app's dev user-switcher (`usersSlice`) — see User identity above.
- `quick-filter-panel` / its provider — an unfinished stub in the source app
  (hardcoded fake filters, no backend calls, and its own trigger wasn't even
  part of these three pages).
- Sandbox / Action Tracker / Run History / Settings pages — out of scope;
  only the three pages above were requested. The "Add to Action Tracker"
  button inside agent responses still works (it's baked into the copied
  `tool_engine` code and the backend endpoint already exists) — there's just
  no page here to review those items yet.
