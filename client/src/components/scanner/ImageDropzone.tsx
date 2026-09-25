import React, { useState, useRef } from 'react'
import { UploadCloud, Image as ImageIcon, AlertCircle, RefreshCw } from 'lucide-react'
import jsQR from 'jsqr'
import { useToast } from '@/context'

export interface ImageDropzoneProps {
  onScan: (decodedText: string) => void
  isProcessing?: boolean
}

export const ImageDropzone: React.FC<ImageDropzoneProps> = ({ onScan, isProcessing = false }) => {
  const { showToast } = useToast()
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const [isDragOver, setIsDragOver] = useState(false)
  const [isDecoding, setIsDecoding] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  const decodeImageFile = (file: File) => {
    if (!file.type.startsWith('image/')) {
      const err = 'Tệp tải lên không phải là định dạng hình ảnh hợp lệ (PNG, JPG, WebP).'
      setErrorMessage(err)
      showToast({ message: err, type: 'error' })
      return
    }

    setErrorMessage(null)
    setIsDecoding(true)

    const objectUrl = URL.createObjectURL(file)
    setPreviewUrl(objectUrl)

    const img = new Image()
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        canvas.width = img.naturalWidth || img.width
        canvas.height = img.naturalHeight || img.height

        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        if (!ctx) {
          throw new Error('Không thể khởi tạo Canvas 2D context.')
        }

        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'attemptBoth',
        })

        if (code && code.data && code.data.trim().length > 0) {
          onScan(code.data.trim())
        } else {
          const notFoundMsg = 'Không tìm thấy mã QR hợp lệ trong ảnh này. Vui lòng thử ảnh có độ tương phản cao hơn.'
          setErrorMessage(notFoundMsg)
          showToast({ message: notFoundMsg, type: 'warning' })
        }
      } catch (err: unknown) {
        console.error('[IMAGE DECODE ERROR]', err)
        const msg = (err as Error)?.message || 'Lỗi xử lý điểm ảnh hình ảnh.'
        setErrorMessage(msg)
        showToast({ message: msg, type: 'error' })
      } finally {
        setIsDecoding(false)
      }
    }

    img.onerror = () => {
      setIsDecoding(false)
      const err = 'Không thể nạp dữ liệu hình ảnh.'
      setErrorMessage(err)
      showToast({ message: err, type: 'error' })
    }

    img.src = objectUrl
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(true)
  }

  const handleDragLeave = () => {
    setIsDragOver(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragOver(false)

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      decodeImageFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      decodeImageFile(e.target.files[0])
    }
  }

  return (
    <div className="w-full max-w-xl mx-auto">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative aspect-video rounded-2xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all duration-300 ${
          isDragOver
            ? 'border-brand-primary bg-indigo-500/10 scale-[1.01]'
            : 'border-white/20 bg-dark-surface hover:border-white/30 hover:bg-white/[0.02]'
        }`}
      >
        {isDecoding || isProcessing ? (
          <div className="flex flex-col items-center">
            <RefreshCw size={36} className="animate-spin text-brand-primary mb-3" />
            <span className="text-sm font-bold text-text-primary">Đang quét ma trận điểm ảnh QR...</span>
            <span className="text-xs text-text-muted mt-1">Sử dụng bộ giải mã chuẩn ISO/IEC 18004</span>
          </div>
        ) : previewUrl ? (
          <div className="flex flex-col items-center">
            <img
              src={previewUrl}
              alt="QR Preview"
              className="max-h-32 rounded-xl object-contain mb-3 shadow-lg border border-white/10"
            />
            <span className="text-xs text-text-secondary">Bấm vào khung hoặc kéo thả ảnh khác để quét lại</span>
          </div>
        ) : (
          <div className="flex flex-col items-center">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400 mb-3 group-hover:scale-110 transition-transform">
              <UploadCloud size={28} />
            </div>
            <h4 className="text-sm font-bold text-text-primary mb-1">
              Kéo Thả Hoặc Bấm Để Chọn Ảnh Vé
            </h4>
            <p className="text-xs text-text-secondary max-w-xs leading-relaxed">
              Hỗ trợ tệp PNG, JPG, JPEG hoặc ảnh chụp màn hình chứa mã QR
            </p>
            <div className="mt-4 flex items-center gap-1.5 text-[11px] text-text-muted bg-white/[0.04] px-3 py-1 rounded-full border border-white/5">
              <ImageIcon size={12} />
              <span>Giải mã tự động bằng jsQR</span>
            </div>
          </div>
        )}
      </div>

      {errorMessage && (
        <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle size={15} className="shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  )
}
