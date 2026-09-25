import React, { useState } from 'react'
import { LogIn, UserPlus, Mail, Lock, User, Briefcase } from 'lucide-react'
import { Modal, Button } from '@/components/common'
import { useAuth } from '@/context/AuthContext'
import { cn } from '@/utils/cn'
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
      maxWidth="max-w-[460px]"
      title={
        <div className="flex items-center gap-2">
          {activeTab === 'login' ? (
            <LogIn size={20} className="text-brand-neon" />
          ) : (
            <UserPlus size={20} className="text-brand-neon" />
          )}
          <span>{activeTab === 'login' ? 'Đăng Nhập Tài Khoản' : 'Tạo Tài Khoản Mới'}</span>
        </div>
      }
    >
      {/* Tab Switcher */}
      <div className="flex p-1 mb-6 bg-white/[0.03] border border-border-subtle rounded-lg">
        <button
          type="button"
          onClick={() => setActiveTab('login')}
          className={cn(
            'flex-1 py-2 text-center font-semibold text-sm rounded-md transition-all duration-150',
            activeTab === 'login'
              ? 'bg-dark-tertiary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          Đăng Nhập
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('register')}
          className={cn(
            'flex-1 py-2 text-center font-semibold text-sm rounded-md transition-all duration-150',
            activeTab === 'register'
              ? 'bg-dark-tertiary text-text-primary shadow-sm'
              : 'text-text-muted hover:text-text-primary'
          )}
        >
          Đăng Ký
        </button>
      </div>

      {/* Login Form */}
      {activeTab === 'login' ? (
        <form onSubmit={handleLoginSubmit} className="flex flex-col gap-4">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Email
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <Mail size={16} />
              </span>
              <input
                type="email"
                required
                placeholder="buyer@ticketing.com"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                className="w-full py-2.5 pl-10 pr-3.5 bg-white/[0.04] border border-border-medium rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Mật khẩu
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <Lock size={16} />
              </span>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                className="w-full py-2.5 pl-10 pr-3.5 bg-white/[0.04] border border-border-medium rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary transition-colors"
              />
            </div>
          </div>

          <Button
            type="submit"
            variant="primary"
            size="lg"
            isLoading={isLoading}
            className="w-full mt-2"
          >
            Đăng Nhập
          </Button>
        </form>
      ) : (
        /* Register Form */
        <form onSubmit={handleRegisterSubmit} className="flex flex-col gap-3.5">
          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Họ và tên
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none">
                <User size={16} />
              </span>
              <input
                type="text"
                required
                placeholder="Nguyễn Văn A"
                value={regName}
                onChange={(e) => setRegName(e.target.value)}
                className="w-full py-2 pl-10 pr-3 bg-white/[0.04] border border-border-medium rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Tên đăng nhập (Username)
            </label>
            <input
              type="text"
              required
              placeholder="nguyenvana"
              value={regUsername}
              onChange={(e) => setRegUsername(e.target.value)}
              className="w-full py-2 px-3 bg-white/[0.04] border border-border-medium rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              placeholder="user@example.com"
              value={regEmail}
              onChange={(e) => setRegEmail(e.target.value)}
              className="w-full py-2 px-3 bg-white/[0.04] border border-border-medium rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Mật khẩu (tối thiểu 8 ký tự)
            </label>
            <input
              type="password"
              required
              minLength={8}
              placeholder="••••••••"
              value={regPassword}
              onChange={(e) => setRegPassword(e.target.value)}
              className="w-full py-2 px-3 bg-white/[0.04] border border-border-medium rounded-md text-text-primary placeholder:text-text-muted text-sm focus:outline-none focus:border-brand-primary transition-colors"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-text-secondary mb-1.5">
              Loại tài khoản
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors',
                  regRole === 'USER'
                    ? 'border-brand-primary bg-brand-primary/10 text-text-primary'
                    : 'border-border-subtle bg-transparent text-text-secondary hover:border-border-medium'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  checked={regRole === 'USER'}
                  onChange={() => setRegRole('USER')}
                  className="accent-brand-primary"
                />
                <span>Khách Mua Vé</span>
              </label>

              <label
                className={cn(
                  'flex items-center gap-2 p-2.5 rounded-md border text-xs font-medium cursor-pointer transition-colors',
                  regRole === 'ORGANIZER'
                    ? 'border-brand-primary bg-brand-primary/10 text-text-primary'
                    : 'border-border-subtle bg-transparent text-text-secondary hover:border-border-medium'
                )}
              >
                <input
                  type="radio"
                  name="role"
                  checked={regRole === 'ORGANIZER'}
                  onChange={() => setRegRole('ORGANIZER')}
                  className="accent-brand-primary"
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
            className="w-full mt-2"
          >
            Tạo Tài Khoản
          </Button>
        </form>
      )}
    </Modal>
  )
}
