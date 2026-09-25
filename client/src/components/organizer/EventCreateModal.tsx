import React, { useState } from 'react'
import { Plus, Trash2, Calendar, Clock, DollarSign, Users, AlertCircle } from 'lucide-react'
import { Modal, Button } from '@/components/common'
import { organizerApi } from '@/api/organizer.api'
import { useToast } from '@/context'
import type { OrganizerEventItem } from '@/types'

export interface EventCreateModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess?: (event: OrganizerEventItem) => void
}

interface TierDraft {
  name: string
  price: number | ''
  totalStock: number | ''
}

export const EventCreateModal: React.FC<EventCreateModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const { showToast } = useToast()

  // Form states
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [venue, setVenue] = useState('Sân Vận Động Quốc Gia Mỹ Đình, Hà Nội')
  const [bannerUrl, setBannerUrl] = useState('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop')

  // Default dates: tomorrow 19:00 -> 23:00
  const getDefaultDates = () => {
    const start = new Date(Date.now() + 86400000)
    start.setHours(19, 0, 0, 0)
    const end = new Date(start.getTime() + 4 * 3600000)

    const toLocalISO = (d: Date) => {
      const offset = d.getTimezoneOffset() * 60000
      return new Date(d.getTime() - offset).toISOString().slice(0, 16)
    }

    return {
      startTime: toLocalISO(start),
      endTime: toLocalISO(end),
    }
  }

  const [dates, setDates] = useState(getDefaultDates())
  const [saleWindow, setSaleWindow] = useState({
    saleStartTime: '',
    saleEndTime: '',
  })
  const [status, setStatus] = useState<'PUBLISHED' | 'DRAFT'>('PUBLISHED')

  // Dynamic ticket tiers builder
  const [tiers, setTiers] = useState<TierDraft[]>([
    { name: 'VIP Early Bird', price: 1500000, totalStock: 100 },
    { name: 'Standard General', price: 650000, totalStock: 400 },
  ])

  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const handleAddTier = () => {
    setTiers((prev) => [...prev, { name: '', price: '', totalStock: '' }])
  }

  const handleRemoveTier = (index: number) => {
    if (tiers.length <= 1) {
      showToast({ message: 'Sự kiện phải có ít nhất một hạng vé!', type: 'warning' })
      return
    }
    setTiers((prev) => prev.filter((_, i) => i !== index))
  }

  const handleTierChange = (index: number, field: keyof TierDraft, value: string | number) => {
    setTiers((prev) => {
      const updated = [...prev]
      updated[index] = { ...updated[index], [field]: value }
      return updated
    })
  }

  const resetForm = () => {
    setTitle('')
    setDescription('')
    setVenue('Sân Vận Động Quốc Gia Mỹ Đình, Hà Nội')
    setBannerUrl('https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop')
    setDates(getDefaultDates())
    setSaleWindow({ saleStartTime: '', saleEndTime: '' })
    setStatus('PUBLISHED')
    setTiers([
      { name: 'VIP Early Bird', price: 1500000, totalStock: 100 },
      { name: 'Standard General', price: 650000, totalStock: 400 },
    ])
    setFormError(null)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setFormError(null)

    // Basic Validations
    if (!title.trim() || title.trim().length < 3) {
      setFormError('Tên sự kiện phải có tối thiểu 3 ký tự.')
      return
    }
    if (!description.trim() || description.trim().length < 10) {
      setFormError('Mô tả sự kiện phải có tối thiểu 10 ký tự.')
      return
    }
    if (!dates.startTime || !dates.endTime) {
      setFormError('Vui lòng chọn thời gian bắt đầu và kết thúc sự kiện.')
      return
    }

    const startDate = new Date(dates.startTime)
    const endDate = new Date(dates.endTime)
    if (endDate <= startDate) {
      setFormError('Thời gian kết thúc sự kiện phải diễn ra sau thời gian bắt đầu.')
      return
    }

    // Tiers validation
    if (tiers.length === 0) {
      setFormError('Vui lòng cấu hình ít nhất 1 hạng vé.')
      return
    }

    for (let i = 0; i < tiers.length; i++) {
      const t = tiers[i]
      if (!t.name.trim()) {
        setFormError(`Hạng vé thứ ${i + 1} chưa có tên.`)
        return
      }
      if (typeof t.price !== 'number' || t.price <= 0) {
        setFormError(`Giá hạng vé "${t.name}" phải lớn hơn 0 VND.`)
        return
      }
      if (typeof t.totalStock !== 'number' || t.totalStock <= 0) {
        setFormError(`Số lượng vé của "${t.name}" phải ít nhất là 1.`)
        return
      }
    }

    try {
      setIsSubmitting(true)

      const payload = {
        title: title.trim(),
        description: description.trim(),
        venue: venue.trim() || undefined,
        bannerUrl: bannerUrl.trim() || undefined,
        startTime: startDate.toISOString(),
        endTime: endDate.toISOString(),
        saleStartTime: saleWindow.saleStartTime ? new Date(saleWindow.saleStartTime).toISOString() : null,
        saleEndTime: saleWindow.saleEndTime ? new Date(saleWindow.saleEndTime).toISOString() : null,
        status,
        ticketTiers: tiers.map((t) => ({
          name: t.name.trim(),
          price: Number(t.price),
          totalStock: Number(t.totalStock),
        })),
      }

      const createdEvent = await organizerApi.createEventWithTiers(payload)

      showToast({
        title: 'Tạo Sự Kiện Thành Công!',
        message: `Sự kiện "${createdEvent.title}" với ${tiers.length} hạng vé đã sẵn sàng.`,
        type: 'success',
      })

      resetForm()
      onSuccess?.(createdEvent)
      onClose()
    } catch (err: unknown) {
      console.error('[EVENT CREATE MODAL ERROR]', err)
      const errorMsg = (err as Error)?.message || 'Không thể tạo sự kiện. Vui lòng kiểm tra lại dữ liệu.'
      setFormError(errorMsg)
      showToast({ title: 'Lỗi Tạo Sự Kiện', message: errorMsg, type: 'error' })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Tạo Sự Kiện & Lịch Mở Bán Flash-Sale"
      maxWidth="max-w-[700px]"
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        {formError && (
          <div className="flex items-center gap-2.5 p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
            <AlertCircle size={18} className="shrink-0 text-rose-400" />
            <span>{formError}</span>
          </div>
        )}

        {/* 1. Basic Info */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Tên Sự Kiện <span className="text-rose-400">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ví dụ: Anh Trai Say Hi Live Concert 2026"
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary transition-colors text-sm"
              required
              minLength={3}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
              Mô Tả Chi Tiết <span className="text-rose-400">*</span>
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="Giới thiệu về sự kiện, dàn nghệ sĩ, thời gian biểu diễn và sơ đồ chỗ ngồi..."
              className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary transition-colors text-sm resize-y"
              required
              minLength={10}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Địa Điểm Tổ Chức
              </label>
              <input
                type="text"
                value={venue}
                onChange={(e) => setVenue(e.target.value)}
                placeholder="Sân vận động, nhà hát..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary transition-colors text-sm"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-text-secondary uppercase tracking-wider mb-1.5">
                Banner URL (Ảnh Bìa)
              </label>
              <input
                type="url"
                value={bannerUrl}
                onChange={(e) => setBannerUrl(e.target.value)}
                placeholder="https://..."
                className="w-full px-3.5 py-2.5 rounded-xl bg-white/[0.04] border border-border-subtle text-text-primary placeholder:text-text-muted focus:outline-none focus:border-brand-primary transition-colors text-sm"
              />
            </div>
          </div>
        </div>

        {/* 2. Event Times */}
        <div className="p-4 rounded-xl bg-white/[0.02] border border-white/5 space-y-3">
          <div className="flex items-center gap-2 text-sm font-semibold text-text-primary">
            <Calendar size={16} className="text-indigo-400" />
            <span>Thời Gian Tổ Chức Sự Kiện</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Bắt đầu <span className="text-rose-400">*</span></label>
              <input
                type="datetime-local"
                value={dates.startTime}
                onChange={(e) => setDates((prev) => ({ ...prev, startTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Kết thúc <span className="text-rose-400">*</span></label>
              <input
                type="datetime-local"
                value={dates.endTime}
                onChange={(e) => setDates((prev) => ({ ...prev, endTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary"
                required
              />
            </div>
          </div>
        </div>

        {/* 3. Flash-Sale Window (Optional) */}
        <div className="p-4 rounded-xl bg-indigo-500/5 border border-indigo-500/20 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold text-indigo-300">
              <Clock size={16} className="text-indigo-400" />
              <span>Hẹn Giờ Mở Bán Vé (Flash-Sale Window)</span>
            </div>
            <span className="text-[11px] text-text-muted">Tùy chọn</span>
          </div>
          <p className="text-xs text-text-secondary leading-relaxed">
            Nếu để trống, vé sẽ được mở bán ngay khi tạo sự kiện.
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-secondary mb-1">Mở bán lúc</label>
              <input
                type="datetime-local"
                value={saleWindow.saleStartTime}
                onChange={(e) => setSaleWindow((prev) => ({ ...prev, saleStartTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary"
              />
            </div>
            <div>
              <label className="block text-xs text-text-secondary mb-1">Đóng cổng lúc</label>
              <input
                type="datetime-local"
                value={saleWindow.saleEndTime}
                onChange={(e) => setSaleWindow((prev) => ({ ...prev, saleEndTime: e.target.value }))}
                className="w-full px-3 py-2 rounded-lg bg-black/40 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary"
              />
            </div>
          </div>
        </div>

        {/* 4. Ticket Tiers Builder */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-text-secondary uppercase tracking-wider flex items-center gap-1.5">
              <span>Cấu Hình Hạng Vé (Ticket Tiers)</span>
              <span className="text-rose-400">*</span>
            </label>
            <span className="text-xs text-text-muted">{tiers.length} hạng vé</span>
          </div>

          <div className="space-y-2.5">
            {tiers.map((tier, idx) => (
              <div
                key={idx}
                className="p-3.5 rounded-xl bg-white/[0.03] border border-white/5 flex flex-col sm:flex-row items-stretch sm:items-center gap-3"
              >
                <div className="flex-1">
                  <input
                    type="text"
                    value={tier.name}
                    onChange={(e) => handleTierChange(idx, 'name', e.target.value)}
                    placeholder="Tên hạng vé (VIP, Standard...)"
                    className="w-full px-3 py-2 rounded-lg bg-black/30 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary placeholder:text-text-muted"
                    required
                  />
                </div>

                <div className="w-full sm:w-36 relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-text-muted">
                    <DollarSign size={13} />
                  </div>
                  <input
                    type="number"
                    value={tier.price}
                    onChange={(e) => handleTierChange(idx, 'price', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Giá (VND)"
                    min={1000}
                    step={1000}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-black/30 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary placeholder:text-text-muted"
                    required
                  />
                </div>

                <div className="w-full sm:w-32 relative">
                  <div className="absolute inset-y-0 left-2.5 flex items-center pointer-events-none text-text-muted">
                    <Users size={13} />
                  </div>
                  <input
                    type="number"
                    value={tier.totalStock}
                    onChange={(e) => handleTierChange(idx, 'totalStock', e.target.value ? Number(e.target.value) : '')}
                    placeholder="Số lượng vé"
                    min={1}
                    className="w-full pl-7 pr-3 py-2 rounded-lg bg-black/30 border border-border-subtle text-text-primary text-xs focus:outline-none focus:border-brand-primary placeholder:text-text-muted"
                    required
                  />
                </div>

                {tiers.length > 1 && (
                  <button
                    type="button"
                    onClick={() => handleRemoveTier(idx)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center text-text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0 self-end sm:self-center"
                    title="Xóa hạng vé này"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddTier}
            className="w-full py-2 border-dashed border-white/20 text-indigo-400 hover:text-indigo-300 hover:border-indigo-400/40"
          >
            <Plus size={14} className="mr-1.5" /> Thêm Hạng Vé Mới
          </Button>
        </div>

        {/* 5. Status & Submit */}
        <div className="flex items-center justify-between pt-4 border-t border-border-subtle">
          <div className="flex items-center gap-2">
            <span className="text-xs text-text-secondary">Trạng thái:</span>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as 'PUBLISHED' | 'DRAFT')}
              className="px-3 py-1.5 rounded-lg bg-black/40 border border-border-subtle text-xs text-text-primary focus:outline-none focus:border-brand-primary cursor-pointer"
            >
              <option value="PUBLISHED">Mở Bán (PUBLISHED)</option>
              <option value="DRAFT">Bản Nháp (DRAFT)</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <Button type="button" variant="ghost" size="sm" onClick={onClose} disabled={isSubmitting}>
              Hủy
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Tạo Sự Kiện
            </Button>

          </div>
        </div>
      </form>
    </Modal>
  )
}
