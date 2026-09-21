import React from 'react'
import { Link } from 'react-router-dom'
import { Sparkles, Ticket, ShieldCheck, Zap, ArrowRight } from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { useAuth } from '@/context/AuthContext'

export const HomePage: React.FC = () => {
  const { isAuthenticated, openAuthModal } = useAuth()

  return (
    <div className="py-16 pb-24">
      <div className="container mx-auto px-6 max-w-[1100px] text-center">
        {/* Top Badge */}
        <div className="inline-flex mb-4">
          <Badge variant="glow">
            <Sparkles size={12} className="mr-1.5 text-brand-neon" />
            Nền Tảng Đặt Vé Trực Tuyến Tải Cao
          </Badge>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary mb-6 leading-tight">
          Săn Vé Flash-Sale <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            Tốc Độ Cao & An Toàn Tuyệt Đối
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-[720px] mx-auto text-lg text-text-secondary mb-10 leading-relaxed">
          Hệ thống bán vé sự kiện quy mô lớn với cơ chế khóa bi quan (Pessimistic Locking),
          chống bán khống (Zero Overselling), và cổng soát vé 4 kênh chuẩn quốc tế ISO/IEC 18004.
        </p>

        {/* CTA Buttons */}
        <div className="flex flex-wrap items-center justify-center gap-4 mb-16">
          {isAuthenticated ? (
            <Link to="/my-orders">
              <Button variant="neon" size="lg" rightIcon={<ArrowRight size={18} />}>
                Xem Vé Của Tôi
              </Button>
            </Link>
          ) : (
            <Button
              variant="primary"
              size="lg"
              rightIcon={<ArrowRight size={18} />}
              onClick={openAuthModal}
            >
              Bắt Đầu Ngay
            </Button>
          )}

          <Link to="/dev">
            <Button variant="outline" size="lg" leftIcon={<Zap size={18} />}>
              Testing Studio & DevTools (/dev)
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="glass-panel p-6 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-brand-neon mb-4">
              <Ticket size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Flash-Sale Engine</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Xử lý hàng nghìn lượt cạnh tranh vé cùng thời điểm với độ trễ dưới 15ms qua Redis Caching và BullMQ.
            </p>
          </div>

          <div className="glass-panel p-6 hover:border-emerald-500/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Zero Overselling</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              PostgreSQL Row-level Locking và Distributed Idempotency loại bỏ triệt để tình trạng thanh toán trùng.
            </p>
          </div>

          <div className="glass-panel p-6 hover:border-amber-500/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Universal QR Scanner</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Trạm soát vé WebRTC thời gian thực 180ms, chống quét đúp Anti-Passback bảo vệ cổng sự kiện.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
