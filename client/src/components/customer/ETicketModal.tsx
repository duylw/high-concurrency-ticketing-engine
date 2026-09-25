import React, { useState } from 'react'
import { Ticket, Calendar, MapPin, CheckCircle2, QrCode } from 'lucide-react'
import { Modal, Badge } from '@/components/common'
import { generateQrSvg } from '@/utils/qrcode'
import { formatDateTime } from '@/utils/formatters'
import type { Order, TicketItem } from '@/types'

export interface ETicketModalProps {
  isOpen: boolean
  onClose: () => void
  order: Order | null
}

export const ETicketModal: React.FC<ETicketModalProps> = ({ isOpen, onClose, order }) => {
  const [activeTicketIndex, setActiveTicketIndex] = useState(0)

  if (!order) return null

  // Support both nested itemized tickets or fallback single ticket
  const tickets: TicketItem[] =
    order.tickets && order.tickets.length > 0
      ? order.tickets
      : [
          {
            id: order.id,
            orderId: order.id,
            ticketTierId: order.ticketTierId,
            ticketCode: `TKT-${order.id.slice(0, 8).toUpperCase()}-01`,
            qrPayload: order.qrPayload || order.id,
            status: order.status === 'CHECKED_IN' ? 'CHECKED_IN' : 'ISSUED',
          },
        ]

  const currentTicket = tickets[activeTicketIndex] || tickets[0]

  // Generate crisp ISO/IEC 18004 SVG QR code
  const qrSvgMarkup = generateQrSvg(
    currentTicket.ticketCode || currentTicket.qrPayload || currentTicket.id,
    220
  )

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-[480px]"
      title={
        <div className="flex items-center gap-2">
          <Ticket size={20} className="text-brand-neon" />
          <span>Vé Điện Tử (E-Ticket Pass)</span>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Event Header Card */}
        <div className="bg-white/[0.03] border border-border-subtle rounded-xl p-4 space-y-2">
          <h3 className="text-base font-bold text-text-primary">
            {order.event?.title || 'Sự Kiện Âm Nhạc & Biểu Diễn'}
          </h3>
          <div className="space-y-1 text-xs text-text-secondary">
            {order.event?.eventDate && (
              <div className="flex items-center gap-2">
                <Calendar size={14} className="text-brand-neon shrink-0" />
                <span>{formatDateTime(order.event.eventDate)}</span>
              </div>
            )}
            <div className="flex items-center gap-2">
              <MapPin size={14} className="text-text-muted shrink-0" />
              <span>{order.event?.venue || 'Địa điểm tổ chức sự kiện'}</span>
            </div>
          </div>
        </div>

        {/* Itemized Ticket Selector Tabs (if order has multiple tickets) */}
        {tickets.length > 1 && (
          <div>
            <div className="text-xs font-semibold text-text-muted mb-2">
              Danh sách vé trong đơn hàng ({tickets.length} vé):
            </div>
            <div className="flex flex-wrap gap-2">
              {tickets.map((t, idx) => (
                <button
                  key={t.id || idx}
                  type="button"
                  onClick={() => setActiveTicketIndex(idx)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    activeTicketIndex === idx
                      ? 'bg-brand-primary text-white shadow-md shadow-indigo-500/25'
                      : 'bg-white/5 border border-border-subtle text-text-secondary hover:bg-white/10'
                  }`}
                >
                  Vé #{idx + 1} ({t.status === 'CHECKED_IN' ? 'Đã Vào' : 'Hợp Lệ'})
                </button>
              ))}
            </div>
          </div>
        )}

        {/* E-Ticket Display Pass with QR Code */}
        <div className="glass-panel p-6 border border-brand-primary/30 text-center relative overflow-hidden">
          <div className="mb-4">
            <div className="text-xs font-bold text-text-muted uppercase tracking-wider mb-1">
              Hạng Vé
            </div>
            <div className="text-lg font-extrabold text-brand-neon">
              {order.ticketTier?.name || 'Hạng Vé Tiêu Chuẩn'}
            </div>
          </div>

          {/* SVG QR Code */}
          <div
            className="my-4 flex items-center justify-center"
            dangerouslySetInnerHTML={{ __html: qrSvgMarkup }}
          />

          {/* Ticket Code & Status */}
          <div className="space-y-2 mt-4">
            <div className="font-mono text-sm font-bold tracking-widest text-text-primary bg-black/30 py-1.5 px-4 rounded-lg inline-block border border-border-subtle">
              {currentTicket.ticketCode}
            </div>

            <div>
              {currentTicket.status === 'CHECKED_IN' ? (
                <Badge variant="info">ĐÃ CHECK-IN TẠI CỔNG</Badge>
              ) : (
                <Badge variant="success">
                  <CheckCircle2 size={12} className="mr-1" />
                  HỢP LỆ (SẴN SÀNG CHECK-IN)
                </Badge>
              )}
            </div>
          </div>
        </div>

        {/* Check-in Note */}
        <div className="flex items-start gap-2.5 p-3 rounded-lg bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-200">
          <QrCode size={16} className="shrink-0 mt-0.5 text-brand-neon" />
          <p className="leading-relaxed">
            Vui lòng xuất trình mã QR này tại cổng sự kiện để làm thủ tục vào cổng. Mỗi mã vé chỉ có hiệu
            lực cho 01 lượt check-in duy nhất và không thể tái sử dụng.
          </p>
        </div>
      </div>
    </Modal>
  )
}
