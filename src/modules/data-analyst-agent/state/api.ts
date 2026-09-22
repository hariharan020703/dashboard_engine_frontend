import axios from "axios"

export const API_BASE_URL = import.meta.env.VITE_AGENT_API_BASE_URL ?? "/api"

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
})

apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (axios.isAxiosError(error)) {
      const status = error.response?.status ?? 0
      const detail = (error.response?.data as { detail?: unknown } | undefined)?.detail
      const message =
        typeof detail === "string" ? detail : error.message || `Request failed with status ${status}`
      return Promise.reject(new ApiError(message, status))
    }
    return Promise.reject(error)
  }
)
