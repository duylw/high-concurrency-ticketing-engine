import React, { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'
import { cn } from '@/utils/cn'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
  className?: string
  maxWidth?: string
  closeOnEscape?: boolean
  closeOnBackdrop?: boolean
}

export const Drawer: React.FC<DrawerProps> = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  className,
  maxWidth = 'max-w-[480px]',
  closeOnEscape = true,
  closeOnBackdrop = true,
}) => {
  useEffect(() => {
    if (!isOpen) return

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && closeOnEscape) {
        onClose()
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.removeEventListener('keydown', handleKeyDown)
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen, onClose, closeOnEscape])

  if (!isOpen) return null

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget && closeOnBackdrop) {
      onClose()
    }
  }

  return (
    <>
      <div
        className="fixed inset-0 z-[850] bg-[#04070D]/75 backdrop-blur-sm transition-opacity duration-300"
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[860] w-full bg-dark-surface border-l border-border-medium shadow-2xl shadow-black/80 flex flex-col transform transition-transform duration-300 ease-out',
          maxWidth,
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="flex items-center justify-between px-6 py-4 border-b border-border-subtle bg-white/[0.02]">
            <h3 className="text-lg font-bold text-text-primary tracking-tight">{title}</h3>
            <button
              className="w-8 h-8 flex items-center justify-center rounded-full text-text-muted hover:text-text-primary hover:bg-white/10 transition-colors"
              onClick={onClose}
              aria-label="Đóng thanh trượt"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="flex-1 p-6 overflow-y-auto">{children}</div>
        {footer && (
          <div className="flex flex-col gap-3 px-6 py-4 border-t border-border-subtle bg-black/20">
            {footer}
          </div>
        )}
      </div>
    </>
  )
}
