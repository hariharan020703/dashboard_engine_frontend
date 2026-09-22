import { configureStore } from "@reduxjs/toolkit"

import actionTrackerReducer from "./slices/actionTrackerSlice"
import filesReducer from "./slices/filesSlice"
import messagesReducer from "./slices/messagesSlice"
import playbookRunsReducer from "./slices/playbookRunsSlice"
import playbooksReducer from "./slices/playbooksSlice"
import scheduleTriggersReducer from "./slices/scheduleTriggersSlice"
import sessionsReducer from "./slices/sessionsSlice"

export const store = configureStore({
  reducer: {
    playbooks: playbooksReducer,
    playbookRuns: playbookRunsReducer,
    scheduleTriggers: scheduleTriggersReducer,
    actionTracker: actionTrackerReducer,
    sessions: sessionsReducer,
    messages: messagesReducer,
    files: filesReducer,
  },
})

export type RootState = ReturnType<typeof store.getState>
export type AppDispatch = typeof store.dispatch
