import React from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Ticket, LogIn, LogOut, User, QrCode, LayoutDashboard } from 'lucide-react'
import { Button, Badge } from '@/components/common'
import { useAuth } from '@/context/AuthContext'

export const Navbar: React.FC = () => {
  const { user, isAuthenticated, isOrganizer, logout, openAuthModal } = useAuth()
  const location = useLocation()

  const isActive = (path: string) => location.pathname === path

  return (
    <header
      style={{
        position: 'sticky',
        top: 0,
        zIndex: 100,
        background: 'rgba(7, 9, 14, 0.85)',
        backdropFilter: 'blur(16px)',
        borderBottom: '1px solid var(--color-border-subtle)',
      }}
    >
      <div
        className="container"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          height: '4.25rem',
        }}
      >
        {/* Brand Logo */}
        <Link
          to="/"
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '0.625rem',
            fontWeight: 800,
            fontSize: '1.25rem',
            letterSpacing: '-0.02em',
          }}
        >
          <div
            style={{
              width: '2rem',
              height: '2rem',
              borderRadius: 'var(--radius-md)',
              background: 'linear-gradient(135deg, #6366F1 0%, #818CF8 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 0 16px rgba(99, 102, 241, 0.5)',
            }}
          >
            <Ticket size={18} color="#FFFFFF" />
          </div>
          <span>
            Ticketing<span className="text-brand">Engine</span>
          </span>
        </Link>

        {/* Center Nav Links */}
        <nav style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          <Link
            to="/"
            style={{
              fontSize: '0.9375rem',
              fontWeight: 600,
              color: isActive('/') ? 'var(--color-brand-neon)' : 'var(--color-text-secondary)',
              transition: 'color var(--transition-fast)',
            }}
          >
            Sự Kiện
          </Link>

          {isAuthenticated && (
            <Link
              to="/my-orders"
              style={{
                fontSize: '0.9375rem',
                fontWeight: 600,
                color: isActive('/my-orders') ? 'var(--color-brand-neon)' : 'var(--color-text-secondary)',
                transition: 'color var(--transition-fast)',
              }}
            >
              Vé Của Tôi
            </Link>
          )}

          {isOrganizer && (
            <>
              <Link
                to="/organizer"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: isActive('/organizer') ? 'var(--color-brand-neon)' : 'var(--color-text-secondary)',
                  transition: 'color var(--transition-fast)',
                }}
              >
                <LayoutDashboard size={16} />
                <span>Kênh Ban Tổ Chức</span>
              </Link>

              <Link
                to="/scanner"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.375rem',
                  fontSize: '0.9375rem',
                  fontWeight: 600,
                  color: isActive('/scanner') ? 'var(--color-brand-neon)' : 'var(--color-text-secondary)',
                  transition: 'color var(--transition-fast)',
                }}
              >
                <QrCode size={16} />
                <span>Soát Vé</span>
              </Link>
            </>
          )}
        </nav>

        {/* Right Actions / Auth State */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          {isAuthenticated ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.875rem' }}>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.375rem 0.75rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--color-border-subtle)',
                  borderRadius: 'var(--radius-full)',
                }}
              >
                <User size={15} className="text-brand" />
                <span style={{ fontSize: '0.875rem', fontWeight: 600 }}>
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
