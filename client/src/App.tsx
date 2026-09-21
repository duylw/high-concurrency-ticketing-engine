import React from 'react'
import { BrowserRouter, Routes, Route, Link } from 'react-router-dom'
import { Ticket, ShieldCheck, Zap } from 'lucide-react'
import { Button } from '@/components/common'
import { RootLayout } from '@/components/layout/RootLayout'
import { ProtectedRoute } from '@/routes/ProtectedRoute'
import { OrganizerRoute } from '@/routes/OrganizerRoute'
import { HomePage } from '@/pages/HomePage'
import { DevTestingPage } from '@/pages/DevTestingPage'

// Placeholder views for subsequent tasks (16C, 16D)
const MyOrdersPlaceholder: React.FC = () => (
  <div className="container mx-auto py-12 px-6 text-center">
    <div className="glass-panel p-12 max-w-[600px] mx-auto">
      <Ticket size={48} className="text-brand-neon mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-text-primary">Ví Vé Điện Tử (My Orders)</h2>
      <p className="mt-2 mb-6 text-text-secondary">
        Khu vực bảo vệ (ProtectedRoute). Bạn đã đăng nhập thành công! Tính năng đầy đủ sẽ được triển khai trong Task 16C.
      </p>
      <Link to="/">
        <Button variant="outline">Quay Về Trang Chủ</Button>
      </Link>
    </div>
  </div>
)

const OrganizerPlaceholder: React.FC = () => (
  <div className="container mx-auto py-12 px-6 text-center">
    <div className="glass-panel p-12 max-w-[600px] mx-auto">
      <ShieldCheck size={48} className="text-emerald-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-text-primary">Kênh Ban Tổ Chức (Organizer Studio)</h2>
      <p className="mt-2 mb-6 text-text-secondary">
        Khu vực phân quyền cao (OrganizerRoute). Bạn đang truy cập với vai trò Ban Tổ Chức! Tính năng đầy đủ sẽ được triển khai trong Task 16D.
      </p>
      <Link to="/">
        <Button variant="outline">Quay Về Trang Chủ</Button>
      </Link>
    </div>
  </div>
)

const ScannerPlaceholder: React.FC = () => (
  <div className="container mx-auto py-12 px-6 text-center">
    <div className="glass-panel p-12 max-w-[600px] mx-auto">
      <Zap size={48} className="text-amber-400 mx-auto mb-4" />
      <h2 className="text-2xl font-bold text-text-primary">Trạm Soát Vé Cổng (Universal Gate Scanner)</h2>
      <p className="mt-2 mb-6 text-text-secondary">
        Trạm soát vé 4 kênh (WebRTC camera, kéo thả ảnh, clipboard paste, mã vạch). Sẽ được triển khai trong Task 16D.
      </p>
      <Link to="/">
        <Button variant="outline">Quay Về Trang Chủ</Button>
      </Link>
    </div>
  </div>
)

const NotFoundPage: React.FC = () => (
  <div className="container mx-auto py-16 px-6 text-center">
    <h1 className="text-6xl font-extrabold text-text-primary mb-4">404</h1>
    <p className="text-text-secondary mb-6">Trang bạn tìm kiếm không tồn tại hoặc đã được di chuyển.</p>
    <Link to="/">
      <Button variant="primary">Trở Về Trang Chủ</Button>
    </Link>
  </div>
)

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<RootLayout />}>
          {/* Public Routes */}
          <Route path="/" element={<HomePage />} />
          <Route path="/dev" element={<DevTestingPage />} />

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
