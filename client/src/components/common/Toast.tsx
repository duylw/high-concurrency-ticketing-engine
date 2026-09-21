import React, { useState } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem {
  id: string
  type: ToastType
  title?: string
  message: string
  duration?: number
}

interface ToastProps {
  toast: ToastItem
  onClose: (id: string) => void
}

export const Toast: React.FC<ToastProps> = ({ toast, onClose }) => {
  const [isHiding, setIsHiding] = useState(false)

  const handleClose = () => {
    setIsHiding(true)
    setTimeout(() => {
      onClose(toast.id)
    }, 250)
  }

  const renderIcon = () => {
    switch (toast.type) {
      case 'success':
        return <CheckCircle2 size={20} />
      case 'error':
        return <AlertCircle size={20} />
      case 'warning':
        return <AlertTriangle size={20} />
      case 'info':
      default:
        return <Info size={20} />
    }
  }

  return (
    <div
      className={`toast toast-${toast.type} ${isHiding ? 'is-hiding' : ''}`}
      role="alert"
      aria-live="assertive"
    >
      <div className="toast-icon" aria-hidden="true">
        {renderIcon()}
      </div>
      <div className="toast-content">
        {toast.title && <div className="toast-title">{toast.title}</div>}
        <div className="toast-message">{toast.message}</div>
      </div>
      <button
        className="toast-close-btn"
        onClick={handleClose}
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>
  )
}
