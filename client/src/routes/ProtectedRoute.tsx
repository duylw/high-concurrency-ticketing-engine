import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export const ProtectedRoute: React.FC = () => {
  const { isAuthenticated, isLoading, openAuthModal } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
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
