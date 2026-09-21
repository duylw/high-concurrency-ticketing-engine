import React, { useState } from 'react'
import { LogIn, UserPlus, Mail, Lock, User, Briefcase } from 'lucide-react'
import { Modal, Button } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import type { Role } from '@/types'

export const AuthModal: React.FC = () => {
  const { isAuthModalOpen, closeAuthModal, login, register } = useAuth()
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login')
  const [isLoading, setIsLoading] = useState(false)

  // Login form state
  const [loginEmail, setLoginEmail] = useState('')
  const [loginPassword, setLoginPassword] = useState('')

  // Register form state
  const [regName, setRegName] = useState('')
  const [regUsername, setRegUsername] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regRole, setRegRole] = useState<Role>('USER')

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!loginEmail || !loginPassword) return
    setIsLoading(true)
    try {
      await login({ email: loginEmail, password: loginPassword })
      setLoginEmail('')
      setLoginPassword('')
    } catch {
      // Error handled by Toast in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!regEmail || !regPassword || !regName || !regUsername) return
    setIsLoading(true)
    try {
      await register({
        name: regName,
        username: regUsername,
        email: regEmail,
        password: regPassword,
        role: regRole,
      })
      setRegName('')
      setRegUsername('')
      setRegEmail('')
      setRegPassword('')
    } catch {
      // Error handled by Toast in AuthContext
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Modal
      isOpen={isAuthModalOpen}
      onClose={closeAuthModal}
      maxWidth="460px"
      title={
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          {activeTab === 'login' ? <LogIn size={20} className="text-brand" /> : <UserPlus size={20} className="text-brand" />}
          <span>{activeTab === 'login' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}</span>
        </div>
      }
    >
      {/* Tab Switcher */}
      <div
        style={{
          display: 'flex',
          borderBottom: '1px solid var(--color-border-subtle)',
          marginBottom: '1.5rem',
          background: 'rgba(255, 255, 255, 0.02)',
          borderRadius: 'var(--radius-md)',
          padding: '3px',
        }}
      >
        <button
          type="button"
          onClick={() => setActiveTab('login')}
          style={{
            flex: 1,
            padding: '0.625rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-sm)',
            background: activeTab === 'login' ? 'var(--color-bg-tertiary)' : 'transparent',
            color: activeTab === 'login' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            transition: 'all var(--transition-fast)',
          }}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          style={{
            flex: 1,
            padding: '0.625rem',
            textAlign: 'center',
            fontWeight: 600,
            fontSize: '0.875rem',
            borderRadius: 'var(--radius-sm)',
            background: activeTab === 'register' ? 'var(--color-bg-tertiary)' : 'transparent',
            color: activeTab === 'register' ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
            transition: 'all var(--transition-fast)',
          }}
        >
          Đăng Ký
        </button>
      </div>

      {/* Login Form */}
      {activeTab === 'login' ? (
        <form onSubmit={handleLoginSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Email
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                placeholder="buyer@ticketing.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Mật khẩu
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.6875rem 0.875rem 0.6875rem 2.5rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.9375rem',
                }}
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Đăng Nhập
          </Button>
        </form>
      ) : (
        /* Register Form */
        <form onSubmit={handleRegisterSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.875rem' }}>
          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Họ và tên
            </label>
            <div style={{ position: 'relative' }}>
              <span style={{ position: 'absolute', left: '0.875rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--color-text-muted)' }}>
                <User size={16} />
              </span>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                style={{
                  width: '100%',
                  padding: '0.625rem 0.875rem 0.625rem 2.5rem',
                  background: 'rgba(255, 255, 255, 0.04)',
                  border: '1px solid var(--color-border-medium)',
                  borderRadius: 'var(--radius-md)',
                  color: 'var(--color-text-primary)',
                  fontSize: '0.875rem',
                }}
              />
            </div>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Tên đăng nhập (Username)
            </label>
            <input
              type="text"
              required
              placeholder="nguyenvana"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Email
            </label>
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              style={{
                width: '100%',
                padding: '0.625rem 0.875rem',
                background: 'rgba(255, 255, 255, 0.04)',
                border: '1px solid var(--color-border-medium)',
                borderRadius: 'var(--radius-md)',
                color: 'var(--color-text-primary)',
                fontSize: '0.875rem',
              }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 600, marginBottom: '0.375rem' }}>
              Loại tài khoản
            </label>
            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  border: `1px solid ${regRole === 'USER' ? 'var(--color-brand-primary)' : 'var(--color-border-subtle)'}`,
                  background: regRole === 'USER' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                <input
                  type="radio"
                  name="role"
                  checked={regRole === 'USER'}
                  onChange={() => setRegRole('USER')}
                />
                <span>Khách Mua Vé</span>
              </label>

              <label
                style={{
                  flex: 1,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.5rem',
                  padding: '0.625rem 0.75rem',
                  border: `1px solid ${regRole === 'ORGANIZER' ? 'var(--color-brand-primary)' : 'var(--color-border-subtle)'}`,
                  background: regRole === 'ORGANIZER' ? 'rgba(99, 102, 241, 0.1)' : 'transparent',
                  borderRadius: 'var(--radius-md)',
                  cursor: 'pointer',
                  fontSize: '0.8125rem',
                }}
              >
                <input
                  type="radio"
                  name="role"
                  checked={regRole === 'ORGANIZER'}
                  onChange={() => setRegRole('ORGANIZER')}
                />
                <Briefcase size={14} />
                <span>Ban Tổ Chức</span>
              </label>
            </div>
          </div>

          <Button
            type="submit"
            variant="neon"
            size="lg"
            isLoading={isLoading}
            style={{ width: '100%', marginTop: '0.5rem' }}
          >
            Tạo Tài Khoản
          </Button>
        </form>
      )}
    </Modal>
  )
}
