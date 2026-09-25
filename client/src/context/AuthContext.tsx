import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  type ReactNode,
} from 'react'
import {
  authApi,
  getStoredAccessToken,
  getStoredRefreshToken,
  setStoredTokens,
  clearStoredTokens,
} from '@/api'
import type { User, LoginCredentials, RegisterCredentials } from '@/types'
import { useToast } from './ToastContext'

interface AuthContextType {
  user: User | null
  accessToken: string | null
  isAuthenticated: boolean
  isOrganizer: boolean
  isLoading: boolean
  isAuthModalOpen: boolean
  login: (credentials: LoginCredentials) => Promise<void>
  register: (credentials: RegisterCredentials) => Promise<void>
  logout: () => Promise<void>
  openAuthModal: () => void
  closeAuthModal: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const toast = useToast()
  const [user, setUser] = useState<User | null>(null)
  const [accessToken, setAccessToken] = useState<string | null>(getStoredAccessToken())
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isAuthModalOpen, setIsAuthModalOpen] = useState<boolean>(false)

  const openAuthModal = useCallback(() => setIsAuthModalOpen(true), [])
  const closeAuthModal = useCallback(() => setIsAuthModalOpen(false), [])

  // Restore user session on application load
  useEffect(() => {
    let isMounted = true

    const initAuth = async () => {
      const refreshToken = getStoredRefreshToken()
      if (!refreshToken) {
        if (isMounted) setIsLoading(false)
        return
      }

      try {
        const profile = await authApi.getMe()
        if (isMounted) {
          setUser(profile)
          setAccessToken(getStoredAccessToken())
        }
      } catch {
        if (isMounted) {
          clearStoredTokens()
          setUser(null)
          setAccessToken(null)
        }
      } finally {
        if (isMounted) setIsLoading(false)
      }
    }

    initAuth()

    const handleSessionExpired = () => {
      clearStoredTokens()
      setUser(null)
      setAccessToken(null)
      setIsAuthModalOpen(true)
      toast.warning('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.', 'Phiên Hết Hạn')
    }

    window.addEventListener('auth:session-expired', handleSessionExpired)
    return () => {
      isMounted = false
      window.removeEventListener('auth:session-expired', handleSessionExpired)
    }
  }, [toast])

  const login = useCallback(
    async (credentials: LoginCredentials) => {
      try {
        const data = await authApi.login(credentials)
        setStoredTokens(data.tokens)
        setUser(data.user)
        setAccessToken(data.tokens.accessToken)
        setIsAuthModalOpen(false)
        toast.success(`Chào mừng trở lại, ${data.user.name || data.user.email}!`, 'Đăng Nhập Thành Công')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Đăng nhập không thành công'
        toast.error(msg, 'Đăng Nhập Thất Bại')
        throw err
      }
    },
    [toast]
  )

  const register = useCallback(
    async (credentials: RegisterCredentials) => {
      try {
        const data = await authApi.register(credentials)
        setStoredTokens(data.tokens)
        setUser(data.user)
        setAccessToken(data.tokens.accessToken)
        setIsAuthModalOpen(false)
        toast.success(`Tài khoản đã được tạo thành công!`, 'Đăng Ký Thành Công')
      } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Đăng ký không thành công'
        toast.error(msg, 'Đăng Ký Thất Bại')
        throw err
      }
    },
    [toast]
  )

  const logout = useCallback(async () => {
    try {
      await authApi.logout()
    } finally {
      clearStoredTokens()
      setUser(null)
      setAccessToken(null)
      toast.info('Bạn đã đăng xuất khỏi hệ thống.', 'Đã Đăng Xuất')
    }
  }, [toast])

  const isAuthenticated = !!user
  const isOrganizer = user?.role === 'ORGANIZER' || user?.role === 'ADMIN'

  return (
    <AuthContext.Provider
      value={{
        user,
        accessToken,
        isAuthenticated,
        isOrganizer,
        isLoading,
        isAuthModalOpen,
        login,
        register,
        logout,
        openAuthModal,
        closeAuthModal,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
