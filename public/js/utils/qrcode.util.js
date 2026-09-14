/**
 * Standard ISO/IEC 18004 SVG QR Code Generator
 * Generates clean, scalable, valid QR Code vector SVG markup conforming to ISO/IEC 18004
 * Supports Reed-Solomon Error Correction Level M (15% error correction capacity)
 */

/**
 * Generate standard vector SVG QR Code
 * @param {string|object} payload - Text or JSON payload to encode
 * @param {number} size - Visual width/height in pixels (default: 200)
 * @returns {string} SVG HTML markup
 */
export const generateQrSvg = (payload, size = 200) => {
  const text = typeof payload === 'object' ? JSON.stringify(payload) : String(payload || '');

  try {
    const qrcodeFn = typeof window !== 'undefined' ? window.qrcode : (typeof globalThis !== 'undefined' ? globalThis.qrcode : null);
    if (typeof qrcodeFn !== 'function') {
      throw new Error('QR generator library (qrcode-generator) not loaded');
    }

    // TypeNumber: 0 (auto-detect version 1..40 based on payload length)
    // ErrorCorrectionLevel: 'M' (15% redundancy for fast, fault-tolerant scanning)
    const qr = qrcodeFn(0, 'M');
    qr.addData(text);
    qr.make();

    const moduleCount = qr.getModuleCount();
    const margin = 4; // Standard ISO 4-module quiet zone
    const cellSize = 10;
    const totalModules = moduleCount + margin * 2;
    const svgSize = totalModules * cellSize;

    let pathD = '';
    for (let r = 0; r < moduleCount; r++) {
      for (let c = 0; c < moduleCount; c++) {
        if (qr.isDark(r, c)) {
          const x = (c + margin) * cellSize;
          const y = (r + margin) * cellSize;
          pathD += `M${x},${y}h${cellSize}v${cellSize}h-${cellSize}z `;
        }
      }
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${size}" height="${size}" class="qr-code-svg" style="border-radius: 12px; background: #FFFFFF; padding: 10px; box-shadow: 0 8px 30px rgba(0,0,0,0.6); display: block; margin: 0 auto;">
        <path d="${pathD.trim()}" fill="#0F172A" shape-rendering="crispEdges" />
      </svg>
    `.trim();
  } catch (err) {
    console.error('[QR] Failed to generate ISO QR code:', err);
    return `
      <div style="width: ${size}px; height: ${size}px; background: #FFF; border-radius: 12px; display: flex; align-items: center; justify-content: center; color: #EF4444; font-size: 0.75rem;">
        Lỗi tạo mã QR
      </div>
    `;
  }
};
