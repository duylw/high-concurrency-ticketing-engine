import React, { useEffect, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth()
  const toast = useToast()
  const wasAuthenticatedRef = useRef(isAuthenticated)
  const hasNotifiedRef = useRef(false)

  useEffect(() => {
    // If the user was authenticated when this route mounted and now logged out,
    // do not trigger unauthorized warnings or open login modal
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      return
    }

    if (!isLoading && !isAuthenticated && !hasNotifiedRef.current) {
      hasNotifiedRef.current = true
      toast.warning('Vui lòng đăng nhập để truy cập trang này.', 'Yêu Cầu Đăng Nhập')
      openAuthModal()
    }
  }, [isLoading, isAuthenticated, openAuthModal, toast])


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
