import React, { useState } from 'react'
import { Barcode, ArrowRight, X } from 'lucide-react'
import { Button } from '@/components/common'

export interface ManualCodeInputProps {
  onSubmit: (code: string) => void
  isProcessing?: boolean
}

export const ManualCodeInput: React.FC<ManualCodeInputProps> = ({ onSubmit, isProcessing = false }) => {
  const [code, setCode] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    const trimmed = code.trim()
    if (!trimmed) return
    onSubmit(trimmed)
  }

  return (
    <form onSubmit={handleSubmit} className="w-full max-w-xl mx-auto">
      <div className="glass-panel p-6 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2 mb-2 text-sm font-bold text-text-primary">
          <Barcode size={18} className="text-indigo-400" />
          <span>Nhập Mã Vé Thủ Công Hoặc Quét Bằng Máy Barcode USB</span>
        </div>
        <p className="text-xs text-text-secondary mb-4 leading-relaxed">
          Tương thích hoàn toàn với đầu đọc mã vạch cầm tay (tự động gửi mã khi bấm cò) hoặc nhập mã vé dạng <code className="text-indigo-300">TKT-YYYYMM-...</code> khi mã QR của khách bị ướt/mờ.
        </p>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="Nhập mã vé (VD: TKT-202609-...) hoặc dán mã tại đây..."
              className="w-full px-4 py-3 rounded-xl bg-black/40 border border-border-subtle text-text-primary text-sm font-mono focus:outline-none focus:border-brand-primary placeholder:font-sans placeholder:text-text-muted transition-colors"
              disabled={isProcessing}
              autoFocus
            />
            {code && (
              <button
                type="button"
                onClick={() => setCode('')}
                className="absolute inset-y-0 right-3 flex items-center text-text-muted hover:text-text-primary"
                title="Xóa"
              >
                <X size={16} />
              </button>
            )}
          </div>

          <Button
            type="submit"
            variant="primary"
            disabled={!code.trim() || isProcessing}
            isLoading={isProcessing}
            className="px-5 py-3 h-auto"
          >

            <span>Soát Vé</span>
            <ArrowRight size={15} className="ml-1.5" />
          </Button>
        </div>
      </div>
    </form>
  )
}
