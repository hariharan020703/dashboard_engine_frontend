# Data analyst agent (frontend)

Reserved. Only `DataAnalystAgentPage.tsx` exists, and it is a placeholder that
says so on screen.

The folder and the route exist now so the feature has somewhere to land that
does not overlap with the context layer — the same reason `context-layer` is a
folder rather than files spread across `src/pages` and `src/api`.

## Already wired

| | |
|---|---|
| `/agent` | workspace console |
| `/platform/agent` | platform console |
| Sidebar | "Data Analyst Agent" under `INTELLIGENCE`, both consoles |

Neither route has a permission guard yet, because there is no capability to
guard. When the agent is built, give it a permission in the backend catalogue
and wrap the routes in `RequirePermission` the way `/context` is.

## What it reads

The datasets somebody selected in the context layer:
`GET /api/context/connections/:id` returns `selectedDatasets`, each carrying
the warehouse's own dataset id.

Follow the shape `../context-layer` uses — `api.ts`, `types.ts`, pages — so the
two features stay independent.
