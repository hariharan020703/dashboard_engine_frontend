import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "../api"

export const BUILDER_APP_NAME = "playbook_builder"

export type Session = {
  id: string
  appName: string
  userId: string
  state: Record<string, unknown>
  lastUpdateTime: number
}

type ListSessionsResponse = {
  sessions: Session[]
}

type FetchStatus = "idle" | "loading" | "success" | "error"

type SessionsState = {
  all: Session[]
  allStatus: FetchStatus
  current: Session | null
  currentStatus: FetchStatus
}

const initialState: SessionsState = {
  all: [],
  allStatus: "idle",
  current: null,
  currentStatus: "idle",
}

async function fetchSessionList(path: string, userId: string): Promise<Session[]> {
  const response = await apiClient.get<ListSessionsResponse>(path, {
    params: { user_id: userId },
  })
  return response.data.sessions
}

export const fetchAllSessions = createAsyncThunk(
  "sessions/fetchAllSessions",
  async (userId: string) => {
    const [chatSessions, builderSessions] = await Promise.all([
      fetchSessionList("/sessions", userId),
      fetchSessionList("/playbook-builder/sessions", userId),
    ])
    return [...chatSessions, ...builderSessions].sort(
      (a, b) => b.lastUpdateTime - a.lastUpdateTime
    )
  }
)

/**
 * Just the plain analyst chats — the history list on the Data Analyst page.
 * Deliberately narrower than `fetchAllSessions`: that one also pulls in
 * Playbook Builder sessions, which have nothing to do with "past chats" on
 * this page and would show up mixed in if reused here.
 */
export const fetchAnalystSessions = createAsyncThunk(
  "sessions/fetchAnalystSessions",
  async (userId: string) => {
    const sessions = await fetchSessionList("/sessions", userId)
    return [...sessions].sort((a, b) => b.lastUpdateTime - a.lastUpdateTime)
  }
)

export const findBuilderSessionForSandboxFile = createAsyncThunk(
  "sessions/findBuilderSessionForSandboxFile",
  async (args: { userId: string; fileName: string }) => {
    const sessions = await fetchSessionList("/playbook-builder/sessions", args.userId)
    const matches = sessions.filter(
      (session) => session.state?.sandbox_file_name === args.fileName
    )
    if (matches.length === 0) return null
    return matches.reduce((latest, session) =>
      session.lastUpdateTime > latest.lastUpdateTime ? session : latest
    )
  }
)

export const findBuilderSessionForPlaybook = createAsyncThunk(
  "sessions/findBuilderSessionForPlaybook",
  async (args: { userId: string; playbookId: string }) => {
    const sessions = await fetchSessionList("/playbook-builder/sessions", args.userId)
    // Only match sessions whose state actually has editing_playbook_id set
    // to this playbook — that's set once, at session creation, and is what
    // tells the agent to call read_published_playbook(). Matching by
    // sandbox_file_name too used to reuse the *original* build session
    // (from before this playbook was promoted out of the sandbox), whose
    // state still pointed at the now-gone sandbox draft — the agent would
    // try to re-read it there, get a 404, and have no real content to
    // work from. See the Playbooks page's "Edit" flow.
    const matches = sessions.filter(
      (session) => session.state?.editing_playbook_id === args.playbookId
    )
    if (matches.length === 0) return null
    return matches.reduce((latest, session) =>
      session.lastUpdateTime > latest.lastUpdateTime ? session : latest
    )
  }
)

export const fetchSession = createAsyncThunk(
  "sessions/fetchSession",
  async (args: { sessionId: string; userId: string }) => {
    const response = await apiClient.get<Session>(
      `/sessions/${encodeURIComponent(args.sessionId)}`,
      { params: { user_id: args.userId } }
    )
    return response.data
  }
)

export const fetchBuilderSession = createAsyncThunk(
  "sessions/fetchBuilderSession",
  async (args: { sessionId: string; userId: string }) => {
    const response = await apiClient.get<Session>(
      `/playbook-builder/sessions/${encodeURIComponent(args.sessionId)}`,
      { params: { user_id: args.userId } }
    )
    return response.data
  }
)

export const createSession = createAsyncThunk(
  "sessions/createSession",
  async (args: { userId: string; playbook?: string; playbookVersion?: number }) => {
    const response = await apiClient.post<Session>("/sessions", {
      user_id: args.userId,
      playbook: args.playbook ?? null,
      playbook_version: args.playbookVersion ?? null,
    })
    return response.data
  }
)

export const createBuilderSession = createAsyncThunk(
  "sessions/createBuilderSession",
  async (args: {
    userId: string
    skipKickoff?: boolean
    editingPlaybookId?: string
  }) => {
    const response = await apiClient.post<Session>("/playbook-builder/sessions", {
      user_id: args.userId,
      skip_kickoff: args.skipKickoff ?? false,
      editing_playbook_id: args.editingPlaybookId ?? null,
    })
    return response.data
  }
)

export const removeSession = createAsyncThunk(
  "sessions/removeSession",
  async (args: { sessionId: string; userId: string }) => {
    await apiClient.delete(`/sessions/${encodeURIComponent(args.sessionId)}`, {
      params: { user_id: args.userId },
    })
    return args.sessionId
  }
)

export const removeBuilderSession = createAsyncThunk(
  "sessions/removeBuilderSession",
  async (args: { sessionId: string; userId: string }) => {
    await apiClient.delete(
      `/playbook-builder/sessions/${encodeURIComponent(args.sessionId)}`,
      { params: { user_id: args.userId } }
    )
    return args.sessionId
  }
)

const sessionsSlice = createSlice({
  name: "sessions",
  initialState,
  reducers: {
    sessionCleared: (state) => {
      state.current = null
      state.currentStatus = "idle"
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAllSessions.pending, (state) => {
        state.allStatus = "loading"
      })
      .addCase(fetchAllSessions.fulfilled, (state, action) => {
        state.allStatus = "success"
        state.all = action.payload
      })
      .addCase(fetchAllSessions.rejected, (state) => {
        state.allStatus = "error"
      })
      .addCase(fetchAnalystSessions.pending, (state) => {
        state.allStatus = "loading"
      })
      .addCase(fetchAnalystSessions.fulfilled, (state, action) => {
        state.allStatus = "success"
        state.all = action.payload
      })
      .addCase(fetchAnalystSessions.rejected, (state) => {
        state.allStatus = "error"
      })
      .addCase(fetchSession.pending, (state) => {
        state.currentStatus = "loading"
      })
      .addCase(fetchSession.fulfilled, (state, action) => {
        state.currentStatus = "success"
        state.current = action.payload
      })
      .addCase(fetchSession.rejected, (state) => {
        state.currentStatus = "error"
        state.current = null
      })
      .addCase(fetchBuilderSession.pending, (state) => {
        state.currentStatus = "loading"
      })
      .addCase(fetchBuilderSession.fulfilled, (state, action) => {
        state.currentStatus = "success"
        state.current = action.payload
      })
      .addCase(fetchBuilderSession.rejected, (state) => {
        state.currentStatus = "error"
        state.current = null
      })
      .addCase(createSession.fulfilled, (state, action) => {
        state.all = [action.payload, ...state.all]
      })
      .addCase(createBuilderSession.fulfilled, (state, action) => {
        state.all = [action.payload, ...state.all]
      })
      .addCase(removeSession.fulfilled, (state, action) => {
        state.all = state.all.filter((session) => session.id !== action.payload)
      })
      .addCase(removeBuilderSession.fulfilled, (state, action) => {
        state.all = state.all.filter((session) => session.id !== action.payload)
      })
  },
})

export const { sessionCleared } = sessionsSlice.actions
export default sessionsSlice.reducer
