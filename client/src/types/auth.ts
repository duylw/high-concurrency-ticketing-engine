export type Role = 'USER' | 'ORGANIZER' | 'ADMIN' | 'MODERATOR'

export interface User {
  id: string
  email: string
  role: Role
  username?: string
  name?: string | null
}

export interface TokenPair {
  accessToken: string
  refreshToken: string
}

export interface AuthResponseData {
  user: User
  tokens: TokenPair
}

export interface RefreshTokenResponseData {
  accessToken: string
  refreshToken: string
  tokens: TokenPair
}

export interface LoginCredentials {
  email: string
  password: string
}

export interface RegisterCredentials {
  name: string
  username: string
  email: string
  password: string
  role?: Role
}
