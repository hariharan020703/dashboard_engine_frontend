import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "../api"

export type Playbook = {
  id: string
  name: string
  description: string
  content: string
  version: number
  version_count: number
}

type FetchStatus = "idle" | "loading" | "success" | "error"

type PlaybooksState = {
  items: Playbook[]
  status: FetchStatus
  sandboxItems: Playbook[]
  sandboxStatus: FetchStatus
}

const initialState: PlaybooksState = {
  items: [],
  status: "idle",
  sandboxItems: [],
  sandboxStatus: "idle",
}

export const fetchPlaybooks = createAsyncThunk(
  "playbooks/fetchPlaybooks",
  async (userId?: string) => {
    const params = userId ? { user_id: userId } : {}
    const response = await apiClient.get<Playbook[]>("/playbooks", { params })
    return response.data
  }
)

export const removePlaybook = createAsyncThunk(
  "playbooks/removePlaybook",
  async (args: { playbookId: string; userId: string }) => {
    await apiClient.delete(`/playbooks/${encodeURIComponent(args.playbookId)}`, {
      params: { user_id: args.userId },
    })
    return args.playbookId
  }
)

export const fetchSandboxPlaybooks = createAsyncThunk(
  "playbooks/fetchSandboxPlaybooks",
  async (userId?: string) => {
    const params = userId ? { user_id: userId } : {}
    const response = await apiClient.get<Playbook[]>("/sandbox-playbooks", { params })
    return response.data
  }
)

export const promoteSandboxPlaybook = createAsyncThunk(
  "playbooks/promoteSandboxPlaybook",
  async (args: { playbookId: string; userId: string }) => {
    const response = await apiClient.post<Playbook>(
      `/sandbox-playbooks/${encodeURIComponent(args.playbookId)}/promote`,
      null,
      { params: { user_id: args.userId } }
    )
    return response.data
  }
)

export const removeSandboxPlaybook = createAsyncThunk(
  "playbooks/removeSandboxPlaybook",
  async (args: { playbookId: string; userId: string }) => {
    await apiClient.delete(`/sandbox-playbooks/${encodeURIComponent(args.playbookId)}`, {
      params: { user_id: args.userId },
    })
    return args.playbookId
  }
)

const playbooksSlice = createSlice({
  name: "playbooks",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlaybooks.pending, (state) => {
        state.status = "loading"
      })
      .addCase(fetchPlaybooks.fulfilled, (state, action) => {
        state.status = "success"
        state.items = action.payload
      })
      .addCase(fetchPlaybooks.rejected, (state) => {
        state.status = "error"
      })
      .addCase(removePlaybook.fulfilled, (state, action) => {
        state.items = state.items.filter((item) => item.id !== action.payload)
      })
      .addCase(fetchSandboxPlaybooks.pending, (state) => {
        state.sandboxStatus = "loading"
      })
      .addCase(fetchSandboxPlaybooks.fulfilled, (state, action) => {
        state.sandboxStatus = "success"
        state.sandboxItems = action.payload
      })
      .addCase(fetchSandboxPlaybooks.rejected, (state) => {
        state.sandboxStatus = "error"
      })
      .addCase(promoteSandboxPlaybook.fulfilled, (state, action) => {
        const promotedId = action.meta.arg.playbookId
        state.sandboxItems = state.sandboxItems.filter(
          (item) => item.id !== promotedId
        )
        const published = action.payload
        if (
          published &&
          !state.items.some((item) => item.id === published.id)
        ) {
          state.items = [published, ...state.items]
        }
      })
      .addCase(removeSandboxPlaybook.fulfilled, (state, action) => {
        state.sandboxItems = state.sandboxItems.filter(
          (item) => item.id !== action.payload
        )
      })
  },
})

export default playbooksSlice.reducer
