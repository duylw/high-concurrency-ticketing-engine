import React, { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  DollarSign,
  Ticket,
  TrendingUp,
  Plus,
  QrCode,
  Calendar,
  MapPin,
  RefreshCw,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { KpiCard, EventCreateModal } from '@/components/organizer'
import { organizerApi } from '@/api/organizer.api'
import { formatCurrency } from '@/utils'
import { useAuth, useToast } from '@/context'
import type { OrganizerEventItem, OrganizerMetrics } from '@/types'

export const OrganizerStudioPage: React.FC = () => {
  const { user } = useAuth()
  const { showToast } = useToast()

  const [events, setEvents] = useState<OrganizerEventItem[]>([])
  const [metrics, setMetrics] = useState<OrganizerMetrics | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchDashboardData = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setIsRefreshing(true)
      else setIsLoading(true)
      setError(null)

      const data = await organizerApi.getMyEvents()
      setEvents(data.events || [])
      setMetrics(data.metrics || null)
    } catch (err: unknown) {
      console.error('[ORGANIZER STUDIO LOAD ERROR]', err)
      const msg = (err as Error)?.message || 'Không thể tải dữ liệu quản trị.'
      setError(msg)
      showToast({ title: 'Lỗi Tải Dữ Liệu', message: msg, type: 'error' })
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }, [showToast])

  useEffect(() => {
    fetchDashboardData()
  }, [fetchDashboardData])

  const handleEventCreated = (newEvent: OrganizerEventItem) => {
    setEvents((prev) => [newEvent, ...prev])
    fetchDashboardData(true)
  }

  return (
    <div className="container mx-auto py-8 px-4 sm:px-6 max-w-7xl animate-fade-in">
      {/* Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-border-subtle">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-wider text-brand-primary bg-indigo-500/10 px-2.5 py-0.5 rounded-full border border-indigo-500/20">
              Organizer Studio
            </span>
            <span className="text-xs text-text-muted">| Ban Tổ Chức: {user?.name || user?.email}</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-text-primary tracking-tight">
            Kênh Quản Trị & Doanh Thu Sự Kiện
          </h1>
          <p className="text-sm text-text-secondary mt-1">
            Báo cáo doanh thu thực tế, tiến độ bán vé và điều phối sự kiện thời gian thực
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => fetchDashboardData(true)}
            isLoading={isRefreshing}
            className="border-white/10 text-text-secondary hover:text-text-primary"
            title="Tải lại dữ liệu"
          >
            <RefreshCw size={14} className={isRefreshing ? 'animate-spin' : ''} />
          </Button>


          <Link to="/scanner">
            <Button
              variant="outline"
              size="sm"
              className="border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 hover:border-emerald-500/50"
            >
              <QrCode size={15} className="mr-1.5" /> Trạm Soát Vé
            </Button>
          </Link>

          <Button
            variant="primary"
            size="sm"
            onClick={() => setIsCreateModalOpen(true)}
            className="shadow-lg shadow-indigo-500/25"
          >
            <Plus size={15} className="mr-1.5" /> Tạo Sự Kiện Mới
          </Button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="my-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-between text-rose-300 text-sm">
          <div className="flex items-center gap-3">
            <ShieldAlert size={20} className="shrink-0 text-rose-400" />
            <span>{error}</span>
          </div>
          <Button variant="outline" size="sm" onClick={() => fetchDashboardData()}>
            Thử Lại
          </Button>
        </div>
      )}

      {/* 3 KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 my-8">
        <KpiCard
          title="Tổng Doanh Thu Thực Tế"
          value={isLoading ? '---' : formatCurrency(metrics?.totalRevenue ?? 0)}
          subtext={`Thu từ ${(metrics?.totalTicketsSold ?? 0).toLocaleString()} vé đã thanh toán hoàn tất`}
          icon={<DollarSign size={20} />}
          iconColorClass="text-emerald-400"
          iconBgClass="bg-emerald-500/10 border-emerald-500/20"
        />

        <KpiCard
          title="Tổng Vé Đã Bán / Phát Hành"
          value={
            isLoading
              ? '---'
              : `${(metrics?.totalTicketsSold ?? 0).toLocaleString()} / ${(metrics?.totalStock ?? 0).toLocaleString()}`
          }
          subtext={`${events.length} sự kiện đã và đang phát hành`}
          icon={<Ticket size={20} />}
          iconColorClass="text-indigo-400"
          iconBgClass="bg-indigo-500/10 border-indigo-500/20"
        />

        <KpiCard
          title="Tỷ Lệ Bán Vé Toàn Sàn"
          value={isLoading ? '---' : `${metrics?.soldOutPercentage ?? 0}%`}
          progressPercentage={metrics?.soldOutPercentage ?? 0}
          icon={<TrendingUp size={20} />}
          iconColorClass="text-amber-400"
          iconBgClass="bg-amber-500/10 border-amber-500/20"
        />
      </div>

      {/* Events Management Table Section */}
      <div className="mt-10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-text-primary tracking-tight">Danh Sách Sự Kiện Quản Lý</h2>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-white/[0.06] text-text-secondary border border-white/5 font-semibold">
              {events.length}
            </span>
          </div>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div className="glass-panel p-12 text-center rounded-2xl border border-white/5">
            <RefreshCw size={32} className="animate-spin text-brand-primary mx-auto mb-3" />
            <p className="text-sm text-text-secondary">Đang tải dữ liệu kinh doanh từ hệ thống...</p>
          </div>
        ) : events.length === 0 ? (
          /* Empty State */
          <div className="glass-panel p-12 text-center rounded-2xl border border-dashed border-white/10">
            <div className="w-16 h-16 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center mx-auto mb-4 text-indigo-400">
              <Calendar size={28} />
            </div>
            <h3 className="text-base font-bold text-text-primary mb-1">Chưa có sự kiện nào được tạo</h3>
            <p className="text-xs text-text-secondary max-w-md mx-auto mb-6">
              Bắt đầu tạo sự kiện đầu tiên của bạn để thiết lập lịch mở bán Flash-Sale và cấu hình các hạng vé.
            </p>
            <Button variant="primary" size="sm" onClick={() => setIsCreateModalOpen(true)}>
              <Plus size={14} className="mr-1.5" /> Tạo Sự Kiện Đầu Tiên
            </Button>
          </div>
        ) : (
          /* Event Table */
          <div className="glass-panel rounded-2xl border border-white/10 overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-white/[0.02] border-b border-border-subtle uppercase tracking-wider text-[11px] text-text-muted font-semibold">
                  <tr>
                    <th className="px-5 py-3.5">Sự Kiện</th>
                    <th className="px-5 py-3.5">Hạng Vé & Giá</th>
                    <th className="px-5 py-3.5">Tiến Độ Bán Vé</th>
                    <th className="px-5 py-3.5">Doanh Thu</th>
                    <th className="px-5 py-3.5">Trạng Thái</th>
                    <th className="px-5 py-3.5 text-right">Thao Tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 text-text-secondary">
                  {events.map((evt) => {
                    const sold = evt.totalTicketsSold ?? evt.stats?.totalTicketsSold ?? 0
                    const stock = evt.totalStock ?? evt.stats?.totalStock ?? 0
                    const ratio =
                      evt.soldOutPercentage ??
                      evt.stats?.soldOutPercentage ??
                      (stock > 0 ? Math.round((sold / stock) * 100) : 0)
                    const revenue = evt.totalRevenue ?? evt.stats?.totalRevenue ?? 0

                    const statusVariant =
                      evt.status === 'PUBLISHED'
                        ? 'success'
                        : evt.status === 'CLOSED'
                        ? 'neutral'
                        : evt.status === 'CANCELLED'
                        ? 'danger'
                        : 'warning'

                    const statusLabel =
                      evt.status === 'PUBLISHED'
                        ? 'Đang Mở Bán'
                        : evt.status === 'CLOSED'
                        ? 'Đã Đóng'
                        : evt.status === 'CANCELLED'
                        ? 'Đã Hủy'
                        : 'Bản Nháp'

                    const barStyle: React.CSSProperties = {
                      width: `${Math.min(ratio, 100)}%`,
                    }

                    return (
                      <tr key={evt.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Event Cell */}
                        <td className="px-5 py-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={
                                evt.bannerUrl ||
                                'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120'
                              }
                              alt={evt.title}
                              className="w-12 h-12 rounded-lg object-cover bg-dark-tertiary shrink-0 border border-white/10"
                            />
                            <div>
                              <h4 className="font-bold text-text-primary text-sm line-clamp-1">
                                {evt.title}
                              </h4>
                              {evt.venue && (
                                <p className="text-[11px] text-text-muted flex items-center gap-1 mt-0.5 line-clamp-1">
                                  <MapPin size={11} /> {evt.venue}
                                </p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Ticket Tiers */}
                        <td className="px-5 py-4">
                          <div className="space-y-1">
                            {evt.ticketTiers && evt.ticketTiers.length > 0 ? (
                              evt.ticketTiers.map((t) => (
                                <div key={t.id || t.name} className="flex items-center gap-1.5 text-[11px]">
                                  <span className="font-medium text-text-primary">{t.name}:</span>
                                  <span className="text-emerald-400 font-semibold">
                                    {formatCurrency(t.price)}
                                  </span>
                                  <span className="text-text-muted">
                                    ({t.availableStock ?? t.totalStock}/{t.totalStock})
                                  </span>
                                </div>
                              ))
                            ) : (
                              <span className="text-text-muted italic">Chưa có hạng vé</span>
                            )}
                          </div>
                        </td>

                        {/* Progress */}
                        <td className="px-5 py-4 min-w-[140px]">
                          <div className="space-y-1.5">
                            <div className="flex justify-between text-[11px]">
                              <span className="font-semibold text-text-primary">
                                {sold.toLocaleString()} / {stock.toLocaleString()}
                              </span>
                              <span className="text-text-muted">{ratio}%</span>
                            </div>
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className={`h-full rounded-full ${
                                  ratio >= 100
                                    ? 'bg-emerald-400'
                                    : ratio >= 50
                                    ? 'bg-amber-400'
                                    : 'bg-indigo-400'
                                }`}
                                style={barStyle}
                              />
                            </div>
                          </div>
                        </td>

                        {/* Revenue */}
                        <td className="px-5 py-4">
                          <span className="font-bold text-emerald-400 text-sm">
                            {formatCurrency(revenue)}
                          </span>
                        </td>

                        {/* Status */}
                        <td className="px-5 py-4">
                          <Badge variant={statusVariant}>{statusLabel}</Badge>
                        </td>

                        {/* Actions */}
                        <td className="px-5 py-4 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <Link to={`/events/${evt.id}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-8 px-2 text-text-muted hover:text-text-primary"
                                title="Xem trang bán vé"
                              >
                                <ExternalLink size={14} />
                              </Button>
                            </Link>

                            <Link to="/scanner">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 px-2.5 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-xs"
                              >
                                <QrCode size={13} className="mr-1" /> Soát Vé
                              </Button>
                            </Link>
                          </div>
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Create Event Modal */}
      <EventCreateModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={handleEventCreated}
      />
    </div>
  )
}
