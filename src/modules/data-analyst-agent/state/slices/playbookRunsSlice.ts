import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "../api"

export type PlaybookRun = {
  id: number
  playbook_name: string
  session_id: string
  user_id: string | null
  status: string
  run_type: string
  last_run: string
}

type FetchStatus = "idle" | "loading" | "success" | "error"

type PlaybookRunsState = {
  items: PlaybookRun[]
  status: FetchStatus
  latestItems: PlaybookRun[]
  latestStatus: FetchStatus
}

const initialState: PlaybookRunsState = {
  items: [],
  status: "idle",
  latestItems: [],
  latestStatus: "idle",
}

export const fetchPlaybookRuns = createAsyncThunk(
  "playbookRuns/fetchPlaybookRuns",
  async (userId: string) => {
    const response = await apiClient.get<PlaybookRun[]>("/playbook-runs", {
      params: { user_id: userId },
    })
    return response.data
  }
)

export const fetchLatestPlaybookRuns = createAsyncThunk(
  "playbookRuns/fetchLatestPlaybookRuns",
  async (userId: string) => {
    const response = await apiClient.get<PlaybookRun[]>("/playbook-runs/latest", {
      params: { user_id: userId },
    })
    return response.data
  }
)

export function formatPlaybookRunTimestamp(lastRun: string) {
  const date = new Date(lastRun)
  return {
    date: date.toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
      year: "numeric",
    }),
    day: date.toLocaleDateString(undefined, { weekday: "short" }),
    time: date.toLocaleTimeString(undefined, {
      hour: "numeric",
      minute: "2-digit",
    }),
  }
}

const playbookRunsSlice = createSlice({
  name: "playbookRuns",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaybookRuns.pending, (state) => {
        state.status = "loading"
      })
      .addCase(fetchPlaybookRuns.fulfilled, (state, action) => {
        state.status = "success"
        state.items = action.payload
      })
      .addCase(fetchPlaybookRuns.rejected, (state) => {
        state.status = "error"
      })
      .addCase(fetchLatestPlaybookRuns.pending, (state) => {
        state.latestStatus = "loading"
      })
      .addCase(fetchLatestPlaybookRuns.fulfilled, (state, action) => {
        state.latestStatus = "success"
        state.latestItems = action.payload
      })
      .addCase(fetchLatestPlaybookRuns.rejected, (state) => {
        state.latestStatus = "error"
      })
  },
})

export default playbookRunsSlice.reducer
