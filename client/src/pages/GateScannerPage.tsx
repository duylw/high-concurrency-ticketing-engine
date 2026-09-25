import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  Camera,
  Upload,
  Keyboard,
  Clipboard,
  ShieldCheck,
  CheckCircle,
  AlertOctagon,
  ArrowLeft,
  Volume2,
  VolumeX,
} from 'lucide-react'
import jsQR from 'jsqr'
import { Button, Badge } from '@/components/common'
import {
  CameraScanner,
  ImageDropzone,
  ManualCodeInput,
  ScanResultModal,
} from '@/components/scanner'
import { ordersApi } from '@/api/orders.api'
import { soundFx } from '@/utils/audio'
import { useToast } from '@/context'
import type { CheckInResult } from '@/types'

type ScanChannel = 'camera' | 'upload' | 'manual'

interface ScanHistoryItem {
  id: string
  ticketCode: string
  attendeeName?: string
  status: 'SUCCESS' | 'CONFLICT' | 'ERROR'
  message: string
  scannedAt: Date
}

export const GateScannerPage: React.FC = () => {
  const { showToast } = useToast()

  const [activeChannel, setActiveChannel] = useState<ScanChannel>('camera')
  const [isProcessing, setIsProcessing] = useState(false)
  const [soundEnabled, setSoundEnabled] = useState(true)

  // Counters
  const [stats, setStats] = useState({
    total: 0,
    valid: 0,
    conflicts: 0,
  })

  // History log
  const [history, setHistory] = useState<ScanHistoryItem[]>([])

  // Modal states
  const [isResultModalOpen, setIsResultModalOpen] = useState(false)
  const [successResult, setSuccessResult] = useState<CheckInResult | null>(null)
  const [conflictError, setConflictError] = useState<{
    message: string
    code?: string
  } | null>(null)

  // Unified ticket check-in processor
  const handleProcessCode = useCallback(
    async (code: string) => {
      const cleanCode = code.trim()
      if (!cleanCode || isProcessing) return

      setIsProcessing(true)

      try {
        const result = await ordersApi.checkInTicket(cleanCode)

        // Success 200
        setSuccessResult(result)
        setConflictError(null)
        setIsResultModalOpen(true)

        setStats((prev) => ({
          total: prev.total + 1,
          valid: prev.valid + 1,
          conflicts: prev.conflicts,
        }))

        setHistory((prev) => [
          {
            id: Math.random().toString(),
            ticketCode: result.ticketCode || cleanCode,
            attendeeName: result.attendeeName || result.user?.name || result.user?.email || 'Khách Mua',
            status: 'SUCCESS',
            message: 'Check-in hợp lệ',
            scannedAt: new Date(),
          },
          ...prev.slice(0, 19),
        ])
      } catch (err: unknown) {
        console.warn('[CHECK-IN SCAN ERROR]', err)
        const axiosErr = err as { response?: { status?: number; data?: { message?: string } } }
        const status = axiosErr?.response?.status
        const message = axiosErr?.response?.data?.message || (err as Error)?.message || 'Lỗi quét vé'

        if (status === 409 || message.toLowerCase().includes('already')) {
          // Anti-Passback Violation 409
          setSuccessResult(null)
          setConflictError({
            message,
            code: 'ANTI_PASSBACK_CONFLICT',
          })
          setIsResultModalOpen(true)

          setStats((prev) => ({
            total: prev.total + 1,
            valid: prev.valid,
            conflicts: prev.conflicts + 1,
          }))

          setHistory((prev) => [
            {
              id: Math.random().toString(),
              ticketCode: cleanCode,
              status: 'CONFLICT',
              message: message,
              scannedAt: new Date(),
            },
            ...prev.slice(0, 19),
          ])
        } else {
          // Other generic errors (403, 404, 400)
          if (soundEnabled) soundFx.playWarning()
          showToast({
            title: 'Lỗi Soát Vé',
            message,
            type: 'error',
          })

          setHistory((prev) => [
            {
              id: Math.random().toString(),
              ticketCode: cleanCode,
              status: 'ERROR',
              message,
              scannedAt: new Date(),
            },
            ...prev.slice(0, 19),
          ])
        }
      } finally {
        setIsProcessing(false)
      }
    },
    [isProcessing, showToast, soundEnabled]
  )

  // Channel 4: Global Clipboard Paste (Ctrl + V) listener
  useEffect(() => {
    const handleGlobalPaste = (e: ClipboardEvent) => {
      // Do not intercept if user is typing into an input or textarea
      const target = e.target as HTMLElement
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
        return
      }

      // 1. Check for image files in clipboard
      const items = e.clipboardData?.items
      if (items) {
        for (let i = 0; i < items.length; i++) {
          const item = items[i]
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile()
            if (file) {
              e.preventDefault()
              showToast({ message: 'Đang giải mã ảnh vé từ Clipboard...', type: 'info' })

              const img = new Image()
              const url = URL.createObjectURL(file)
              img.onload = () => {
                const canvas = document.createElement('canvas')
                canvas.width = img.naturalWidth || img.width
                canvas.height = img.naturalHeight || img.height
                const ctx = canvas.getContext('2d')
                if (ctx) {
                  ctx.drawImage(img, 0, 0)
                  const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height)
                  const code = jsQR(imgData.data, imgData.width, imgData.height, {
                    inversionAttempts: 'attemptBoth',
                  })
                  if (code && code.data) {
                    handleProcessCode(code.data)
                  } else {
                    showToast({
                      message: 'Không tìm thấy mã QR trong ảnh vừa dán từ clipboard.',
                      type: 'warning',
                    })
                  }
                }
              }
              img.src = url
              return
            }
          }
        }
      }

      // 2. Check for plain text (e.g. ticket code copied from text)
      const text = e.clipboardData?.getData('text')
      if (text && text.trim().length > 3) {
        e.preventDefault()
        showToast({ message: `Đã dán mã từ Clipboard: ${text.trim()}`, type: 'info' })
        handleProcessCode(text.trim())
      }
    }

    window.addEventListener('paste', handleGlobalPaste)
    return () => {
      window.removeEventListener('paste', handleGlobalPaste)
    }
  }, [handleProcessCode, showToast])

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-6xl animate-fade-in">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              to="/organizer"
              className="text-xs font-semibold text-text-muted hover:text-text-primary flex items-center gap-1 transition-colors"
            >
              <ArrowLeft size={13} /> Quay về Studio
            </Link>
            <span className="text-xs text-text-muted">/</span>
            <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Cổng Soát Vé
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Trạm Soát Vé Cổng Đa Kênh (Gate Scanner)
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Quét mã QR soát vé qua Camera, ảnh chụp, clipboard và tự động cảnh báo vé trùng lặp
          </p>
        </div>

        {/* Action Controls & Sound Switch */}
        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setSoundEnabled((prev) => !prev)}
            className={`border-white/10 ${soundEnabled ? 'text-emerald-400' : 'text-text-muted'}`}
            title={soundEnabled ? 'Âm thanh cảnh báo: Bật' : 'Âm thanh cảnh báo: Tắt'}
          >
            {soundEnabled ? <Volume2 size={16} className="mr-1.5" /> : <VolumeX size={16} className="mr-1.5" />}
            <span>{soundEnabled ? 'Âm Thanh Bật' : 'Âm Thanh Tắt'}</span>
          </Button>

          <Link to="/organizer">
            <Button variant="outline" size="sm">
              Quản Trị Doanh Số
            </Button>
          </Link>
        </div>
      </div>

      {/* Live Counter Cards */}
      <div className="grid grid-cols-3 gap-4 my-6">
        <div className="glass-panel p-4 rounded-xl border border-white/10 text-center">
          <span className="text-xs text-text-muted uppercase font-semibold">Tổng Lượt Quét</span>
          <div className="text-2xl sm:text-3xl font-black text-text-primary mt-1">
            {stats.total.toLocaleString()}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 text-center">
          <span className="text-xs text-emerald-400 uppercase font-semibold flex items-center justify-center gap-1">
            <CheckCircle size={13} /> Hợp Lệ (200)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-emerald-400 mt-1">
            {stats.valid.toLocaleString()}
          </div>
        </div>

        <div className="glass-panel p-4 rounded-xl border border-rose-500/20 bg-rose-500/5 text-center">
          <span className="text-xs text-rose-400 uppercase font-semibold flex items-center justify-center gap-1">
            <AlertOctagon size={13} /> Quét Trùng (409)
          </span>
          <div className="text-2xl sm:text-3xl font-black text-rose-400 mt-1">
            {stats.conflicts.toLocaleString()}
          </div>
        </div>
      </div>

      {/* 4-Channel Mode Switcher Tabs */}
      <div className="flex items-center justify-center gap-2 p-1.5 rounded-2xl bg-white/[0.03] border border-white/10 max-w-xl mx-auto mb-8">
        <button
          onClick={() => setActiveChannel('camera')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeChannel === 'camera'
              ? 'bg-brand-primary text-white shadow-lg shadow-indigo-500/25'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Camera size={15} />
          <span>Camera Trực Tiếp</span>
        </button>

        <button
          onClick={() => setActiveChannel('upload')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeChannel === 'upload'
              ? 'bg-brand-primary text-white shadow-lg shadow-indigo-500/25'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Upload size={15} />
          <span>Tải Ảnh Vé</span>
        </button>

        <button
          onClick={() => setActiveChannel('manual')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-bold transition-all ${
            activeChannel === 'manual'
              ? 'bg-brand-primary text-white shadow-lg shadow-indigo-500/25'
              : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
          }`}
        >
          <Keyboard size={15} />
          <span>Mã Barcode / Nhập</span>
        </button>
      </div>

      {/* Channel 4 Banner: Clipboard Paste Ready */}
      <div className="max-w-xl mx-auto mb-6 p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-between text-xs text-indigo-300">
        <div className="flex items-center gap-2">
          <Clipboard size={15} className="text-indigo-400 shrink-0" />
          <span>
            <strong>Kênh 4 (Clipboard):</strong> Bạn có thể bấm <kbd className="px-1.5 py-0.5 rounded bg-black/40 border border-white/10 font-mono text-white text-[11px]">Ctrl + V</kbd> ở bất kỳ đâu để dán ảnh chụp vé!
          </span>
        </div>
      </div>

      {/* Active Scanner Viewport */}
      <div className="mb-10">
        {activeChannel === 'camera' && (
          <CameraScanner
            onScan={handleProcessCode}
            isPaused={isResultModalOpen || isProcessing}
          />
        )}

        {activeChannel === 'upload' && (
          <ImageDropzone
            onScan={handleProcessCode}
            isProcessing={isProcessing}
          />
        )}

        {activeChannel === 'manual' && (
          <ManualCodeInput
            onSubmit={handleProcessCode}
            isProcessing={isProcessing}
          />
        )}
      </div>

      {/* Scan Activity Feed / History */}
      <div className="mt-12">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ShieldCheck size={18} className="text-brand-primary" />
            <h2 className="text-base font-bold text-text-primary">Nhật Ký Quét Vé Gần Đây</h2>
          </div>
          {history.length > 0 && (
            <button
              onClick={() => setHistory([])}
              className="text-xs text-text-muted hover:text-text-primary transition-colors"
            >
              Xóa lịch sử
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <div className="glass-panel p-8 text-center rounded-xl border border-white/5 text-xs text-text-muted">
            Chưa có lượt quét vé nào trong phiên làm việc hiện tại.
          </div>
        ) : (
          <div className="glass-panel rounded-xl border border-white/10 overflow-hidden shadow-lg">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-border-subtle uppercase tracking-wider text-[11px] text-text-muted font-semibold">
                  <tr>
                    <th className="px-4 py-3">Mã Vé</th>
                    <th className="px-4 py-3">Khách Tham Dự</th>
                    <th className="px-4 py-3">Kết Quả</th>
                    <th className="px-4 py-3">Thời Gian</th>
                    <th className="px-4 py-3">Chi Tiết</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-text-secondary">
                  {history.map((item) => (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-text-primary">
                        {item.ticketCode}
                      </td>
                      <td className="px-4 py-3 text-text-secondary">
                        {item.attendeeName || '---'}
                      </td>
                      <td className="px-4 py-3">
                        <Badge
                          variant={
                            item.status === 'SUCCESS'
                              ? 'success'
                              : item.status === 'CONFLICT'
                              ? 'danger'
                              : 'warning'
                          }
                        >
                          {item.status === 'SUCCESS'
                            ? '200 HỢP LỆ'
                            : item.status === 'CONFLICT'
                            ? '409 TRÙNG LẶP'
                            : 'LỖI'}
                        </Badge>
                      </td>
                      <td className="px-4 py-3 text-text-muted">
                        {item.scannedAt.toLocaleTimeString('vi-VN')}
                      </td>
                      <td className="px-4 py-3 text-text-secondary text-[11px] truncate max-w-xs">
                        {item.message}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Result & Anti-Passback Modal */}
      <ScanResultModal
        isOpen={isResultModalOpen}
        onClose={() => setIsResultModalOpen(false)}
        successResult={successResult}
        conflictError={conflictError}
      />
    </div>
  )
}
