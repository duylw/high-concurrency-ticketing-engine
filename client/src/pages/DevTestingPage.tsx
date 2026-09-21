import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Sparkles,
  Ticket,
  ShieldCheck,
  Zap,
  AlertTriangle,
  Info,
  Check,
  KeyRound,
  RefreshCw,
  UserCheck,
} from 'lucide-react'
import { Button, Badge, Modal, Drawer } from '@/components/common'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'

export const DevTestingPage: React.FC = () => {
  const toast = useToast()
  const { user, isAuthenticated, isOrganizer, login, openAuthModal } = useAuth()

  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoadingActive, setIsLoadingActive] = useState(false)
  const [isTestingRtr, setIsTestingRtr] = useState(false)

  // Fast login helper for testing
  const handleQuickLogin = async (email: string, pass: string) => {
    try {
      await login({ email, password: pass })
    } catch {
      // Toast already notified
    }
  }

  // Test Silent RTR (Refresh Token Rotation)
  const handleTestRtr = async () => {
    setIsTestingRtr(true)
    try {
      // 1. Manually corrupt access token in localStorage to force HTTP 401
      localStorage.setItem('ticketing_access_token', 'corrupted_expired_token_for_testing')

      toast.info('Đã giả lập Access Token hết hạn. Đang gửi request tới GET /auth/me...', 'Kiểm Thử RTR')

      // 2. Make an authenticated call - interceptor should catch 401, call /auth/refresh-token, get new token and retry!
      const profile = await authApi.getMe()

      toast.success(
        `RTR thành công! Interceptor đã tự động làm mới token và hoàn tất request: ${profile.email}`,
        'Silent RTR Hoạt Động Hoàn Hảo'
      )
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Kiểm thử RTR thất bại'
      toast.error(msg, 'RTR Thất Bại')
    } finally {
      setIsTestingRtr(false)
    }
  }

  return (
    <div className="py-8 pb-16">
      <div className="container mx-auto px-6 max-w-[1000px]">
        {/* Header Title */}
        <div className="text-center mb-12">
          <div className="inline-flex mb-3">
            <Badge variant="glow">
              <Sparkles size={12} className="mr-1" />
              DevTools & Verification Playground
            </Badge>
          </div>
          <h1 className="text-4xl font-extrabold tracking-tight text-text-primary mb-3">
            Ticketing Engine <span className="text-brand-neon">Testing Studio</span>
          </h1>
          <p className="max-w-[680px] mx-auto text-base text-text-secondary leading-relaxed">
            Khu vực kiểm thử tập trung cho toàn bộ các tính năng mạng (Silent RTR), xác thực phân quyền
            (RBAC), thông báo Toast và các thành phần giao diện Atomic.
          </p>
        </div>

        <div className="flex flex-col gap-10">
          {/* SECTION 1: AUTHENTICATION & NETWORK TESTING PANEL */}
          <div className="glass-panel-glow p-8">
            <div className="flex items-center justify-between mb-6 flex-wrap gap-4">
              <div className="flex items-center gap-3">
                <KeyRound className="text-brand-neon" size={24} />
                <h2 className="text-2xl font-bold text-text-primary">
                  Network & Auth State Verification (Task 16B)
                </h2>
              </div>
              <Badge variant={isAuthenticated ? 'success' : 'neutral'}>
                {isAuthenticated ? 'ĐÃ ĐĂNG NHẬP' : 'KHÁCH VÃNG LAI (GUEST)'}
              </Badge>
            </div>

            {/* Current Auth Status Card */}
            <div className="bg-white/[0.03] border border-border-subtle rounded-xl p-5 mb-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <span className="text-xs text-text-muted font-medium">Người dùng:</span>
                  <div className="font-semibold text-text-primary mt-0.5 truncate">
                    {user ? `${user.name || user.username} (${user.email})` : 'Chưa xác thực'}
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted font-medium">Vai trò (Role):</span>
                  <div className="mt-0.5">
                    <Badge variant={isOrganizer ? 'glow' : 'info'} withDot={false}>
                      {user ? user.role : 'GUEST'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-xs text-text-muted font-medium">Quyền Ban Tổ Chức:</span>
                  <div className={`font-semibold mt-0.5 ${isOrganizer ? 'text-emerald-400' : 'text-text-muted'}`}>
                    {isOrganizer ? 'CÓ (FULL ACCESS)' : 'KHÔNG'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons for Task 16B Verification */}
            <div className="flex flex-wrap gap-4">
              {!isAuthenticated ? (
                <>
                  <Button
                    variant="primary"
                    leftIcon={<UserCheck size={16} />}
                    onClick={() => handleQuickLogin('buyer@ticketing.com', 'Password123!')}
                  >
                    Quick-Login: Khách Mua (buyer@ticketing.com)
                  </Button>
                  <Button
                    variant="neon"
                    leftIcon={<ShieldCheck size={16} />}
                    onClick={() => handleQuickLogin('organizer@ticketing.com', 'Password123!')}
                  >
                    Quick-Login: Ban Tổ Chức (organizer@ticketing.com)
                  </Button>
                  <Button variant="outline" onClick={openAuthModal}>
                    Mở Form Đăng Nhập / Đăng Ký
                  </Button>
                </>
              ) : (
                <>
                  <Button
                    variant="primary"
                    leftIcon={<RefreshCw size={16} />}
                    isLoading={isTestingRtr}
                    onClick={handleTestRtr}
                  >
                    Kiểm Thử Silent RTR (Token Rotation Interceptor)
                  </Button>
                  <Link to="/my-orders">
                    <Button variant="outline" leftIcon={<Ticket size={16} />}>
                      Vào Tuyến Đường Bảo Vệ (/my-orders)
                    </Button>
                  </Link>
                  {isOrganizer && (
                    <Link to="/organizer">
                      <Button variant="neon" leftIcon={<ShieldCheck size={16} />}>
                        Vào Tuyến Đường Ban Tổ Chức (/organizer)
                      </Button>
                    </Link>
                  )}
                </>
              )}
            </div>
          </div>

          {/* SECTION 2: ATOMIC COMPONENTS SHOWCASE */}
          <div className="glass-panel p-8">
            <div className="flex items-center gap-3 mb-6">
              <Zap className="text-brand-neon" size={24} />
              <h2 className="text-2xl font-bold text-text-primary">
                Atomic UI Showcase & Toast Controls
              </h2>
            </div>
            <div className="flex flex-wrap gap-4 mb-6">
              <Button variant="primary" onClick={() => setIsModalOpen(true)}>
                Mở Modal Giữ Vé
              </Button>
              <Button variant="neon" onClick={() => setIsDrawerOpen(true)}>
                Mở Checkout Drawer
              </Button>
              <Button
                variant="outline"
                isLoading={isLoadingActive}
                onClick={() => setIsLoadingActive(!isLoadingActive)}
              >
                {isLoadingActive ? 'Đang Tải...' : 'Bật/Tắt Loading Spinner'}
              </Button>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button
                variant="neon"
                size="sm"
                leftIcon={<Check size={14} />}
                onClick={() => toast.success('Đã tải danh sách sự kiện từ Redis Cache!')}
              >
                Toast Success
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<AlertTriangle size={14} />}
                onClick={() => toast.error('Mã vé đã được check-in trước đó (409)!')}
              >
                Toast Error
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Info size={14} />}
                onClick={() => toast.info('Đang đồng bộ phiên làm việc ngầm...')}
              >
                Toast Info
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<AlertTriangle size={14} />}
                onClick={() => toast.warning('Còn 2 phút giữ vé trước khi BullMQ hoàn vé.')}
              >
                Toast Warning
              </Button>
            </div>
          </div>
        </div>

        {/* Modal Instance */}
        <Modal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          title="Xác Nhận Giữ Chỗ Sự Kiện"
          footer={
            <>
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>Hủy Bỏ</Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsModalOpen(false)
                  toast.success('Đã xác nhận đặt chỗ thành công!')
                }}
              >
                Tiếp Tục Thanh Toán
              </Button>
            </>
          }
        >
          <p className="text-text-secondary leading-relaxed">
            Bạn đang tiến hành giữ vé cho sự kiện <span className="text-brand-neon font-semibold">Coldplay Music of the Spheres</span>.
          </p>
        </Modal>

        {/* Drawer Instance */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Giỏ Hàng & Thanh Toán"
          footer={
            <Button
              variant="neon"
              size="lg"
              className="w-full"
              onClick={() => {
                setIsDrawerOpen(false)
                toast.success('Đơn hàng thanh toán thành công!')
              }}
            >
              Xác Nhận Thanh Toán
            </Button>
          }
        >
          <p className="text-text-secondary leading-relaxed">
            Đồng hồ giữ vé 10 phút của BullMQ đang chạy.
          </p>
        </Drawer>
      </div>
    </div>
  )
}
