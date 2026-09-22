import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "../api"
import type { ToolAction } from "@/modules/data-analyst-agent/tools/tool_engine"

export type ActionTrackerItem = {
  id: number
  findings: string
  action: string
  owner: string | null
  due: string | null
  status: string
  source: string
  session_id: string | null
  user_id: string | null
  created_at: string
}

type FetchStatus = "idle" | "loading" | "success" | "error"

type ActionTrackerState = {
  items: ActionTrackerItem[]
  status: FetchStatus
}

const initialState: ActionTrackerState = {
  items: [],
  status: "idle",
}

export const fetchActionTrackerItems = createAsyncThunk(
  "actionTracker/fetchActionTrackerItems",
  async (userId: string) => {
    const response = await apiClient.get<ActionTrackerItem[]>("/action-tracker", {
      params: { user_id: userId },
    })
    return response.data
  }
)

export const addActionTrackerItem = createAsyncThunk(
  "actionTracker/addActionTrackerItem",
  async (args: { action: ToolAction; sessionId?: string; userId: string }) => {
    const response = await apiClient.post<ActionTrackerItem>("/action-tracker", {
      findings: args.action.action_label,
      action: args.action.action_type,
      owner: "Naveen",
      session_id: args.sessionId ?? null,
      user_id: args.userId,
    })
    return response.data
  }
)

export const removeActionTrackerItem = createAsyncThunk(
  "actionTracker/removeActionTrackerItem",
  async (args: { id: number; userId: string }) => {
    await apiClient.delete(`/action-tracker/${args.id}`, {
      params: { user_id: args.userId },
    })
    return args.id
  }
)

const actionTrackerSlice = createSlice({
  name: "actionTracker",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchActionTrackerItems.pending, (state) => {
        state.status = "loading"
      })
      .addCase(fetchActionTrackerItems.fulfilled, (state, action) => {
        state.status = "success"
        state.items = action.payload
      })
      .addCase(fetchActionTrackerItems.rejected, (state) => {
        state.status = "error"
      })
      .addCase(addActionTrackerItem.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items]
      })
      .addCase(removeActionTrackerItem.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
  },
})

export default actionTrackerSlice.reducer