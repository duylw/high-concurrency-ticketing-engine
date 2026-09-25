import React, { useEffect, useState } from 'react'
import { useParams, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Calendar,
  MapPin,
  Clock,
  ShieldCheck,
  AlertCircle,
  RefreshCw,
  Ticket,
} from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { TicketTierCard, CheckoutDrawer, ETicketModal } from '@/components/customer'
import { eventsApi, ordersApi } from '@/api'
import { useAuth } from '@/context/AuthContext'
import { useToast } from '@/context/ToastContext'
import { useCountdown } from '@/hooks/useCountdown'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import type { EventItem, TicketTier, Order } from '@/types'

export const EventDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const { isAuthenticated, openAuthModal } = useAuth()
  const toast = useToast()

  const [event, setEvent] = useState<EventItem | null>(null)
  const [selectedTier, setSelectedTier] = useState<TicketTier | null>(null)
  const [selectedQuantity, setSelectedQuantity] = useState<number>(1)
  const [isLoading, setIsLoading] = useState<boolean>(true)
  const [isHolding, setIsHolding] = useState<boolean>(false)
  const [error, setError] = useState<string | null>(null)

  // Drawer and Modal states
  const [pendingOrder, setPendingOrder] = useState<Order | null>(null)
  const [isCheckoutOpen, setIsCheckoutOpen] = useState<boolean>(false)
  const [completedOrder, setCompletedOrder] = useState<Order | null>(null)
  const [isETicketOpen, setIsETicketOpen] = useState<boolean>(false)

  const fetchEvent = async () => {
    if (!id) return
    setIsLoading(true)
    setError(null)
    try {
      const data = await eventsApi.getEventById(id)
      setEvent(data)
      // Default to first tier with available stock, or first tier
      if (data.ticketTiers && data.ticketTiers.length > 0) {
        const firstAvailable = data.ticketTiers.find((t) => t.availableStock > 0)
        setSelectedTier(firstAvailable || data.ticketTiers[0])
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không tìm thấy sự kiện'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvent()
  }, [id])

  // Countdown for flash sale start
  const now = Date.now()
  const saleStart = event ? new Date(event.saleStartTime).getTime() : 0
  const saleEnd = event ? new Date(event.saleEndTime).getTime() : 0

  const isUpcoming = event ? now < saleStart : false
  const isEnded = event ? now > saleEnd : false
  const isSaleActive = event ? !isUpcoming && !isEnded : false

  const countdown = useCountdown(isUpcoming && event ? event.saleStartTime : null)

  // Total amount calculation
  const totalAmount = (selectedTier?.price || 0) * selectedQuantity

  const handleTierSelect = (tier: TicketTier) => {
    setSelectedTier(tier)
    // Clamp quantity if selectedQuantity exceeds tier's available stock
    if (selectedQuantity > tier.availableStock) {
      setSelectedQuantity(Math.max(1, tier.availableStock))
    }
  }

  const handleHoldTicket = async () => {
    if (!event || !selectedTier) {
      toast.error('Vui lòng chọn một hạng vé.')
      return
    }

    if (!isAuthenticated) {
      toast.info('Vui lòng đăng nhập để thực hiện đặt vé!')
      openAuthModal()
      return
    }

    if (selectedTier.availableStock <= 0) {
      toast.error('Hạng vé này đã hết vé. Vui lòng chọn hạng vé khác.')
      return
    }

    setIsHolding(true)
    try {
      const order = await ordersApi.holdTicket({
        eventId: event.id,
        ticketTierId: selectedTier.id,
        quantity: selectedQuantity,
      })

      // Locally decrement stock for instant feedback
      setSelectedTier((prev) =>
        prev ? { ...prev, availableStock: prev.availableStock - selectedQuantity } : null
      )
      setEvent((prev) => {
        if (!prev) return null
        return {
          ...prev,
          availableStock: Math.max(0, prev.availableStock - selectedQuantity),
          ticketTiers: prev.ticketTiers?.map((t) =>
            t.id === selectedTier.id
              ? { ...t, availableStock: Math.max(0, t.availableStock - selectedQuantity) }
              : t
          ),
        }
      })

      setPendingOrder(order)
      setIsCheckoutOpen(true)
      toast.success(
        `Đã giữ ${selectedQuantity} vé thành công! Vui lòng hoàn tất thanh toán trước khi hết giờ.`,
        'Giữ Chỗ Thành Công'
      )
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể giữ vé. Vé có thể đã hết.'
      toast.error(msg, 'Giữ Vé Thất Bại')
      // Refresh event details to sync exact inventory
      fetchEvent()
    } finally {
      setIsHolding(false)
    }
  }

  const handleCheckoutSuccess = (order: Order) => {
    setCompletedOrder(order)
    setIsETicketOpen(true)
    // Refresh event data to ensure stock reflects paid state
    fetchEvent()
  }

  if (isLoading) {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <div className="glass-panel p-12 max-w-[480px] mx-auto animate-pulse">
          <div className="w-12 h-12 bg-white/10 rounded-full mx-auto mb-4" />
          <div className="h-6 bg-white/10 rounded w-2/3 mx-auto mb-3" />
          <div className="h-4 bg-white/5 rounded w-1/2 mx-auto" />
        </div>
      </div>
    )
  }

  if (error || !event) {
    return (
      <div className="container mx-auto px-6 py-20 text-center">
        <div className="glass-panel p-12 max-w-[520px] mx-auto border-rose-500/30">
          <AlertCircle size={48} className="text-rose-400 mx-auto mb-4" />
          <h2 className="text-xl font-bold text-text-primary mb-2">Không tìm thấy sự kiện</h2>
          <p className="text-sm text-text-muted mb-6">{error || 'Sự kiện không tồn tại hoặc đã bị xóa.'}</p>
          <div className="flex justify-center gap-4">
            <Link to="/events">
              <Button variant="outline" leftIcon={<ArrowLeft size={16} />}>
                Danh Mục Sự Kiện
              </Button>
            </Link>
            <Button variant="primary" onClick={fetchEvent} leftIcon={<RefreshCw size={16} />}>
              Thử Lại
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="py-8 pb-20">
      <div className="container mx-auto px-6 max-w-[1240px]">
        {/* Back Link */}
        <div className="mb-6">
          <Link
            to="/events"
            className="inline-flex items-center gap-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
          >
            <ArrowLeft size={16} />
            <span>Quay lại danh sách sự kiện</span>
          </Link>
        </div>

        {/* Hero Header Card */}
        <div className="glass-panel overflow-hidden mb-10 border-border-subtle">
          <div className="relative aspect-[21/9] sm:aspect-[24/9] max-h-[360px] w-full overflow-hidden bg-dark-tertiary">
            {event.bannerUrl ? (
              <img
                src={event.bannerUrl}
                alt={event.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-indigo-950 via-dark-surface to-dark-tertiary" />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#07090E] via-[#07090E]/60 to-transparent" />

            <div className="absolute bottom-6 left-6 right-6">
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {isUpcoming ? (
                  <Badge variant="warning">Sắp Mở Bán ⏳</Badge>
                ) : isSaleActive && event.availableStock > 0 ? (
                  <Badge variant="success">Đang Mở Bán ⚡</Badge>
                ) : event.availableStock <= 0 ? (
                  <Badge variant="danger">Hết Vé (Sold Out)</Badge>
                ) : (
                  <Badge variant="neutral">Đã Kết Thúc</Badge>
                )}

                <Badge variant="neutral" withDot={false}>
                  Còn {event.availableStock} / {event.totalStock} vé
                </Badge>
              </div>

              <h1 className="text-2xl sm:text-4xl font-extrabold text-text-primary tracking-tight mb-2">
                {event.title}
              </h1>

              <div className="flex flex-wrap items-center gap-4 sm:gap-6 text-xs sm:text-sm text-text-secondary">
                <div className="flex items-center gap-2">
                  <Calendar size={16} className="text-brand-neon" />
                  <span>{formatDateTime(event.eventDate)}</span>
                </div>
                <div className="flex items-center gap-2">
                  <MapPin size={16} className="text-text-muted" />
                  <span>{event.venue || 'Địa điểm thông báo sau'}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Event Description */}
          {event.description && (
            <div className="p-6 border-t border-border-subtle">
              <h3 className="text-sm font-bold uppercase tracking-wider text-text-muted mb-2">
                Giới Thiệu Sự Kiện
              </h3>
              <p className="text-sm sm:text-base text-text-secondary leading-relaxed whitespace-pre-line">
                {event.description}
              </p>
            </div>
          )}
        </div>

        {/* Flash Sale Countdown Notice if Upcoming */}
        {isUpcoming && !countdown.isExpired && (
          <div className="mb-8 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between flex-wrap gap-4">
            <div className="flex items-center gap-3">
              <Clock size={24} className="text-amber-400 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-amber-300">
                  Thời gian mở bán Flash-Sale sắp bắt đầu!
                </h4>
                <p className="text-xs text-text-muted">
                  Nút đặt vé sẽ tự động kích hoạt ngay khi đồng hồ về 0.
                </p>
              </div>
            </div>
            <div className="font-mono text-xl font-extrabold text-amber-400 bg-amber-500/20 px-4 py-1.5 rounded-lg border border-amber-500/40">
              {countdown.formatted}
            </div>
          </div>
        )}

        {/* Main 2-Column Content: Left Tiers List, Right Checkout Summary */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Ticket Tiers Selection */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-text-primary flex items-center gap-2">
                <Ticket size={20} className="text-brand-neon" />
                <span>Chọn Hạng Vé</span>
              </h2>
              <span className="text-xs text-text-muted">
                Tồn kho cập nhật theo thời gian thực
              </span>
            </div>

            {(!event.ticketTiers || event.ticketTiers.length === 0) ? (
              <div className="glass-panel p-8 text-center text-text-muted">
                Chưa có hạng vé nào được mở bán cho sự kiện này.
              </div>
            ) : (
              <div className="space-y-3">
                {event.ticketTiers.map((tier) => (
                  <div
                    key={tier.id}
                    onClick={() => handleTierSelect(tier)}
                    className="cursor-pointer"
                  >
                    <TicketTierCard
                      tier={tier}
                      selectedQuantity={selectedTier?.id === tier.id ? selectedQuantity : 0}
                      onQuantityChange={(qty) => {
                        setSelectedTier(tier)
                        setSelectedQuantity(qty)
                      }}
                      disabled={!isSaleActive || tier.availableStock <= 0}
                      maxPerOrder={4}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Order Summary & Hold Button */}
          <div>
            <div className="glass-panel p-6 sticky top-24 border-border-subtle space-y-5">
              <h3 className="text-base font-bold text-text-primary border-b border-border-subtle pb-3">
                Tóm Tắt Đặt Vé
              </h3>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Hạng vé:</span>
                  <span className="font-bold text-brand-neon">
                    {selectedTier?.name || 'Chưa chọn'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Đơn giá:</span>
                  <span className="font-semibold text-text-primary">
                    {selectedTier ? formatCurrency(selectedTier.price) : '0 ₫'}
                  </span>
                </div>

                <div className="flex justify-between items-center">
                  <span className="text-text-muted">Số lượng:</span>
                  <span className="font-bold text-text-primary">
                    {selectedQuantity} vé
                  </span>
                </div>

                <div className="pt-3 border-t border-dashed border-border-medium flex justify-between items-baseline">
                  <span className="font-bold text-text-primary">Tạm tính:</span>
                  <span className="text-2xl font-extrabold text-emerald-400">
                    {formatCurrency(totalAmount)}
                  </span>
                </div>
              </div>

              {/* Action Button */}
              <Button
                variant={isSaleActive && selectedTier && selectedTier.availableStock > 0 ? 'neon' : 'primary'}
                size="lg"
                className="w-full"
                isLoading={isHolding}
                disabled={!isSaleActive || !selectedTier || selectedTier.availableStock <= 0 || isHolding}
                onClick={handleHoldTicket}
              >
                {isUpcoming
                  ? 'Chờ Mở Bán Flash-Sale...'
                  : isEnded
                  ? 'Sự Kiện Đã Đóng Bán'
                  : selectedTier && selectedTier.availableStock <= 0
                  ? 'Hạng Vé Đã Hết'
                  : 'Giữ Vé & Thanh Toán'}
              </Button>

              {/* Order Hold Notice */}
              <div className="p-3 bg-white/[0.02] border border-border-subtle rounded-xl flex items-start gap-2.5 text-xs text-text-muted leading-relaxed">
                <ShieldCheck size={16} className="text-emerald-400 shrink-0 mt-0.5" />
                <span>
                  Vé sẽ được tạm giữ cho bạn trong thời gian quy định. Vui lòng hoàn tất thanh toán trước khi đồng hồ đếm ngược kết thúc để đảm bảo giữ chỗ thành công.
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Slide-in Checkout Drawer */}
        <CheckoutDrawer
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          order={pendingOrder}
          onCheckoutSuccess={handleCheckoutSuccess}
        />

        {/* E-Ticket Modal after successful purchase */}
        <ETicketModal
          isOpen={isETicketOpen}
          onClose={() => setIsETicketOpen(false)}
          order={completedOrder}
        />
      </div>
    </div>
  )
}

export default EventDetailPage
