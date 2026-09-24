import { useState, useEffect, useRef, useCallback } from 'react'
import jsQR from 'jsqr'

interface UseWebcamScannerOptions {
  onScan: (decodedText: string) => void
  enabled?: boolean
  scanIntervalMs?: number
}

interface UseWebcamScannerReturn {
  videoRef: React.RefObject<HTMLVideoElement | null>
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isScanning: boolean
  hasPermission: boolean | null
  error: string | null
  facingMode: 'environment' | 'user'
  switchCamera: () => void
  start: () => Promise<void>
  stop: () => void
}

export function useWebcamScanner({
  onScan,
  enabled = true,
  scanIntervalMs = 180,
}: UseWebcamScannerOptions): UseWebcamScannerReturn {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<number | null>(null)

  const [isScanning, setIsScanning] = useState(false)
  const [hasPermission, setHasPermission] = useState<boolean | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment')

  // Stop media stream tracks
  const stop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsScanning(false)
  }, [])

  // Single QR code scan tick
  const scanFrame = useCallback(() => {
    const video = videoRef.current
    const canvas = canvasRef.current

    if (!video || !canvas || video.readyState !== video.HAVE_ENOUGH_DATA) {
      return
    }

    const width = video.videoWidth
    const height = video.videoHeight

    if (width === 0 || height === 0) return

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    ctx.drawImage(video, 0, 0, width, height)
    const imageData = ctx.getImageData(0, 0, width, height)

    // Decode QR Matrix via jsQR
    const code = jsQR(imageData.data, imageData.width, imageData.height, {
      inversionAttempts: 'dontInvert',
    })

    if (code && code.data && code.data.trim().length > 0) {
      onScan(code.data.trim())
    }
  }, [onScan])

  // Request camera and start stream
  const start = useCallback(async () => {
    stop()
    setError(null)

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Trình duyệt không hỗ trợ truy cập Camera (getUserMedia).')
      setHasPermission(false)
      return
    }

    try {
      const constraints: MediaStreamConstraints = {
        video: {
          facingMode: { ideal: facingMode },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream

      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.setAttribute('playsinline', 'true')
        await videoRef.current.play()
      }

      setHasPermission(true)
      setIsScanning(true)

      // Start scan loop
      intervalRef.current = window.setInterval(scanFrame, scanIntervalMs)
    } catch (err: unknown) {
      console.warn('[WEBCAM SCANNER] Camera access failed:', err)
      const errName = (err as Error)?.name || ''
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setError('Quyền truy cập Camera bị từ chối. Vui lòng cho phép quyền Camera trong trình duyệt.')
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setError('Không tìm thấy thiết bị Camera trên máy này.')
      } else {
        setError('Không thể khởi động Camera: ' + ((err as Error)?.message || 'Lỗi không xác định.'))
      }
      setHasPermission(false)
      setIsScanning(false)
    }
  }, [facingMode, scanFrame, scanIntervalMs, stop])

  const switchCamera = useCallback(() => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'))
  }, [])

  // Auto-start / stop when enabled or facingMode changes
  useEffect(() => {
    if (enabled) {
      start()
    } else {
      stop()
    }

    return () => {
      stop()
    }
  }, [enabled, facingMode, start, stop])

  return {
    videoRef,
    canvasRef,
    isScanning,
    hasPermission,
    error,
    facingMode,
    switchCamera,
    start,
    stop,
  }
}
