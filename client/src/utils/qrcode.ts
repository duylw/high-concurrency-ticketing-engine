import qrcode from 'qrcode-generator'

/**
 * Standard ISO/IEC 18004 Vector SVG QR Code Generator
 * Generates scalable, clean vector SVG QR codes with Error Correction Level M (15%)
 */
export const generateQrSvg = (payload: string | object, size: number = 200): string => {
  const text = typeof payload === 'object' ? JSON.stringify(payload) : String(payload || '')

  try {
    // TypeNumber: 0 (auto-detect version 1..40 based on payload length)
    // ErrorCorrectionLevel: 'M' (15% redundancy for fast scanning)
    const qr = qrcode(0, 'M')
    qr.addData(text)
    qr.make()

    const moduleCount = qr.getModuleCount()
    const margin = 4 // Standard ISO 4-module quiet zone
    const cellSize = 10
    const totalModules = moduleCount + margin * 2
    const svgSize = totalModules * cellSize

    let pathD = ''
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          const x = (c + margin) * cellSize
          const y = (r + margin) * cellSize
          pathD += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${size}" height="${size}" class="qr-code-svg rounded-xl bg-white p-2.5 shadow-2xl block mx-auto">
        <path d="${pathD.trim()}" fill="#0F172A" shape-rendering="crispEdges" />
      </svg>
    `.trim()
  } catch (err) {
    console.error('[QR] Failed to generate ISO QR code:', err)
    return `
      <div style="width: ${size}px; height: ${size}px;" class="bg-white rounded-xl flex items-center justify-center text-rose-500 text-xs font-semibold mx-auto">
        Lỗi tạo mã QR
      </div>
    `
  }
}
