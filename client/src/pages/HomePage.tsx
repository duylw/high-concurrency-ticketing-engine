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
            Nền Tảng Đặt Vé Sự Kiện Trực Tuyến
          </Badge>
        </div>

        {/* Hero Headline */}
        <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-text-primary mb-6 leading-tight">
          Săn Vé Sự Kiện & Hòa Nhạc <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 via-purple-400 to-emerald-400">
            Tốc Độ Cao & An Toàn Tuyệt Đối
          </span>
        </h1>

        {/* Subtitle */}
        <p className="max-w-[720px] mx-auto text-lg text-text-secondary mb-10 leading-relaxed">
          Nền tảng phân phối vé trực tuyến hàng đầu, mang đến trải nghiệm đặt vé mượt mà,
          giữ chỗ công bằng và xác thực vé điện tử bằng mã QR tiện lợi.
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

          <Link to="/">
            <Button variant="outline" size="lg" leftIcon={<Ticket size={18} />}>
              Khám Phá Sự Kiện
            </Button>
          </Link>
        </div>

        {/* Feature Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-left">
          <div className="glass-panel p-6 hover:border-brand-primary/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center text-brand-neon mb-4">
              <Ticket size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Săn Vé Nhanh Chóng</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Trải nghiệm đặt vé mượt mà, tối ưu tốc độ phản hồi ngay cả trong những đợt mở bán sự kiện hot nhất.
            </p>
          </div>

          <div className="glass-panel p-6 hover:border-emerald-500/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 mb-4">
              <ShieldCheck size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Giữ Chỗ An Toàn</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Quy trình thanh toán được bảo mật cao cấp, đảm bảo mỗi vé được giữ chỗ công bằng và đến đúng tay người mua.
            </p>
          </div>

          <div className="glass-panel p-6 hover:border-amber-500/50 transition-colors">
            <div className="w-12 h-12 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4">
              <Zap size={24} />
            </div>
            <h3 className="text-lg font-bold text-text-primary mb-2">Soát Vé Mã QR Tiện Lợi</h3>
            <p className="text-sm text-text-secondary leading-relaxed">
              Mã vé điện tử bảo mật duy nhất cho mỗi khách hàng, hỗ trợ làm thủ tục vào cổng sự kiện nhanh chóng và dễ dàng.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
