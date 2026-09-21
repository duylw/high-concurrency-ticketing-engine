import React, { useEffect, type ReactNode } from 'react'
import { X } from 'lucide-react'

export interface DrawerProps {
  isOpen: boolean
  onClose: () => void
  title?: ReactNode
  children: ReactNode
  footer?: ReactNode
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
  maxWidth = '480px',
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
        className={`drawer-overlay ${isOpen ? 'is-active' : ''}`}
        onClick={handleBackdropClick}
        aria-hidden="true"
      />
      <div
        className={`drawer-panel ${isOpen ? 'is-active' : ''}`}
        style={{ maxWidth }}
        role="dialog"
        aria-modal="true"
      >
        {title && (
          <div className="drawer-header">
            <h3 className="drawer-title">{title}</h3>
            <button
              className="modal-close-btn"
              onClick={onClose}
              aria-label="Đóng thanh trượt"
            >
              <X size={18} />
            </button>
          </div>
        )}
        <div className="drawer-body">{children}</div>
        {footer && <div className="drawer-footer">{footer}</div>}
      </div>
    </>
  )
}
