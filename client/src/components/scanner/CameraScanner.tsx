import React from 'react'
import { Camera, RefreshCw, AlertTriangle, ShieldCheck } from 'lucide-react'
import { Button } from '@/components/common'
import { useWebcamScanner } from '@/hooks'

export interface CameraScannerProps {
  onScan: (decodedText: string) => void
  isPaused?: boolean
}

export const CameraScanner: React.FC<CameraScannerProps> = ({ onScan, isPaused = false }) => {
  const {
    videoRef,
    canvasRef,
    isScanning,
    error,
    switchCamera,
    start,
    facingMode,
  } = useWebcamScanner({
    onScan,
    enabled: !isPaused,
    scanIntervalMs: 180,
  })

  return (
    <div className="relative aspect-video max-w-xl mx-auto rounded-2xl overflow-hidden bg-black border border-white/15 shadow-2xl flex flex-col items-center justify-center">
      {/* Hidden offscreen canvas for frame processing */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Live Video Feed */}
      <video
        ref={videoRef}
        autoPlay
        playsInline
        muted
        className={`w-full h-full object-cover transition-opacity duration-300 ${
          isScanning && !isPaused ? 'opacity-100' : 'opacity-30'
        }`}
      />

      {/* Target Reticle & Laser Scanline Overlay */}
      {isScanning && !isPaused && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          {/* Target Reticle Box */}
          <div className="relative w-64 h-64 sm:w-72 sm:h-72 border-2 border-emerald-400/30 rounded-2xl">
            {/* 4 Corner Markers */}
            <div className="absolute -top-1 -left-1 w-6 h-6 border-t-4 border-l-4 border-emerald-400 rounded-tl-lg" />
            <div className="absolute -top-1 -right-1 w-6 h-6 border-t-4 border-r-4 border-emerald-400 rounded-tr-lg" />
            <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-4 border-l-4 border-emerald-400 rounded-bl-lg" />
            <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-4 border-r-4 border-emerald-400 rounded-br-lg" />

            {/* Animated Laser Scanline */}
            <div className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_15px_#10B981] animate-pulse top-1/2 -translate-y-1/2" />
          </div>

          {/* Floating Instructions */}
          <div className="absolute bottom-4 inset-x-0 text-center">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/70 backdrop-blur-md border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-lg">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              Hướng mã QR vào khung ngắm
            </span>
          </div>
        </div>
      )}

      {/* Error or Permission Denied View */}
      {error && (
        <div className="absolute inset-0 bg-black/90 p-6 flex flex-col items-center justify-center text-center">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-3">
            <AlertTriangle size={24} />
          </div>
          <h4 className="text-sm font-bold text-text-primary mb-1">Không Thể Truy Cập Camera</h4>
          <p className="text-xs text-text-secondary max-w-xs mb-4 leading-relaxed">{error}</p>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => start()}>
              <RefreshCw size={13} className="mr-1.5" /> Thử Lại
            </Button>
          </div>
        </div>
      )}

      {/* Paused View */}
      {isPaused && !error && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center text-center">
          <ShieldCheck size={36} className="text-emerald-400 mb-2 animate-bounce" />
          <span className="text-sm font-semibold text-text-primary">Đã quét thành công!</span>
          <span className="text-xs text-text-muted mt-0.5">Tạm dừng camera trong giây lát...</span>
        </div>
      )}

      {/* Camera Controls Overlay */}
      <div className="absolute top-3 right-3 flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={switchCamera}
          className="h-8 px-2.5 bg-black/60 border-white/20 text-white hover:bg-black/90 text-xs backdrop-blur-md"
          title={`Đổi camera (Hiện tại: ${facingMode === 'environment' ? 'Camera Sau' : 'Camera Trước'})`}
        >
          <Camera size={13} className="mr-1.5" /> Đổi Cam
        </Button>
      </div>
    </div>
  )
}
