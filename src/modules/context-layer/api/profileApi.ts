import { contextHttp } from './client'
import { endpoints } from './endpoints'
import type { ProfileOverview, TableProfile } from '../types'

/**
 * Step 3 — Profile. PROPOSED: these routes are not built yet.
 *
 * The division of labour this contract assumes, and the reason it is written
 * this way: profiling is a metadata operation on the SOURCE, not a computation
 * over rows in a browser. Row counts, column counts, null rates, distinct
 * counts and storage size are all things a warehouse can answer from its own
 * catalogue far more cheaply than anything downstream can measure.
 *
 * So `sizeBytes` arrives as a number the backend obtained from source metadata.
 * The frontend formats it and does nothing else. There is no path here that
 * downloads a dataset to find out how big it is.
 *
 * Two calls rather than one, because the shapes have very different costs: the
 * overview is a small tree that the step needs immediately, and a table's full
 * profile — every column, a sample, the quality issues — is fetched only when
 * somebody actually opens that table.
 */

/** The dataset → table tree for the connection's current selection. */
export function fetchProfileOverview(connectionId: string): Promise<ProfileOverview> {
  return contextHttp.get<ProfileOverview>(endpoints.profileOverview(connectionId))
}

/** Everything known about one table. Fetched on selection, not up front. */
export function fetchTableProfile(
  connectionId: string,
  tableId: string
): Promise<TableProfile> {
  return contextHttp.get<TableProfile>(endpoints.tableProfile(connectionId, tableId))
}
