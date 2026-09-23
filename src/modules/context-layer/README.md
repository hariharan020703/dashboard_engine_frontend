# Context layer (frontend)

The connector gallery and the dataset picker. Everything the feature adds to
the UI is in this folder.

```
ContextLayerPage.tsx        connector gallery + this company's connections
ConnectDialog.tsx           the connect form, rendered from the connector's fields
ConnectionDatasetsPage.tsx  the live dataset list and the selection
api.ts                      the only code that calls /api/context
types.ts                    the API contract
```

## Where it touches the rest of the app

Three files, on purpose:

| File | What was added |
|---|---|
| `src/App.tsx` | the `/context`, `/context/connections/:id` and `/agent` routes, in both consoles |
| `src/ui/Sidebar.tsx` | an `INTELLIGENCE` group in both sidebars |
| `src/api/client.ts` | `CONNECTOR_AUTH_FAILED`, `CONNECTOR_UNREACHABLE` in `ApiErrorCode` |

## Routes

| Path | Console |
|---|---|
| `/context` · `/context/connections/:id` · `/agent` | workspace (`COMPANY_ADMIN`, `USER`) |
| `/platform/context` · `/platform/context/connections/:id` · `/platform/agent` | platform (`SUPER_ADMIN`) |

Both consoles render the same components. A platform account has no company of
its own, so `ConnectDialog` shows a company picker for it and not for anyone
else — the same rule the user-creation form already follows.

Every route is behind `context.read`; the buttons that change something are
behind `context.manage`, checked with `can()` rather than by hiding the page.

## The form is data

`ConnectDialog` renders whatever fields the backend declares for a connector
(`connectorCatalogue.js`). A dialog written around Domo's three fields is one
that gets copied for Snowflake and then drifts, so adding a provider should not
mean adding a component.

## After a connection is validated

`ContextLayerPage`'s `onConnected` handler also fires a session-create call
against the **ADK Agent Runtime API** (`src/api/adkAgentApi.ts`), for the
`context_layer_extractor` agent, using the new connection's id as
`workspace_id` — that backend has no workspace concept of its own; a
connection's id doubles as one (see that service's `db.py`). It is
fire-and-forget: a failure there is reported through `notify.failure` but
never blocks the redirect to the dataset picker, since the connection itself
already saved successfully. The Data Analyst chat (`src/modules/
data-analyst-agent`, `/data-analyst`) uses the same connection id as its own
workspace_id, against the `data_analyst` agent.

## Two things this deliberately does not do

**It does not cache the dataset list.** `ConnectionDatasetsPage` fetches from
the warehouse on every open. A stale list means ticking a dataset id that no
longer resolves, and that failure would surface much later, somewhere else,
for a reason invisible from this screen.

**It does not build a context.** Saving records the chosen dataset ids and the
UI says exactly that. Handing them to whatever builds the context is a separate
step against a different service.

## Failure is shown in place

A rejected token renders inside the dialog, not only as a toast: the fix is
retyping the field that is on screen, and a notification that slides away takes
the reason with it. An unreachable warehouse on the datasets page keeps the
saved selection visible and explains why it cannot be changed, rather than
rendering an empty list that reads as "you have no datasets".
