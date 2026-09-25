import React, { useEffect, useRef } from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'

export const OrganizerRoute: React.FC = () => {
  const { isAuthenticated, isOrganizer, isLoading, openAuthModal } = useAuth()
  const toast = useToast()
  const wasAuthenticatedRef = useRef(isAuthenticated)
  const hasNotifiedRef = useRef(false)

  useEffect(() => {
    // If the user was authenticated when this route mounted and now logged out,
    // do not trigger unauthorized warnings or open login modal
    if (wasAuthenticatedRef.current && !isAuthenticated) {
      return
    }

    if (!isLoading && !hasNotifiedRef.current) {
      if (!isAuthenticated) {
        hasNotifiedRef.current = true
        toast.warning('Vui lòng đăng nhập với tài khoản Ban Tổ Chức.', 'Yêu Cầu Đăng Nhập')
        openAuthModal()
      } else if (!isOrganizer) {
        hasNotifiedRef.current = true
        toast.error('Bạn không có quyền truy cập khu vực Ban Tổ Chức.', 'Từ Chối Truy Cập (403)')
      }
    }
  }, [isLoading, isAuthenticated, isOrganizer, openAuthModal, toast])


  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-[50vh]">
        <span className="spinner w-8 h-8" />
      </div>
    )
  }

  if (!isAuthenticated || !isOrganizer) {
    return <Navigate to="/" replace />
  }

  return <Outlet />
}
