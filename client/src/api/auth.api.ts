import { httpClient, getStoredRefreshToken } from './http.client'
import type {
  ApiResponse,
  AuthResponseData,
  LoginCredentials,
  RegisterCredentials,
  User,
} from '@/types'

export const authApi = {
  login: async (credentials: LoginCredentials): Promise<AuthResponseData> => {
    const res = await httpClient.post<ApiResponse<AuthResponseData>>('/auth/login', credentials)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Login failed')
    }
    return res.data.data
  },

  register: async (credentials: RegisterCredentials): Promise<AuthResponseData> => {
    const res = await httpClient.post<ApiResponse<AuthResponseData>>('/auth/register', credentials)
    if (!res.data.data) {
      throw new Error(res.data.message || 'Registration failed')
    }
    return res.data.data
  },

  getMe: async (): Promise<User> => {
    const res = await httpClient.get<ApiResponse<User>>('/auth/me')
    if (!res.data.data) {
      throw new Error(res.data.message || 'Failed to fetch user profile')
    }
    return res.data.data
  },

  logout: async (): Promise<void> => {
    const refreshToken = getStoredRefreshToken()
    if (refreshToken) {
      try {
        await httpClient.post('/auth/logout', { refreshToken })
      } catch {
        // Silently continue client-side logout even if network fails
      }
    }
  },

  logoutAll: async (): Promise<void> => {
    await httpClient.post('/auth/logout-all')
  },
}
