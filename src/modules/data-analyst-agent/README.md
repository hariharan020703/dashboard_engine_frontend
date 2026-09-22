# Data analyst agent (frontend)

Ported from `mojo-data-agent-app` (a sister app built specifically around this
backend). Three pages live here:

| Route | Page | Purpose |
|---|---|---|
| `/agent/:id?` (`/platform/agent/:id?`) | `pages/CommandCenterPage.tsx` (`mode="analyst"`) | Ad-hoc chat with the agent. |
| `/playbook-builder/:id?` (`/platform/playbook-builder/:id?`) | `pages/CommandCenterPage.tsx` (`mode="builder"`) | Chat-driven playbook creation/editing. |
| `/playbooks` (`/platform/playbooks`) | `pages/PlaybooksPage.tsx` | Playbook list — run, edit, delete, promote from sandbox. |

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

The agent backend has no auth of its own — every call just passes a
`user_id` string used to scope playbooks/sessions. Rather than port the
source app's dev/test user-switcher (a `GET /users` roster + localStorage),
`state/hooks.ts`'s `useAgentUserId()` bridges this app's real authenticated
user (`useAuth().user.id`) into that role. This assumes the agent backend
accepts arbitrary ids rather than only ones already in its roster — if calls
start failing on `user_id`, that's a backend fix, not a frontend one.

## Already wired

- Routes: `src/App.tsx` (both the platform and workspace route trees).
- Nav: `src/ui/Sidebar.tsx`'s `INTELLIGENCE` group, both consoles ("Data
  Analyst Agent" and "Playbooks").
- Redux: `<Provider store={agentStore}>` wraps the whole app in `src/main.tsx`.
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
