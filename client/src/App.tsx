import React, { useState } from 'react'
import {
  Sparkles,
  Ticket,
  ShieldCheck,
  Zap,
  ShoppingBag,
  Bell,
  AlertTriangle,
  Info,
  Check,
  Layers,
} from 'lucide-react'
import { Button, Badge, Modal, Drawer } from '@/components/common'
import { useToast } from '@/context/ToastContext'

export const App: React.FC = () => {
  const toast = useToast()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [isDrawerOpen, setIsDrawerOpen] = useState(false)
  const [isLoadingActive, setIsLoadingActive] = useState(false)

  return (
    <div style={{ minHeight: '100vh', padding: '3rem 1.5rem' }}>
      <div className="container" style={{ maxWidth: '1000px' }}>
        {/* Header Title & Badge */}
        <div style={{ textAlign: 'center', marginBottom: '3.5rem' }}>
          <div style={{ display: 'inline-flex', marginBottom: '1rem' }}>
            <Badge variant="glow">
              <Sparkles size={12} style={{ marginRight: '4px' }} />
              Phase 8: Fullstack TypeScript & React SPA
            </Badge>
          </div>
          <h1 style={{ marginBottom: '0.75rem', fontSize: '2.5rem' }}>
            Ticketing Engine <span className="text-brand">Design System</span>
          </h1>
          <p style={{ maxWidth: '640px', margin: '0 auto', fontSize: '1.0625rem' }}>
            Bộ sưu tập các thành phần giao diện Atomic UI nền tảng (Task 16A), kế thừa toàn bộ Dark Theme,
            Glassmorphism và chuẩn kiểu dữ liệu TypeScript.
          </p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '2.5rem' }}>
          {/* Section 1: Buttons */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Zap className="text-brand" size={24} />
              <h2>Button Components & Variants</h2>
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Các biến thể nút bấm chuẩn hóa cho luồng mua vé, ban tổ chức và quản trị hệ thống:
            </p>

            {/* Variants */}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
              <Button variant="primary" leftIcon={<Ticket size={16} />}>
                Primary Action (Đặt Vé)
              </Button>
              <Button variant="neon" leftIcon={<Zap size={16} />}>
                Neon Action (Săn Flash-Sale)
              </Button>
              <Button variant="secondary">Secondary Button</Button>
              <Button variant="outline">Outline Action</Button>
              <Button variant="ghost">Ghost Button</Button>
              <Button variant="danger" leftIcon={<AlertTriangle size={16} />}>
                Danger Action
              </Button>
            </div>

            {/* Sizes & States */}
            <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '1rem' }}>
              <Button size="sm" variant="primary">Small</Button>
              <Button size="md" variant="primary">Medium (Default)</Button>
              <Button size="lg" variant="primary">Large</Button>
              <Button
                variant="primary"
                isLoading={isLoadingActive}
                onClick={() => setIsLoadingActive(!isLoadingActive)}
              >
                {isLoadingActive ? 'Đang Tải...' : 'Bấm Thử Spinner'}
              </Button>
              <Button variant="primary" disabled>
                Disabled
              </Button>
            </div>
          </div>

          {/* Section 2: Badges */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <ShieldCheck className="text-success" size={24} />
              <h2>Status Badges</h2>
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Thẻ trạng thái biểu thị vòng đời sự kiện, trạng thái đơn hàng và phân quyền tài khoản:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.875rem' }}>
              <Badge variant="success">ĐÃ THANH TOÁN (COMPLETED)</Badge>
              <Badge variant="warning">ĐANG GIỮ VÉ (PENDING)</Badge>
              <Badge variant="danger">HẾT HẠN (EXPIRED)</Badge>
              <Badge variant="info">CHECKED-IN CỔNG</Badge>
              <Badge variant="glow">FLASH-SALE ĐANG MỞ</Badge>
              <Badge variant="neutral">KHÁCH VÃNG LAI</Badge>
              <Badge variant="success" withDot={false}>Không Dot</Badge>
            </div>
          </div>

          {/* Section 3: Interactive Modal & Drawer */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Layers className="text-brand" size={24} />
              <h2>Interactive Overlays (Modal & Drawer)</h2>
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Các hộp thoại overlay với hiệu ứng mờ nền (Glassmorphism backdrop-filter) và trượt mượt mà:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <Button
                variant="outline"
                leftIcon={<Layers size={18} />}
                onClick={() => setIsModalOpen(true)}
              >
                Mở Modal Thử Nghiệm
              </Button>
              <Button
                variant="primary"
                leftIcon={<ShoppingBag size={18} />}
                onClick={() => setIsDrawerOpen(true)}
              >
                Mở Checkout Drawer
              </Button>
            </div>
          </div>

          {/* Section 4: Toast Notifications */}
          <div className="glass-panel" style={{ padding: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
              <Bell className="text-warning" size={24} />
              <h2>Toast Notification System (ToastContext)</h2>
            </div>
            <p style={{ marginBottom: '1.5rem' }}>
              Hệ thống thông báo toàn cục tự động biến mất với icon và animation trượt từ góc phải màn hình:
            </p>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem' }}>
              <Button
                variant="neon"
                size="sm"
                leftIcon={<Check size={16} />}
                onClick={() => toast.success('Giữ vé thành công! Bạn có 10 phút để thanh toán.', 'Thành Công')}
              >
                Toast Success
              </Button>
              <Button
                variant="danger"
                size="sm"
                leftIcon={<AlertTriangle size={16} />}
                onClick={() => toast.error('Mã vé đã được sử dụng trước đó (Anti-Passback violation)!', 'Cảnh Báo Check-in')}
              >
                Toast Error
              </Button>
              <Button
                variant="outline"
                size="sm"
                leftIcon={<Info size={16} />}
                onClick={() => toast.info('Hệ thống đang xoay vòng Refresh Token ngầm.', 'Bảo Mật')}
              >
                Toast Info
              </Button>
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<AlertTriangle size={16} />}
                onClick={() => toast.warning('Còn 2 phút cuối cùng để hoàn tất đơn hàng.', 'Thời Gian Giữ Vé')}
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
              <Button variant="ghost" onClick={() => setIsModalOpen(false)}>
                Hủy Bỏ
              </Button>
              <Button
                variant="primary"
                onClick={() => {
                  setIsModalOpen(false)
                  toast.success('Đã xác nhận thành công!')
                }}
              >
                Tiếp Tục Thanh Toán
              </Button>
            </>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <p>
              Bạn đang tiến hành giữ <strong>2 vé VIP Diamond Lounge</strong> cho sự kiện{' '}
              <span className="text-brand">Coldplay Music of the Spheres World Tour</span>.
            </p>
            <div
              style={{
                background: 'rgba(255, 255, 255, 0.03)',
                padding: '1rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-subtle)',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Đơn giá:</span>
                <span style={{ fontWeight: 600 }}>2.500.000 ₫</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span className="text-muted">Số lượng:</span>
                <span style={{ fontWeight: 600 }}>2 vé</span>
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  borderTop: '1px solid var(--color-border-subtle)',
                  paddingTop: '0.5rem',
                  fontWeight: 700,
                }}
              >
                <span>Tổng cộng:</span>
                <span className="text-success" style={{ fontSize: '1.125rem' }}>
                  5.000.000 ₫
                </span>
              </div>
            </div>
          </div>
        </Modal>

        {/* Drawer Instance */}
        <Drawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          title="Giỏ Hàng & Thanh Toán"
          footer={
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', width: '100%' }}>
              <Button
                variant="neon"
                size="lg"
                style={{ width: '100%' }}
                onClick={() => {
                  setIsDrawerOpen(false)
                  toast.success('Đơn hàng đã được thanh toán an toàn!', 'Thanh Toán Thành Công')
                }}
              >
                Xác Nhận Thanh Toán (5.000.000 ₫)
              </Button>
              <Button variant="ghost" style={{ width: '100%' }} onClick={() => setIsDrawerOpen(false)}>
                Tiếp Tục Chọn Vé
              </Button>
            </div>
          }
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
            <div
              style={{
                background: 'rgba(239, 68, 68, 0.12)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                padding: '0.875rem 1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <div
                style={{
                  width: '10px',
                  height: '10px',
                  borderRadius: '50%',
                  background: '#EF4444',
                  boxShadow: '0 0 10px #EF4444',
                }}
              />
              <div style={{ fontSize: '0.875rem' }}>
                <span style={{ fontWeight: 700, color: '#F87171' }}>Thời gian giữ vé: </span>
                <span style={{ fontFamily: 'monospace', fontWeight: 800, color: '#FCA5A5' }}>
                  09:42
                </span>
              </div>
            </div>

            <p style={{ fontSize: '0.9375rem' }}>
              Vé của bạn đã được khóa trên máy chủ phân tán Redis & BullMQ. Sau thời gian trên, vé sẽ tự
              động được trả về kho bán.
            </p>
          </div>
        </Drawer>
      </div>
    </div>
  )
}

export default App
