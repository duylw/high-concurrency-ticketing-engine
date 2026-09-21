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
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
