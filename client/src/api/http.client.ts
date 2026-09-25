import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios'
import type { ApiResponse, TokenPair, RefreshTokenResponseData } from '@/types'

const TOKEN_KEY = 'ticketing_access_token'
const REFRESH_KEY = 'ticketing_refresh_token'

export const getStoredAccessToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY)
}

export const getStoredRefreshToken = (): string | null => {
  return localStorage.getItem(REFRESH_KEY)
}

export const setStoredTokens = (tokens: TokenPair): void => {
  localStorage.setItem(TOKEN_KEY, tokens.accessToken)
  localStorage.setItem(REFRESH_KEY, tokens.refreshToken)
}

export const clearStoredTokens = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(REFRESH_KEY)
}

// Create base Axios instance
export const httpClient = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || '/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
})

// Mutex queue variables to prevent refresh race condition
let isRefreshing = false
let failedQueue: Array<{
  resolve: (token: string) => void
  reject: (error: unknown) => void
}> = []

const processQueue = (error: unknown, token: string | null = null): void => {
  failedQueue.forEach((promise) => {
    if (error) {
      promise.reject(error)
    } else if (token) {
      promise.resolve(token)
    }
  })
  failedQueue = []
}

// 1. Request Interceptor: Attach Access Token
httpClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getStoredAccessToken()
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`
    }
    return config
  },
  (error) => Promise.reject(error)
)

// 2. Response Interceptor: Catch 401 & Execute Silent Token Rotation (RTR)
httpClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ApiResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean }

    // If no config or not a 401 error, reject immediately
    if (!originalRequest || error.response?.status !== 401) {
      return Promise.reject(error)
    }

    // Do not attempt to refresh for login/register/refresh endpoints themselves
    if (
      originalRequest.url?.includes('/auth/login') ||
      originalRequest.url?.includes('/auth/register') ||
      originalRequest.url?.includes('/auth/refresh-token')
    ) {
      return Promise.reject(error)
    }

    // If already retried once, prevent infinite loop
    if (originalRequest._retry) {
      return Promise.reject(error)
    }

    // If another request is currently refreshing the token, wait in the Mutex Queue
    if (isRefreshing) {
      return new Promise<string>((resolve, reject) => {
        failedQueue.push({ resolve, reject })
      })
        .then((newToken) => {
          originalRequest.headers.Authorization = `Bearer ${newToken}`
          return httpClient(originalRequest)
        })
        .catch((err) => Promise.reject(err))
    }

    originalRequest._retry = true
    isRefreshing = true

    const currentRefreshToken = getStoredRefreshToken()

    if (!currentRefreshToken) {
      isRefreshing = false
      clearStoredTokens()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
      return Promise.reject(error)
    }

    try {
      // Call refresh-token endpoint with current refresh token
      const response = await axios.post<ApiResponse<RefreshTokenResponseData>>(
        '/api/v1/auth/refresh-token',
        { refreshToken: currentRefreshToken },
        { headers: { 'Content-Type': 'application/json' } }
      )

      const responseData = response.data.data
      const newTokens: TokenPair = responseData?.tokens || {
        accessToken: responseData?.accessToken || '',
        refreshToken: responseData?.refreshToken || '',
      }

      if (!newTokens.accessToken || !newTokens.refreshToken) {
        throw new Error('Invalid token response from refresh endpoint')
      }

      // Save newly rotated tokens
      setStoredTokens(newTokens)

      // Notify queue subscribers with new token
      processQueue(null, newTokens.accessToken)

      // Re-dispatch original request with new bearer token
      originalRequest.headers.Authorization = `Bearer ${newTokens.accessToken}`
      return httpClient(originalRequest)
    } catch (refreshError) {
      processQueue(refreshError, null)
      clearStoredTokens()
      window.dispatchEvent(new CustomEvent('auth:session-expired'))
      return Promise.reject(refreshError)
    } finally {
      isRefreshing = false
    }
  }
)
