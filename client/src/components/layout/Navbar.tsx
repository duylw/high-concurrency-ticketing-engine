import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ticket, LogIn, LogOut, User, QrCode, LayoutDashboard } from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isOrganizer, logout, openAuthModal } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <header className="sticky top-0 z-50 bg-[#07090E]/85 backdrop-blur-md border-b border-border-subtle">
      <div className="container mx-auto px-6 flex items-center justify-between h-16">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center gap-2.5 font-extrabold text-xl tracking-tight">
          <div className="w-8 h-8 rounded-md bg-gradient-to-br from-indigo-500 to-indigo-400 flex items-center justify-center shadow-lg shadow-indigo-500/50">
            <Ticket size={18} color="#FFFFFF" />
          </div>
          <span className="text-text-primary">
            Ticketing<span className="text-brand-neon">Engine</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav className="flex items-center gap-6">
          <Link
            to="/"
            className={cn(
              'text-sm font-semibold transition-colors duration-150',
              isActive('/') ? 'text-brand-neon' : 'text-text-secondary hover:text-text-primary'
            )}
          >
            Sự Kiện
          </Link>

          {isAuthenticated && (
            <Link
              to="/my-orders"
              className={cn(
                'text-sm font-semibold transition-colors duration-150',
                isActive('/my-orders') ? 'text-brand-neon' : 'text-text-secondary hover:text-text-primary'
              )}
            >
              Vé Của Tôi
            </Link>
          )}

          {isOrganizer && (
            <>
              <Link
                to="/organizer"
                className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150',
                  isActive('/organizer') ? 'text-brand-neon' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <LayoutDashboard size={16} />
                <span>Kênh Ban Tổ Chức</span>
              </Link>

              <Link
                to="/scanner"
                className={cn(
                  'flex items-center gap-1.5 text-sm font-semibold transition-colors duration-150',
                  isActive('/scanner') ? 'text-brand-neon' : 'text-text-secondary hover:text-text-primary'
                )}
              >
                <QrCode size={16} />
                <span>Soát Vé</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions / Auth State */}
        <div className="flex items-center gap-4">
          {isAuthenticated ? (
            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-2 px-3 py-1.5 bg-white/[0.04] border border-border-subtle rounded-full">
                <User size={15} className="text-brand-neon" />
                <span className="text-xs font-semibold text-text-primary max-w-[140px] truncate">
                  {user?.name || user?.username || user?.email}
                </span>
                <Badge variant={isOrganizer ? 'glow' : 'neutral'} withDot={false}>
                  {user?.role}
                </Badge>
              </div>

              <Button
                variant="ghost"
                size="sm"
                leftIcon={<LogOut size={15} />}
                onClick={() => logout()}
                title="Đăng xuất"
              >
                Đăng Xuất
              </Button>
            </div>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftIcon={<LogIn size={15} />}
              onClick={openAuthModal}
            >
              Đăng Nhập
            </Button>
          )}
        </div>
      </div>
    </header>
  )
}
