import { createAsyncThunk, createSlice, type PayloadAction } from "@reduxjs/toolkit"

import { apiClient, API_BASE_URL, ApiError } from "../api"

export type ChatMessage = {
  author: string
  text: string
  timestamp: number
  thoughts?: string[]
  thinkingSeconds?: number
}

export type MessageScope = "analyst" | "builder"

type GetMessagesResponse = {
  session_id: string
  messages: ChatMessage[]
}

type StreamEvent =
  | { type: "thought"; text: string }
  | { type: "final"; session_id: string; messages: ChatMessage[] }

type FetchStatus = "idle" | "loading" | "success" | "error"

type MessagesState = {
  items: ChatMessage[]
  /** Session the current `items` belong to; used to avoid blanking on same-session refetch. */
  activeSessionId: string | null
  historyStatus: FetchStatus
  isSending: boolean
  thoughts: string[]
}

const initialState: MessagesState = {
  items: [],
  activeSessionId: null,
  historyStatus: "idle",
  isSending: false,
  thoughts: [],
}

function basePathFor(scope: MessageScope) {
  return scope === "builder" ? "/playbook-builder/messages" : "/messages"
}

function logAgentOutput(messages: ChatMessage[]) {
  for (const message of messages) {
    if (message.author === "user") continue
    console.log("[agent output]", message.text)
  }
}

export const fetchMessages = createAsyncThunk(
  "messages/fetchMessages",
  async (args: { sessionId: string; userId: string; scope: MessageScope }) => {
    const response = await apiClient.get<GetMessagesResponse>(
      `${basePathFor(args.scope)}/${encodeURIComponent(args.sessionId)}`,
      { params: { user_id: args.userId } }
    )
    logAgentOutput(response.data.messages)
    return response.data.messages
  }
)

export const sendMessage = createAsyncThunk(
  "messages/sendMessage",
  async (
    args: { sessionId: string; userId: string; message: string; scope: MessageScope },
    { dispatch }
  ) => {
    const basePath = basePathFor(args.scope)
    const response = await fetch(`${API_BASE_URL}${basePath}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        session_id: args.sessionId,
        user_id: args.userId,
        message: args.message,
      }),
    })

    if (!response.ok || !response.body) {
      throw new ApiError(
        `Request to ${basePath} failed with status ${response.status}`,
        response.status
      )
    }

    const startedAt = Date.now()
    const collectedThoughts: string[] = []
    const reader = response.body.getReader()
    const decoder = new TextDecoder()
    let buffer = ""
    let finalMessages: ChatMessage[] | null = null

    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      buffer += decoder.decode(value, { stream: true })

      let newlineIndex = buffer.indexOf("\n")
      while (newlineIndex !== -1) {
        const line = buffer.slice(0, newlineIndex).trim()
        buffer = buffer.slice(newlineIndex + 1)
        newlineIndex = buffer.indexOf("\n")
        if (!line) continue

        const event = JSON.parse(line) as StreamEvent
        if (event.type === "thought") {
          collectedThoughts.push(event.text)
          dispatch(thoughtReceived(event.text))
        } else if (event.type === "final") {
          finalMessages = event.messages
        }
      }
    }

    if (!finalMessages) {
      throw new Error("Stream ended without a final response")
    }

    logAgentOutput(finalMessages)

    const thinkingSeconds = Math.round((Date.now() - startedAt) / 1000)
    return finalMessages.map((item, index) =>
      index === 0 && collectedThoughts.length
        ? { ...item, thoughts: collectedThoughts, thinkingSeconds }
        : item
    )
  }
)

const messagesSlice = createSlice({
  name: "messages",
  initialState,
  reducers: {
    messageAppended: (state, action: PayloadAction<ChatMessage>) => {
      state.items.push(action.payload)
    },
    lastMessagePopped: (state) => {
      state.items.pop()
    },
    messagesCleared: (state) => {
      state.items = []
      state.activeSessionId = null
      // Keep "loading" so session switches show skeletons instead of a blank pane.
      state.historyStatus = "loading"
    },
    historyResolved: (state, action: PayloadAction<string | undefined>) => {
      state.historyStatus = "success"
      if (action.payload) {
        state.activeSessionId = action.payload
      }
    },
    sendingStarted: (state) => {
      state.isSending = true
      state.thoughts = []
    },
    sendingStopped: (state) => {
      state.isSending = false
    },
    thoughtReceived: (state, action: PayloadAction<string>) => {
      state.thoughts.push(action.payload)
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMessages.pending, (state, action) => {
        const nextSessionId = action.meta.arg.sessionId
        state.historyStatus = "loading"
        // Only clear when switching sessions. Same-session refetch (remount /
        // StrictMode / userId refresh) keeps messages so the chat doesn't blank.
        if (state.activeSessionId !== nextSessionId) {
          state.items = []
          state.activeSessionId = nextSessionId
        }
      })
      .addCase(fetchMessages.fulfilled, (state, action) => {
        // Ignore stale responses from a previous session.
        if (action.meta.arg.sessionId !== state.activeSessionId) return
        state.historyStatus = "success"
        state.items = action.payload
      })
      .addCase(fetchMessages.rejected, (state, action) => {
        if (action.meta.arg.sessionId !== state.activeSessionId) return
        state.historyStatus = "error"
      })
      .addCase(sendMessage.fulfilled, (state, action) => {
        state.isSending = false
        state.activeSessionId = action.meta.arg.sessionId
        state.items.push(...action.payload)
        state.thoughts = []
      })
      .addCase(sendMessage.rejected, (state) => {
        state.items.push({
          author: "model",
          text: "Something went wrong sending that message. Please try again.",
          timestamp: Date.now() / 1000,
          thoughts: state.thoughts.length ? state.thoughts : undefined,
        })
        state.isSending = false
        state.thoughts = []
      })
  },
})

export const {
  messageAppended,
  lastMessagePopped,
  messagesCleared,
  historyResolved,
  sendingStarted,
  sendingStopped,
  thoughtReceived,
} = messagesSlice.actions
export default messagesSlice.reducer
