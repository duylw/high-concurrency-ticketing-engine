import React, { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  Ticket,
  Calendar,
  Clock,
  AlertCircle,
  QrCode,
  ArrowRight,
  RefreshCw,
  ShoppingBag,
} from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { CheckoutDrawer, ETicketModal } from '@/components/customer'
import { ordersApi } from '@/api'
import { formatCurrency, formatDateTime, formatTimerSeconds } from '@/utils/formatters'
import type { Order } from '@/types'

export type OrderFilter = 'ALL' | 'PENDING' | 'COMPLETED' | 'CHECKED_IN'

export const MyOrdersPage: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([])
  const [activeFilter, setActiveFilter] = useState<OrderFilter>('ALL')
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [error, setError] = useState<string | null>(null)

  // Drawer / Modal states
  const [selectedOrderForDrawer, setSelectedOrderForDrawer] = useState<Order | null>(null)
  const [selectedOrderForModal, setSelectedOrderForModal] = useState<Order | null>(null)

  // Local ticker for pending orders countdown
  const [, setTick] = useState<number>(Date.now())

  const fetchOrders = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const data = await ordersApi.getMyOrders()
      setOrders(data)
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách vé'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [])

  // 1-second interval to update pending order countdowns
  useEffect(() => {
    const timer = setInterval(() => {
      setTick(Date.now())
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  const handleCheckoutSuccess = (completedOrder: Order) => {
    // Update list with newly completed order
    setOrders((prev) =>
      prev.map((o) => (o.id === completedOrder.id ? completedOrder : o))
    )
    // Open E-Ticket modal for immediate access
    setSelectedOrderForModal(completedOrder)
  }

  const now = Date.now()

  // Filter orders
  const filteredOrders = orders.filter((order) => {
    if (activeFilter === 'ALL') return true

    const isPending = order.status === 'PENDING'
    const isExpired = new Date(order.expiresAt).getTime() <= now
    const isCompleted = order.status === 'COMPLETED'
    const isPartiallyCheckedIn = order.status === 'PARTIALLY_CHECKED_IN'
    const isCheckedIn = order.status === 'CHECKED_IN'

    if (activeFilter === 'PENDING') {
      return isPending && !isExpired
    }
    if (activeFilter === 'COMPLETED') {
      return isCompleted || isPartiallyCheckedIn
    }
    if (activeFilter === 'CHECKED_IN') {
      return isCheckedIn || isPartiallyCheckedIn
    }
    return true
  })

  return (
    <div className="py-10 pb-20">
      <div className="container mx-auto px-6 max-w-[1140px]">
        {/* Page Header */}
        <div className="flex items-center justify-between flex-wrap gap-4 mb-8 pb-4 border-b border-border-subtle">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary flex items-center gap-2.5">
              <Ticket size={28} className="text-brand-neon" />
              <span>Ví Vé Điện Tử (My Orders)</span>
            </h1>
            <p className="text-sm text-text-muted mt-1">
              Quản lý các đơn đặt vé, theo dõi thời gian giữ chỗ và xuất trình mã QR tại cổng sự kiện.
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchOrders}
            disabled={isLoading}
          >
            Làm mới
          </Button>
        </div>

        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-2 mb-8">
          {(['ALL', 'PENDING', 'COMPLETED', 'CHECKED_IN'] as OrderFilter[]).map((tab) => {
            const labels: Record<OrderFilter, string> = {
              ALL: 'Tất Cả',
              PENDING: 'Chờ Thanh Toán',
              COMPLETED: 'Đã Thanh Toán',
              CHECKED_IN: 'Đã Check-in',
            }

            const isActive = activeFilter === tab
            return (
              <button
                key={tab}
                type="button"
                onClick={() => setActiveFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                  isActive
                    ? 'bg-brand-primary text-white shadow-md shadow-indigo-500/25'
                    : 'bg-white/5 border border-border-subtle text-text-secondary hover:text-text-primary hover:bg-white/10'
                }`}
              >
                {labels[tab]}
              </button>
            )
          })}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="space-y-4">
            {[1, 2, 3].map((key) => (
              <div key={key} className="glass-panel p-6 animate-pulse flex flex-col md:flex-row gap-6">
                <div className="w-full md:w-36 h-28 bg-white/5 rounded-xl shrink-0" />
                <div className="flex-1 space-y-3">
                  <div className="h-5 bg-white/10 rounded w-1/3" />
                  <div className="h-4 bg-white/5 rounded w-1/4" />
                  <div className="h-4 bg-white/5 rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="glass-panel p-8 text-center max-w-[500px] mx-auto border-rose-500/30">
            <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Không thể tải danh sách đơn hàng</h3>
            <p className="text-sm text-text-muted mb-5">{error}</p>
            <Button variant="primary" onClick={fetchOrders} leftIcon={<RefreshCw size={16} />}>
              Thử Lại
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredOrders.length === 0 && (
          <div className="glass-panel p-12 text-center max-w-[560px] mx-auto">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-text-muted mx-auto mb-4">
              <ShoppingBag size={32} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {activeFilter === 'PENDING'
                ? 'Không có đơn hàng nào đang chờ thanh toán'
                : activeFilter === 'COMPLETED'
                ? 'Bạn chưa có vé đã thanh toán nào'
                : activeFilter === 'CHECKED_IN'
                ? 'Bạn chưa có vé nào đã check-in'
                : 'Bạn chưa có đơn đặt vé nào'}
            </h3>
            <p className="text-sm text-text-muted mb-6">
              Khám phá các sự kiện âm nhạc đỉnh cao và sở hữu những tấm vé hot nhất ngay hôm nay!
            </p>
            <Link to="/events">
              <Button variant="neon" size="md" rightIcon={<ArrowRight size={16} />}>
                Khám Phá Sự Kiện Ngay
              </Button>
            </Link>
          </div>
        )}

        {/* Orders List */}
        {!isLoading && !error && filteredOrders.length > 0 && (
          <div className="space-y-6">
            {filteredOrders.map((order) => {
              const event = order.event || order.ticketTier?.event
              const tier = order.ticketTier
              const tickets = order.tickets || []

              const isCompleted = order.status === 'COMPLETED'
              const isPartiallyCheckedIn = order.status === 'PARTIALLY_CHECKED_IN'
              const isCheckedIn = order.status === 'CHECKED_IN'
              const isPending = order.status === 'PENDING'

              const expiresAtTime = new Date(order.expiresAt).getTime()
              const remainingSec = Math.max(0, Math.floor((expiresAtTime - now) / 1000))
              const isPendingActive = isPending && remainingSec > 0
              const isExpired = (isPending && remainingSec <= 0) || order.status === 'EXPIRED'

              return (
                <div
                  key={order.id}
                  className="glass-panel p-6 border-border-subtle hover:border-brand-primary/40 transition-all duration-200"
                >
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 pb-5 border-b border-border-subtle">
                    {/* Left: Event Banner & Info */}
                    <div className="flex items-start sm:items-center gap-4 flex-1">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden bg-dark-tertiary shrink-0 border border-border-subtle">
                        {event?.bannerUrl ? (
                          <img
                            src={event.bannerUrl}
                            alt={event.title}
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-dark-surface to-dark-tertiary flex items-center justify-center p-2 text-center text-xs font-bold text-brand-neon">
                            {event?.title || 'Sự Kiện'}
                          </div>
                        )}
                      </div>

                      <div className="space-y-1.5 min-w-0">
                        {/* Status Badge */}
                        <div>
                          {isCompleted && (
                            <Badge variant="success">✔ Đã Thanh Toán (Hợp Lệ)</Badge>
                          )}
                          {isPartiallyCheckedIn && (
                            <Badge variant="warning">
                              Đã Check-in (
                              {tickets.filter((t) => t.status === 'CHECKED_IN').length}/
                              {tickets.length || order.quantity} vé)
                            </Badge>
                          )}
                          {isCheckedIn && (
                            <Badge variant="info">Đã Check-in Toàn Bộ</Badge>
                          )}
                          {isPendingActive && (
                            <Badge variant="warning">
                              <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse mr-1" />
                              Chờ Thanh Toán ({formatTimerSeconds(remainingSec)})
                            </Badge>
                          )}
                          {isExpired && (
                            <Badge variant="danger">Đã Hết Hạn Giữ Chỗ</Badge>
                          )}
                        </div>

                        <h3 className="text-lg font-bold text-text-primary line-clamp-1">
                          {event?.title || 'Sự Kiện Âm Nhạc'}
                        </h3>

                        <div className="flex flex-wrap items-center gap-3 text-xs text-text-muted">
                          {event?.eventDate && (
                            <div className="flex items-center gap-1.5">
                              <Calendar size={13} className="text-brand-neon" />
                              <span>{formatDateTime(event.eventDate)}</span>
                            </div>
                          )}
                          <div>
                            Hạng vé: <strong className="text-text-secondary">{tier?.name || 'Tiêu Chuẩn'}</strong>
                          </div>
                          <div>
                            Số lượng: <strong className="text-text-secondary">{order.quantity} vé</strong>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: Total Price & Actions */}
                    <div className="flex flex-col md:items-end justify-between gap-3 shrink-0">
                      <div>
                        <span className="text-xs text-text-muted block md:text-right">Tổng thanh toán</span>
                        <span className="text-xl font-extrabold text-emerald-400">
                          {formatCurrency(order.totalAmount)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2.5">
                        {/* Action: Open E-Ticket Modal */}
                        {(isCompleted || isPartiallyCheckedIn || isCheckedIn) && (
                          <Button
                            variant="primary"
                            size="sm"
                            leftIcon={<QrCode size={15} />}
                            onClick={() => setSelectedOrderForModal(order)}
                          >
                            {tickets.length > 1
                              ? `Xem ${tickets.length} Vé & Mã QR`
                              : 'Xem Vé & Mã QR'}
                          </Button>
                        )}

                        {/* Action: Continue Checkout if Pending */}
                        {isPendingActive && (
                          <Button
                            variant="neon"
                            size="sm"
                            leftIcon={<Clock size={15} />}
                            onClick={() => setSelectedOrderForDrawer(order)}
                          >
                            Tiếp Tục Thanh Toán
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Itemized Tickets Row (if order has multiple tickets) */}
                  {tickets.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-border-subtle/60">
                      <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-2.5">
                        Danh Sách Vé Vào Cửa ({tickets.length} Vé):
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
                        {tickets.map((t, idx) => {
                          const isTicketCheckedIn = t.status === 'CHECKED_IN'
                          return (
                            <div
                              key={t.id || idx}
                              className="p-3 rounded-lg bg-white/[0.02] border border-border-subtle flex items-center justify-between gap-2"
                            >
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-text-primary">
                                  Vé #{idx + 1}
                                </div>
                                <div className="font-mono text-[11px] text-text-muted truncate">
                                  {t.ticketCode}
                                </div>
                              </div>

                              <div className="shrink-0 flex items-center gap-2">
                                {isTicketCheckedIn ? (
                                  <Badge variant="info">Đã Vào</Badge>
                                ) : (
                                  <Badge variant="success">Hợp Lệ</Badge>
                                )}
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  title="Xem mã QR"
                                  onClick={() => setSelectedOrderForModal(order)}
                                >
                                  <QrCode size={14} />
                                </Button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}

        {/* Checkout Drawer for resuming pending orders */}
        <CheckoutDrawer
          isOpen={!!selectedOrderForDrawer}
          onClose={() => setSelectedOrderForDrawer(null)}
          order={selectedOrderForDrawer}
          onCheckoutSuccess={handleCheckoutSuccess}
        />

        {/* E-Ticket Pass Modal */}
        <ETicketModal
          isOpen={!!selectedOrderForModal}
          onClose={() => setSelectedOrderForModal(null)}
          order={selectedOrderForModal}
        />
      </div>
    </div>
  )
}

export default MyOrdersPage
