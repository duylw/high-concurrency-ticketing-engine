import React, { useState } from 'react'
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '@/utils/cn'

export const toastVariants = cva(
  'pointer-events-auto flex items-start gap-3.5 p-4 bg-[#0D111A]/95 backdrop-blur-xl border rounded-xl shadow-2xl transition-all duration-200',
  {
    variants: {
      type: {
        success: 'border-emerald-500/40 shadow-emerald-500/10 text-emerald-400',
        error: 'border-rose-500/40 shadow-rose-500/10 text-rose-400',
        warning: 'border-amber-500/40 shadow-amber-500/10 text-amber-400',
        info: 'border-indigo-500/40 shadow-indigo-500/10 text-indigo-400',
      },
    },
    defaultVariants: {
      type: 'info',
    },
  }
)

export type ToastType = 'success' | 'error' | 'info' | 'warning'

export interface ToastItem extends VariantProps<typeof toastVariants> {
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
        return <CheckCircle2 size={20} className="text-emerald-400 shrink-0 mt-0.5" />
      case 'error':
        return <AlertCircle size={20} className="text-rose-400 shrink-0 mt-0.5" />
      case 'warning':
        return <AlertTriangle size={20} className="text-amber-400 shrink-0 mt-0.5" />
      case 'info':
      default:
        return <Info size={20} className="text-indigo-400 shrink-0 mt-0.5" />
    }
  }

  return (
    <div
      className={cn(
        toastVariants({ type: toast.type }),
        isHiding ? 'animate-toast-out' : 'animate-toast-in'
      )}
      role="alert"
      aria-live="assertive"
    >
      <div aria-hidden="true">{renderIcon()}</div>
      <div className="flex-1">
        {toast.title && <div className="text-sm font-bold text-text-primary mb-1">{toast.title}</div>}
        <div className="text-xs text-text-secondary leading-relaxed">{toast.message}</div>
      </div>
      <button
        className="text-text-muted hover:text-text-primary hover:bg-white/10 p-1 rounded transition-colors shrink-0"
        onClick={handleClose}
        aria-label="Đóng thông báo"
      >
        <X size={16} />
      </button>
    </div>
  )
}
