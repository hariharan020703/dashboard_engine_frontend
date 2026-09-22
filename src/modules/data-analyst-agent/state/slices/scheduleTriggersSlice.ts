import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "../api"

export type ScheduleFrequency = "hourly" | "daily" | "weekly" | "six_pm"

export type ScheduleTrigger = {
  id: number
  user_id: string
  playbook_id: string
  playbook_name: string
  recipient_email: string | null
  frequency: ScheduleFrequency
  is_active: boolean
  created_at: string
}

type FetchStatus = "idle" | "loading" | "success" | "error"

type ScheduleTriggersState = {
  items: ScheduleTrigger[]
  status: FetchStatus
}

const initialState: ScheduleTriggersState = {
  items: [],
  status: "idle",
}

export const fetchScheduleTriggers = createAsyncThunk(
  "scheduleTriggers/fetchScheduleTriggers",
  async (userId: string) => {
    const response = await apiClient.get<ScheduleTrigger[]>("/schedule-triggers", {
      params: { user_id: userId },
    })
    return response.data
  }
)

export const addScheduleTrigger = createAsyncThunk(
  "scheduleTriggers/addScheduleTrigger",
  async (args: { userId: string; playbookId: string; frequency: ScheduleFrequency }) => {
    const response = await apiClient.post<ScheduleTrigger>("/schedule-triggers", {
      user_id: args.userId,
      playbook_id: args.playbookId,
      frequency: args.frequency,
    })
    return response.data
  }
)

export const removeScheduleTrigger = createAsyncThunk(
  "scheduleTriggers/removeScheduleTrigger",
  async (id: number) => {
    await apiClient.delete(`/schedule-triggers/${id}`)
    return id
  }
)

const scheduleTriggersSlice = createSlice({
  name: "scheduleTriggers",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchScheduleTriggers.pending, (state) => {
        state.status = "loading"
      })
      .addCase(fetchScheduleTriggers.fulfilled, (state, action) => {
        state.status = "success"
        state.items = action.payload
      })
      .addCase(fetchScheduleTriggers.rejected, (state) => {
        state.status = "error"
      })
      .addCase(addScheduleTrigger.fulfilled, (state, action) => {
        state.items = [action.payload, ...state.items]
      })
      .addCase(removeScheduleTrigger.fulfilled, (state, action) => {
        state.items = state.items.filter((trigger) => trigger.id !== action.payload)
      })
  },
})

export default scheduleTriggersSlice.reducer
