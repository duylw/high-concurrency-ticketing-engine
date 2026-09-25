import React, { useEffect, useState, useMemo } from 'react'
import { useLocation, useSearchParams } from 'react-router-dom'
import { Search, Sparkles, RefreshCw, Calendar, AlertCircle } from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { EventCard } from '@/components/customer'
import { eventsApi } from '@/api'
import type { EventItem } from '@/types'

export type EventFilterTab = 'all' | 'live' | 'upcoming'

export interface CatalogPageProps {
  defaultTab?: EventFilterTab
}

export const CatalogPage: React.FC<CatalogPageProps> = ({ defaultTab = 'all' }) => {
  const location = useLocation()
  const [searchParams, setSearchParams] = useSearchParams()

  // Initialize tab based on URL path (/schedule) or hash (#schedule) or query param
  const getInitialTab = (): EventFilterTab => {
    if (location.pathname === '/schedule' || location.hash === '#schedule') {
      return 'upcoming'
    }
    const tabParam = searchParams.get('tab')
    if (tabParam === 'live' || tabParam === 'upcoming' || tabParam === 'all') {
      return tabParam
    }
    return defaultTab
  }

  const [activeTab, setActiveTab] = useState<EventFilterTab>(getInitialTab)
  const [searchQuery, setSearchQuery] = useState('')
  const [events, setEvents] = useState<EventItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // Listen to path or hash changes to switch tab dynamically
  useEffect(() => {
    if (location.pathname === '/schedule' || location.hash === '#schedule') {
      setActiveTab('upcoming')
    }
  }, [location.pathname, location.hash])

  const fetchEvents = async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await eventsApi.getEvents({ limit: 50 })
      setEvents(res.events || [])
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Không thể tải danh sách sự kiện'
      setError(msg)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    fetchEvents()
  }, [])

  const handleTabChange = (tab: EventFilterTab) => {
    setActiveTab(tab)
    if (tab === 'all') {
      searchParams.delete('tab')
    } else {
      searchParams.set('tab', tab)
    }
    setSearchParams(searchParams, { replace: true })
  }

  // Filter events by status and search query
  const filteredEvents = useMemo(() => {
    const now = Date.now()

    return events.filter((ev) => {
      // 1. Search Query Filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase()
        const titleMatch = (ev.title || '').toLowerCase().includes(query)
        const descMatch = (ev.description || '').toLowerCase().includes(query)
        const venueMatch = (ev.venue || '').toLowerCase().includes(query)
        if (!titleMatch && !descMatch && !venueMatch) {
          return false
        }
      }

      // 2. Tab Filter
      const saleStart = new Date(ev.saleStartTime).getTime()
      const saleEnd = new Date(ev.saleEndTime).getTime()

      const isUpcoming = now < saleStart
      const isClosed = now > saleEnd
      const isLive = !isUpcoming && !isClosed

      if (activeTab === 'live') {
        return isLive
      }
      if (activeTab === 'upcoming') {
        return isUpcoming
      }
      return true
    })
  }, [events, searchQuery, activeTab])

  return (
    <div className="py-10 pb-20">
      <div className="container mx-auto px-6 max-w-[1240px]">
        {/* Hero Banner Header */}
        <section className="text-center max-w-[860px] mx-auto mb-10">
          <div className="inline-flex mb-3">
            <Badge variant="glow">
              <Sparkles size={12} className="mr-1.5 text-brand-neon" />
              Sàn Sự Kiện & Hòa Nhạc Trực Tuyến
            </Badge>
          </div>

          <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight text-text-primary mb-4 leading-tight">
            Săn Vé Sự Kiện Trực Tuyến <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
              Tốc Độ Cao & Công Bằng
            </span>
          </h1>

          <p className="text-base sm:text-lg text-text-secondary mb-8 leading-relaxed max-w-[680px] mx-auto">
            Khám phá và đặt vé các sự kiện âm nhạc, giải trí và thể thao hàng đầu.
            Đặt chỗ nhanh chóng, giữ vé công bằng và thanh toán an toàn.
          </p>

          {/* Search Input Bar */}
          <div className="max-w-[560px] mx-auto relative mb-6">
            <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-text-muted" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm kiếm sự kiện, nghệ sĩ, concert, địa điểm..."
              className="w-full pl-11 pr-4 py-3 rounded-full bg-white/5 border border-border-subtle focus:border-brand-primary focus:ring-1 focus:ring-brand-primary text-text-primary placeholder:text-text-muted text-sm outline-none transition-all shadow-inner"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-xs font-semibold text-text-muted hover:text-text-primary transition-colors"
              >
                Xóa
              </button>
            )}
          </div>

          {/* 3 Status Filter Tabs */}
          <div className="inline-flex p-1.5 rounded-full bg-white/5 border border-border-subtle backdrop-blur-md gap-1">
            <button
              type="button"
              onClick={() => handleTabChange('all')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'all'
                  ? 'bg-brand-primary text-white shadow-lg shadow-indigo-500/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Tất Cả Sự Kiện
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('live')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'live'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-500/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Đang Mở Bán
            </button>

            <button
              type="button"
              onClick={() => handleTabChange('upcoming')}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all duration-200 ${
                activeTab === 'upcoming'
                  ? 'bg-amber-600 text-white shadow-lg shadow-amber-500/25'
                  : 'text-text-secondary hover:text-text-primary hover:bg-white/5'
              }`}
            >
              Sắp Mở Bán
            </button>
          </div>
        </section>

        {/* Section Header with Stats & Refresh */}
        <div className="flex items-center justify-between mb-6 pb-4 border-b border-border-subtle flex-wrap gap-4">
          <div>
            <h2 className="text-xl font-bold text-text-primary flex items-center gap-2">
              <Calendar size={20} className="text-brand-neon" />
              <span>
                {activeTab === 'all' && 'Danh Sách Tất Cả Sự Kiện'}
                {activeTab === 'live' && 'Sự Kiện Đang Mở Bán (Flash-Sale)'}
                {activeTab === 'upcoming' && 'Lịch Sự Kiện Sắp Mở Bán (Countdown)'}
              </span>
            </h2>
            <p className="text-xs text-text-muted mt-0.5">
              Hiển thị {filteredEvents.length} sự kiện phù hợp
            </p>
          </div>

          <Button
            variant="ghost"
            size="sm"
            leftIcon={<RefreshCw size={14} className={isLoading ? 'animate-spin' : ''} />}
            onClick={fetchEvents}
            disabled={isLoading}
          >
            Làm mới
          </Button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((key) => (
              <div
                key={key}
                className="glass-panel overflow-hidden animate-pulse flex flex-col h-[380px]"
              >
                <div className="aspect-video bg-white/5 w-full" />
                <div className="p-5 flex-1 flex flex-col justify-between">
                  <div className="space-y-3">
                    <div className="h-5 bg-white/10 rounded w-3/4" />
                    <div className="h-4 bg-white/5 rounded w-1/2" />
                    <div className="h-4 bg-white/5 rounded w-2/3" />
                  </div>
                  <div className="h-10 bg-white/10 rounded w-full mt-4" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Error State */}
        {!isLoading && error && (
          <div className="glass-panel p-8 text-center max-w-[500px] mx-auto border-rose-500/30">
            <AlertCircle size={40} className="text-rose-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-text-primary mb-2">Không thể tải sự kiện</h3>
            <p className="text-sm text-text-muted mb-5">{error}</p>
            <Button variant="primary" onClick={fetchEvents} leftIcon={<RefreshCw size={16} />}>
              Thử Lại
            </Button>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && !error && filteredEvents.length === 0 && (
          <div className="glass-panel p-12 text-center max-w-[560px] mx-auto">
            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center text-text-muted mx-auto mb-4 text-2xl">
              🎫
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">
              {searchQuery
                ? 'Không tìm thấy sự kiện phù hợp'
                : activeTab === 'upcoming'
                ? 'Chưa có sự kiện nào sắp mở bán'
                : activeTab === 'live'
                ? 'Hiện chưa có sự kiện nào đang mở bán'
                : 'Hiện chưa có sự kiện nào trong hệ thống'}
            </h3>
            <p className="text-sm text-text-muted mb-6">
              {searchQuery
                ? `Không có kết quả nào khớp với "${searchQuery}". Hãy thử tìm với từ khóa khác.`
                : 'Vui lòng kiểm tra lại sau hoặc chuyển sang tab khác để khám phá sự kiện.'}
            </p>
            {searchQuery ? (
              <Button variant="outline" onClick={() => setSearchQuery('')}>
                Xóa Bộ Lọc Tìm Kiếm
              </Button>
            ) : (
              <Button variant="outline" onClick={() => handleTabChange('all')}>
                Xem Tất Cả Sự Kiện
              </Button>
            )}
          </div>
        )}

        {/* Event Cards Grid */}
        {!isLoading && !error && filteredEvents.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredEvents.map((event) => (
              <EventCard key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

export default CatalogPage
