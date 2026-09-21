import React, { useState } from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
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
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { OrganizerRoute } from '@/routes/OrganizerRoute'
import { useToast } from '@/context/ToastContext'
import { useAuth } from '@/context/AuthContext'
import { authApi } from '@/api'

// Placeholder views for subsequent tasks (16C, 16D)
const MyOrdersPlaceholder: React.FC = () => (
  <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
    <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <Ticket size={48} className="text-brand" style={{ margin: '0 auto 1rem' }} />
      <h2>Ví Vé Điện Tử (My Orders)</h2>
      <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        Khu vực bảo vệ (ProtectedRoute). Bạn đã đăng nhập thành công! Tính năng đầy đủ sẽ được triển khai trong Task 16C.
      </p>
      <Link to="/">
        <Button variant="outline">Quay Về Trang Chủ</Button>
      </Link>
    </div>
  </div>
)

const OrganizerPlaceholder: React.FC = () => (
  <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
    <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <ShieldCheck size={48} className="text-success" style={{ margin: '0 auto 1rem' }} />
      <h2>Kênh Ban Tổ Chức (Organizer Studio)</h2>
      <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        Khu vực phân quyền cao (OrganizerRoute). Bạn đang truy cập với vai trò Ban Tổ Chức! Tính năng đầy đủ sẽ được triển khai trong Task 16D.
      </p>
      <Link to="/">
        <Button variant="outline">Quay Về Trang Chủ</Button>
      </Link>
    </div>
  </div>
)

const ScannerPlaceholder: React.FC = () => (
  <div className="container" style={{ padding: '3rem 1.5rem', textAlign: 'center' }}>
    <div className="glass-panel" style={{ padding: '3rem', maxWidth: '600px', margin: '0 auto' }}>
      <Zap size={48} className="text-warning" style={{ margin: '0 auto 1rem' }} />
      <h2>Trạm Soát Vé Cổng (Universal Gate Scanner)</h2>
      <p style={{ marginTop: '0.5rem', marginBottom: '1.5rem' }}>
        Trạm soát vé 4 kênh (WebRTC camera, kéo thả ảnh, clipboard paste, mã vạch). Sẽ được triển khai trong Task 16D.
      </p>
      <Link to="/">
        <Button variant="outline">Quay Về Trang Chủ</Button>
      </Link>
    </div>
  </div>
)

const NotFoundPage: React.FC = () => (
  <div className="container" style={{ padding: '4rem 1.5rem', textAlign: 'center' }}>
    <h1 style={{ fontSize: '3rem', marginBottom: '1rem' }}>404</h1>
    <p style={{ marginBottom: '1.5rem' }}>Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
    <Link to="/">
      <Button variant="primary">Trở Về Trang Chủ</Button>
    </Link>
  </div>
)

// Main Home Page with Showcase & Task 16B Network/Auth Verification Panel
const HomePage: React.FC = () => {
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
    <div style={{ padding: '2rem 0 4rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Header Title */}
        <div style={{ textAlign: 'center', marginBottom: '3rem' }}>
          <div style={{ display: 'inline-flex', marginBottom: '0.75rem' }}>
            <Badge variant="glow">
              <Sparkles size={12} style={{ marginRight: '4px' }} />
              Phase 8 - Task 16B: Network Layer & Auth Routing
            </Badge>
          </div>
          <h1 style={{ marginBottom: '0.75rem', fontSize: '2.5rem' }}>
            Ticketing Engine <span className="text-brand">Client Core</span>
          </h1>
          <p style={{ maxWidth: '680px', margin: '0 auto', fontSize: '1.0625rem' }}>
            Hệ thống xác thực phản ứng (AuthContext), chuyển tuyến an toàn (React Router Guards) và tầng mạng Axios
            tích hợp cơ chế tự động xoay vòng Refresh Token (Silent RTR).
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* SECTION 1: AUTHENTICATION & NETWORK TESTING PANEL */}
          <div
            className="glass-panel"
            style={{
              padding: '2rem',
              border: '1px solid rgba(99, 102, 241, 0.4)',
              boxShadow: '0 0 30px rgba(99, 102, 241, 0.15)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <KeyRound className="text-brand" size={24} />
                <h2>Network & Auth State Verification (Task 16B)</h2>
              </div>
              <Badge variant={isAuthenticated ? 'success' : 'neutral'}>
                {isAuthenticated ? 'ĐÃ ĐĂNG NHẬP' : 'KHÁCH VÃNG LAI (GUEST)'}
              </Badge>
            </div>

            {/* Current Auth Status Card */}
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                border: '1px solid var(--color-border-subtle)',
                borderRadius: 'var(--radius-lg)',
                padding: '1.25rem',
                marginBottom: '1.5rem',
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Người dùng:</span>
                  <div style={{ fontWeight: 600, marginTop: '2px' }}>
                    {user ? `${user.name || user.username} (${user.email})` : 'Chưa xác thực'}
                  </div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Vai trò (Role):</span>
                  <div style={{ marginTop: '2px' }}>
                    <Badge variant={isOrganizer ? 'glow' : 'info'} withDot={false}>
                      {user ? user.role : 'GUEST'}
                    </Badge>
                  </div>
                </div>
                <div>
                  <span className="text-muted" style={{ fontSize: '0.8125rem' }}>Quyền Ban Tổ Chức:</span>
                  <div style={{ fontWeight: 600, marginTop: '2px', color: isOrganizer ? 'var(--color-success)' : 'var(--color-text-muted)' }}>
                    {isOrganizer ? 'CÓ (FULL ACCESS)' : 'KHÔNG'}
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons for Task 16B Verification */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
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

          {/* SECTION 2: ATOMIC COMPONENTS (Retained from 16A) */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Zap className="text-brand" size={24} />
              <h2>Atomic UI Showcase & Toast Controls</h2>
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
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
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.75rem' }}>
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
          <p>
            Bạn đang tiến hành giữ vé cho sự kiện <span className="text-brand">Coldplay Music of the Spheres</span>.
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
              style={{ width: '100%' }}
              onClick={() => {
                setIsDrawerOpen(false)
                toast.success('Đơn hàng thanh toán thành công!')
              }}
            >
              Xác Nhận Thanh Toán
            </Button>
          }
        >
          <p>Đồng hồ giữ vé 10 phút của BullMQ đang chạy.</p>
        </Drawer>
      </div>
    </div>
  )
}

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Public Route */}
          <Route path="/" element={<HomePage />} />

          {/* Protected Routes (Require Login) */}
          <Route element={<ProtectedRoute />}>
            <Route path="/my-orders" element={<MyOrdersPlaceholder />} />
          </Route>

          {/* Organizer Routes (Require ORGANIZER or ADMIN) */}
          <Route element={<OrganizerRoute />}>
            <Route path="/organizer" element={<OrganizerPlaceholder />} />
            <Route path="/scanner" element={<ScannerPlaceholder />} />
          </Route>

          {/* 404 Catch-All */}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
