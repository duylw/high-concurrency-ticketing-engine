import React, { useEffect } from 'react'
import { CheckCircle2, AlertOctagon, User, Ticket, Calendar, Clock, ArrowRight } from 'lucide-react'
import { Modal, Button } from '@/components/common'
import { soundFx } from '@/utils/audio'
import type { CheckInResult } from '@/types'

export interface ScanResultModalProps {
  isOpen: boolean
  onClose: () => void
  successResult: CheckInResult | null
  conflictError: {
    message: string
    code?: string
    timestamp?: string
  } | null
}

export const ScanResultModal: React.FC<ScanResultModalProps> = ({
  isOpen,
  onClose,
  successResult,
  conflictError,
}) => {
  // Play sound effect on mount / status change
  useEffect(() => {
    if (!isOpen) return

    if (conflictError) {
      soundFx.playAntiPassback()
    } else if (successResult) {
      soundFx.playSuccess()
    }
  }, [isOpen, successResult, conflictError])

  if (!isOpen) return null

  const isConflict = Boolean(conflictError)

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      maxWidth="max-w-[540px]"
      className={isConflict ? 'border-rose-500/50 shadow-rose-950/50' : 'border-emerald-500/50 shadow-emerald-950/50'}
    >
      <div className="text-center py-2">
        {/* State 1: Anti-Passback Conflict (409) */}
        {isConflict ? (
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-rose-500/10 border-2 border-rose-500 flex items-center justify-center mx-auto text-rose-400 shadow-[0_0_30px_rgba(239,68,68,0.4)] animate-pulse">
              <AlertOctagon size={44} />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-rose-500/20 text-rose-300 font-extrabold text-xs uppercase tracking-widest border border-rose-500/30 mb-2">
                Cảnh Báo Quét Trùng Lặp
              </span>
              <h2 className="text-2xl font-black text-rose-400 tracking-tight">
                VÉ ĐÃ ĐƯỢC SỬ DỤNG!
              </h2>
              <p className="text-sm text-text-secondary mt-1 max-w-sm mx-auto">
                Từ chối cho phép qua cổng. Vé này đã được quét hợp lệ trước đó.
              </p>
            </div>

            {/* Error Detail Box */}
            <div className="p-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-left space-y-2 text-xs">
              <div className="flex items-start gap-2 text-rose-300 font-semibold">
                <span>Thông báo hệ thống:</span>
              </div>
              <p className="text-text-primary text-sm font-medium bg-black/40 p-2.5 rounded-lg border border-white/5 font-mono">
                {conflictError?.message || 'Ticket has ALREADY been used for check-in!'}
              </p>
              {conflictError?.code && (
                <div className="text-[11px] text-text-muted">
                  Mã lỗi: <code className="text-rose-400">{conflictError.code}</code>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="w-full py-3 bg-rose-500/20 border-rose-500/40 text-rose-200 hover:bg-rose-500/30 hover:border-rose-500 font-bold text-sm"
              >
                Tiếp Tục Soát Vé
              </Button>
            </div>
          </div>
        ) : successResult ? (
          /* State 2: Success Check-in (200) */
          <div className="space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/10 border-2 border-emerald-400 flex items-center justify-center mx-auto text-emerald-400 shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 size={44} />
            </div>

            <div>
              <span className="inline-block px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 font-extrabold text-xs uppercase tracking-widest border border-emerald-500/30 mb-2">
                Hợp Lệ - Cho Phép Qua Cổng
              </span>
              <h2 className="text-2xl font-black text-emerald-400 tracking-tight">
                CHECK-IN THÀNH CÔNG!
              </h2>
              <p className="text-xs text-text-secondary mt-1">
                Vé điện tử hợp lệ được cấp bởi hệ thống
              </p>
            </div>

            {/* Ticket & Attendee Details Card */}
            <div className="p-4 rounded-xl bg-white/[0.03] border border-white/10 text-left space-y-2.5 text-xs">
              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-text-muted flex items-center gap-1.5">
                  <User size={13} /> Khách tham dự:
                </span>
                <span className="font-bold text-text-primary text-sm">
                  {successResult.attendeeName || successResult.user?.name || successResult.user?.email || 'Khách Mua'}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Ticket size={13} /> Mã số vé:
                </span>
                <span className="font-mono font-bold text-indigo-300 text-sm">
                  {successResult.ticketCode}
                </span>
              </div>

              <div className="flex items-center justify-between pb-2 border-b border-white/5">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Calendar size={13} /> Hạng vé:
                </span>
                <span className="font-bold text-emerald-400">
                  {successResult.ticketTier?.name}
                  {successResult.ticketTier?.event?.title ? ` - ${successResult.ticketTier.event.title}` : ''}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-text-muted flex items-center gap-1.5">
                  <Clock size={13} /> Giờ soát vé:
                </span>
                <span className="text-text-primary">
                  {successResult.checkedInAt
                    ? new Date(successResult.checkedInAt).toLocaleTimeString('vi-VN')
                    : new Date().toLocaleTimeString('vi-VN')}
                </span>
              </div>

              {typeof successResult.order?.remainingTickets === 'number' && (
                <div className="pt-2 border-t border-white/5 flex items-center justify-between text-[11px] text-text-secondary">
                  <span>Vé còn lại trong đơn:</span>
                  <span className="font-bold text-amber-400">
                    {successResult.order.remainingTickets} vé chưa check-in
                  </span>
                </div>
              )}
            </div>

            <div className="pt-2">
              <Button
                variant="primary"
                onClick={onClose}
                className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-black font-extrabold text-sm shadow-lg shadow-emerald-500/20"
              >
                <span>Xác Nhận & Quét Người Kế Tiếp</span>
                <ArrowRight size={16} className="ml-1.5" />
              </Button>
            </div>
          </div>
        ) : null}
      </div>
    </Modal>
  )
}
