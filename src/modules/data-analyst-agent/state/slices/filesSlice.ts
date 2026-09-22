import { createAsyncThunk, createSlice } from "@reduxjs/toolkit"

import { apiClient } from "../api"

export type UploadFileResponse = {
  filename: string
  characters: number
}

type FilesState = {
  isUploading: boolean
}

const initialState: FilesState = {
  isUploading: false,
}

export const uploadSessionFile = createAsyncThunk(
  "files/uploadSessionFile",
  async (args: { sessionId: string; userId: string; file: File }) => {
    const formData = new FormData()
    formData.append("session_id", args.sessionId)
    formData.append("user_id", args.userId)
    formData.append("file", args.file)

    const response = await apiClient.post<UploadFileResponse>(
      "/files/upload",
      formData
    )
    return response.data
  }
)

const filesSlice = createSlice({
  name: "files",
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(uploadSessionFile.pending, (state) => {
        state.isUploading = true
      })
      .addCase(uploadSessionFile.fulfilled, (state) => {
        state.isUploading = false
      })
      .addCase(uploadSessionFile.rejected, (state) => {
        state.isUploading = false
      })
  },
})

export default filesSlice.reducer
