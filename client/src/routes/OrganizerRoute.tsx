import React, { useEffect } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export const OrganizerRoute: React.FC = () => {
  const { isAuthenticated, isOrganizer, isLoading, openAuthModal } = useAuth()
  const toast = useToast()

  useEffect(() => {
    if (!isLoading) {
      if (!isAuthenticated) {
        toast.warning('Vui lòng đăng nhập với tài khoản Ban Tổ Chức.', 'Yêu Cầu Đăng Nhập')
        openAuthModal()
      } else if (!isOrganizer) {
        toast.error('Bạn không có quyền truy cập khu vực Ban Tổ Chức.', 'Từ Chối Truy Cập (403)')
      }
    }
  }, [isLoading, isAuthenticated, isOrganizer, openAuthModal, toast])

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '50vh' }}>
        <span className="spinner" style={{ width: '2rem', height: '2rem' }} />
      </div>
    )
  }

  if (!isAuthenticated || !isOrganizer) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
