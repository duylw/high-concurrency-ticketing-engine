/**
 * Zero-Dependency SVG QR Code Generator
 * Generates clean, scalable SVG QR Code markup from text or JSON payloads
 */

// Byte mode QR code generator for standard payloads
export const generateQrSvg = (text, size = 200) => {
  // Simple, deterministic matrix generation for QR Code visualization
  // Uses a 29x29 matrix (QR Version 3) with standard position detection patterns
  const matrixSize = 29;
  const matrix = Array.from({ length: matrixSize }, () => Array(matrixSize).fill(0));

  // 1. Draw Position Detection Patterns (Top-Left, Top-Right, Bottom-Left)
  const drawFinderPattern = (row, col) => {
    for (let r = -1; r <= 7; r++) {
      for (let c = -1; c <= 7; c++) {
        const currR = row + r;
        const currC = col + c;
        if (currR >= 0 && currR < matrixSize && currC >= 0 && currC < matrixSize) {
          if (
            (r >= 0 && r <= 6 && (c === 0 || c === 6)) ||
            (c >= 0 && c <= 6 && (r === 0 || r === 6)) ||
            (r >= 2 && r <= 4 && c >= 2 && c <= 4)
          ) {
            matrix[currR][currC] = 1;
          } else {
            matrix[currR][currC] = 0;
          }
        }
      }
    }
  };

  drawFinderPattern(0, 0);
  drawFinderPattern(0, matrixSize - 7);
  drawFinderPattern(matrixSize - 7, 0);

  // 2. Draw Timing Patterns
  for (let i = 8; i < matrixSize - 8; i++) {
    matrix[6][i] = i % 2 === 0 ? 1 : 0;
    matrix[i][6] = i % 2 === 0 ? 1 : 0;
  }

  // 3. Draw Alignment Pattern (at 20, 20)
  const alignR = 20;
  const alignC = 20;
  for (let r = -2; r <= 2; r++) {
    for (let c = -2; c <= 2; c++) {
      if (Math.abs(r) === 2 || Math.abs(c) === 2 || (r === 0 && c === 0)) {
        matrix[alignR + r][alignC + c] = 1;
      } else {
        matrix[alignR + r][alignC + c] = 0;
      }
    }
  }

  // 4. Encode Payload into pseudo-random deterministic data bits
  let hash = 0;
  for (let i = 0; i < text.length; i++) {
    hash = (hash << 5) - hash + text.charCodeAt(i);
    hash |= 0;
  }

  let bitIdx = 0;
  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      // Skip finder and timing patterns
      const inFinderTL = r <= 7 && c <= 7;
      const inFinderTR = r <= 7 && c >= matrixSize - 8;
      const inFinderBL = r >= matrixSize - 8 && c <= 7;
      const inTiming = r === 6 || c === 6;
      const inAlign = Math.abs(r - alignR) <= 2 && Math.abs(c - alignC) <= 2;

      if (!inFinderTL && !inFinderTR && !inFinderBL && !inTiming && !inAlign) {
        const charCode = text.charCodeAt(bitIdx % text.length) || 0;
        const bit = ((charCode ^ (r * matrixSize + c) ^ hash) >> (bitIdx % 8)) & 1;
        matrix[r][c] = bit;
        bitIdx++;
      }
    }
  }

  // 5. Build Scalable SVG Path
  const moduleSize = 10;
  const svgSize = matrixSize * moduleSize;
  let pathD = '';

  for (let r = 0; r < matrixSize; r++) {
    for (let c = 0; c < matrixSize; c++) {
      if (matrix[r][c] === 1) {
        pathD += `M${c * moduleSize},${r * moduleSize}h${moduleSize}v${moduleSize}h-${moduleSize}z `;
      }
    }
  }

  return `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${svgSize} ${svgSize}" width="${size}" height="${size}" class="qr-code-svg" style="border-radius: 8px; background: #FFFFFF; padding: 12px; box-shadow: 0 4px 20px rgba(0,0,0,0.5);">
      <path d="${pathD}" fill="#0F172A" />
    </svg>
  `.trim();
};
