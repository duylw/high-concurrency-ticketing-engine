import React, { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { Toast, type ToastItem, type ToastType } from '@/components/common/Toast'

interface ToastContextType {
  showToast: (type: ToastType, message: string, title?: string, duration?: number) => void
  success: (message: string, title?: string, duration?: number) => void
  error: (message: string, title?: string, duration?: number) => void
  info: (message: string, title?: string, duration?: number) => void
  warning: (message: string, title?: string, duration?: number) => void
  removeToast: (id: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (type: ToastType, message: string, title?: string, duration: number = 3500) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
      const newToast: ToastItem = { id, type, message, title, duration }

      setToasts((prev) => [...prev, newToast])

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id)
        }, duration)
      }
    },
    [removeToast]
  )

  const success = useCallback(
    (message: string, title: string = 'Thành công', duration?: number) => {
      showToast('success', message, title, duration)
    },
    [showToast]
  )

  const error = useCallback(
    (message: string, title: string = 'Lỗi', duration?: number) => {
      showToast('error', message, title, duration)
    },
    [showToast]
  )

  const info = useCallback(
    (message: string, title: string = 'Thông tin', duration?: number) => {
      showToast('info', message, title, duration)
    },
    [showToast]
  )

  const warning = useCallback(
    (message: string, title: string = 'Cảnh báo', duration?: number) => {
      showToast('warning', message, title, duration)
    },
    [showToast]
  )

  return (
    <ToastContext.Provider value={{ showToast, success, error, info, warning, removeToast }}>
      {children}
      <div
        className="fixed top-6 right-6 z-[2000] flex flex-col gap-3 max-w-[400px] w-[calc(100%-3rem)] pointer-events-none"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <Toast key={toast.id} toast={toast} onClose={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export const useToast = (): ToastContextType => {
  const context = useContext(ToastContext)
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider')
  }
  return context
}
