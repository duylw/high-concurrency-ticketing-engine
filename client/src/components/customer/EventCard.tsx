import React from 'react'
import { Link } from 'react-router-dom'
import { Calendar, MapPin, Tag, ArrowRight, Clock } from 'lucide-react'
import { Badge, Button } from '@/components/common'
import { formatCurrency, formatDateTime } from '@/utils/formatters'
import { useCountdown } from '@/hooks/useCountdown'
import type { EventItem } from '@/types'

export interface EventCardProps {
  event: EventItem
}

export const EventCard: React.FC<EventCardProps> = ({ event }) => {
  const now = Date.now()
  const saleStart = new Date(event.saleStartTime).getTime()
  const saleEnd = new Date(event.saleEndTime).getTime()

  const isUpcoming = now < saleStart
  const isSaleActive = now >= saleStart && now <= saleEnd
  const isSoldOut = event.availableStock <= 0

  const countdown = useCountdown(isUpcoming ? event.saleStartTime : null)

  // Calculate price range from tiers
  const minPrice = event.ticketTiers && event.ticketTiers.length > 0
    ? Math.min(...event.ticketTiers.map((t) => t.price))
    : null

  const stockPercentage = event.totalStock > 0
    ? Math.max(0, Math.min(100, Math.round((event.availableStock / event.totalStock) * 100)))
    : 0

  const progressWidthStyle = { width: `${stockPercentage}%` }

  return (
    <div className="glass-panel overflow-hidden flex flex-col group hover:border-brand-primary/50 transition-all duration-300 hover:shadow-2xl hover:shadow-indigo-500/10 hover:-translate-y-1">
      {/* Banner / Media Container */}
      <div className="relative aspect-video w-full overflow-hidden bg-dark-tertiary">
        {event.bannerUrl ? (
          <img
            src={event.bannerUrl}
            alt={event.title}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-indigo-900/40 via-dark-surface to-dark-tertiary flex items-center justify-center p-6 text-center">
            <span className="text-xl font-bold text-brand-neon/80 tracking-tight">
              {event.title}
            </span>
          </div>
        )}

        {/* Status Badge Over Banner */}
        <div className="absolute top-3 left-3 z-10">
          {isUpcoming ? (
            <Badge variant="warning">Sắp Mở Bán</Badge>
          ) : isSaleActive && !isSoldOut ? (
            <Badge variant="success">Đang Mở Bán ⚡</Badge>
          ) : isSoldOut ? (
            <Badge variant="danger">Hết Vé (Sold Out)</Badge>
          ) : (
            <Badge variant="neutral">Đã Kết Thúc</Badge>
          )}
        </div>

        {/* Real-time Countdown Banner for Upcoming Events */}
        {isUpcoming && !countdown.isExpired && (
          <div className="absolute bottom-0 inset-x-0 bg-amber-500/90 backdrop-blur-md py-1.5 px-3 flex items-center justify-center gap-1.5 text-xs font-bold text-black tracking-wide">
            <Clock size={14} />
            <span>Mở bán sau: {countdown.formatted}</span>
          </div>
        )}
      </div>

      {/* Card Content */}
      <div className="p-5 flex-1 flex flex-col justify-between">
        <div>
          <h3 className="text-lg font-bold text-text-primary group-hover:text-brand-neon transition-colors line-clamp-1 mb-2">
            {event.title}
          </h3>

          <div className="space-y-1.5 text-xs text-text-secondary mb-4">
            <div className="flex items-center gap-2">
              <Calendar size={14} className="text-brand-neon shrink-0" />
              <span>{formatDateTime(event.eventDate)}</span>
            </div>
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-text-muted shrink-0" />
              <span className="truncate">{event.venue || 'Địa điểm thông báo sau'}</span>
            </div>
            {minPrice !== null && (
              <div className="flex items-center gap-2">
                <Tag size={14} className="text-emerald-400 shrink-0" />
                <span>Giá từ: <strong className="text-emerald-400 font-semibold">{formatCurrency(minPrice)}</strong></span>
              </div>
            )}
          </div>
        </div>

        <div>
          {/* Stock Availability Bar */}
          <div className="mb-4">
            <div className="flex items-center justify-between text-xs mb-1.5">
              <span className="text-text-muted">Vé khả dụng:</span>
              <span className="font-semibold text-text-secondary">
                {event.availableStock} / {event.totalStock} vé
              </span>
            </div>
            <div className="w-full h-1.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-500 ${
                  stockPercentage > 25 ? 'bg-gradient-to-r from-emerald-500 to-teal-400' : 'bg-rose-500'
                }`}
                style={progressWidthStyle}
              />
            </div>
          </div>

          {/* Action Link Button */}
          <Link to={`/events/${event.id}`} className="block">
            <Button
              variant={isSaleActive && !isSoldOut ? 'primary' : 'outline'}
              size="md"
              className="w-full"
              rightIcon={<ArrowRight size={16} />}
            >
              {isSaleActive && !isSoldOut ? 'Mua Vé Ngay' : 'Xem Chi Tiết'}
            </Button>
          </Link>
        </div>
      </div>
    </div>
  )
}
