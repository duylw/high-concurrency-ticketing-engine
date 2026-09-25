import React, { useState } from 'react'
import { Clock, ShieldCheck, AlertCircle, ArrowRight } from 'lucide-react'
import { Drawer, Button } from '@/components/common'
import { ordersApi } from '@/api'
import { useToast } from '@/context/ToastContext'
import { useCountdown } from '@/hooks/useCountdown'
import { formatCurrency, formatTimerSeconds } from '@/utils/formatters'
import type { Order } from '@/types'

export interface CheckoutDrawerProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
  onCheckoutSuccess: (completedOrder: Order) => void
}

export const CheckoutDrawer: React.FC<CheckoutDrawerProps> = ({
  isOpen,
  onClose,
  order,
  onCheckoutSuccess,
}) => {
  const toast = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)

  const countdown = useCountdown(order?.expiresAt)

  const handleCheckout = async () => {
    if (!order) return
    if (countdown.isExpired) {
      toast.error('Thời gian giữ vé đã hết hạn. Vui lòng chọn vé lại.', 'Hết Hạn Giữ Chỗ')
      onClose()
      return
    }

    setIsSubmitting(true)
    try {
      // Generate distributed idempotency key to defend against double clicks
      const idempotencyKey = crypto.randomUUID
        ? crypto.randomUUID()
        : `idemp_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`

      const completedOrder = await ordersApi.checkout(order.id, idempotencyKey)

      toast.success(
        `Thanh toán thành công đơn hàng #${order.id.slice(0, 8)}! Mã vé QR đã được tạo.`,
        'Thanh Toán Hoàn Tất'
      )
      onCheckoutSuccess(completedOrder)
      onClose()
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Thanh toán thất bại'
      toast.error(msg, 'Lỗi Thanh Toán')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!order) return null

  return (
    <Drawer
      isOpen={isOpen}
      onClose={onClose}
      title={
        <div className="flex items-center gap-2">
          <ShieldCheck size={20} className="text-emerald-400" />
          <span>Xác Nhận & Thanh Toán Vé</span>
        </div>
      }
      footer={
        <div className="space-y-3">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-muted">Tổng cộng thanh toán:</span>
            <span className="text-xl font-extrabold text-emerald-400">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>

          <Button
            variant="neon"
            size="lg"
            className="w-full"
            isLoading={isSubmitting}
            disabled={countdown.isExpired || isSubmitting}
            rightIcon={<ArrowRight size={18} />}
            onClick={handleCheckout}
          >
            {countdown.isExpired ? 'Hết Hạn Giữ Vé' : 'Xác Nhận & Thanh Toán'}
          </Button>
          <p className="text-[11px] text-text-muted text-center">
            Giao dịch được mã hóa và bảo vệ an toàn 100%.
          </p>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Hold Timer Alert Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3 transition-colors ${
            countdown.isExpired
              ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              : countdown.totalSeconds < 120
              ? 'bg-amber-500/15 border-amber-500/40 text-amber-300 animate-pulse'
              : 'bg-indigo-500/10 border-indigo-500/30 text-indigo-200'
          }`}
        >
          <Clock size={20} className="shrink-0 mt-0.5" />
          <div>
            <div className="text-sm font-bold flex items-center gap-2">
              <span>Thời gian giữ vé:</span>
              <span className="font-mono text-base font-extrabold">
                {countdown.isExpired ? 'ĐÃ HẾT HẠN' : formatTimerSeconds(countdown.totalSeconds)}
              </span>
            </div>
            <p className="text-xs text-text-muted mt-1 leading-relaxed">
              Vé sẽ tự động được hoàn về kho nếu bạn không hoàn tất thanh toán trước khi hết giờ.
            </p>
          </div>
        </div>

        {/* Order Details Summary */}
        <div className="glass-panel p-5 space-y-4">
          <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider text-text-muted">
            Chi Tiết Đơn Hàng
          </h4>

          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between">
              <span className="text-text-muted">Sự kiện:</span>
              <span className="font-semibold text-text-primary text-right max-w-[220px] truncate">
                {order.event?.title || 'Sự kiện'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-text-muted">Hạng vé:</span>
              <span className="font-semibold text-text-primary">
                {order.ticketTier?.name || 'Hạng vé tiêu chuẩn'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-text-muted">Số lượng:</span>
              <span className="font-semibold text-text-primary">{order.quantity} vé</span>
            </div>

            <div className="flex justify-between">
              <span className="text-text-muted">Đơn giá:</span>
              <span className="text-text-secondary">
                {order.ticketTier ? formatCurrency(order.ticketTier.price) : ''}
              </span>
            </div>
          </div>

          <div className="pt-3 border-t border-border-subtle flex justify-between items-center">
            <span className="font-bold text-text-primary">Thành tiền:</span>
            <span className="text-lg font-extrabold text-text-primary">
              {formatCurrency(order.totalAmount)}
            </span>
          </div>
        </div>

        {/* Security & Policy Note */}
        <div className="p-4 bg-white/[0.02] border border-border-subtle rounded-xl flex items-start gap-3">
          <AlertCircle size={18} className="text-text-muted shrink-0 mt-0.5" />
          <div className="text-xs text-text-muted leading-relaxed">
            Mỗi vé sau khi thanh toán thành công sẽ được cấp mã định danh duy nhất (UUID) và mã QR
            chuẩn ISO/IEC 18004 để làm thủ tục check-in tại cổng sự kiện.
          </div>
        </div>
      </div>
    </Drawer>
  )
}
