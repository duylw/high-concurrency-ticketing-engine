/**
 * Loading Spinners & Skeleton Screen Generators
 */

/**
 * Generate HTML string for animated loading spinner
 * @param {string} text
 * @returns {string}
 */
export const getSpinnerHtml = (text = 'Đang tải dữ liệu...') => `
  <div class="flex flex-col items-center justify-center gap-3" style="padding: 3rem 1rem;">
    <div style="
      width: 2.5rem;
      height: 2.5rem;
      border: 3px solid rgba(99, 102, 241, 0.2);
      border-top-color: var(--color-brand-primary);
      border-radius: var(--radius-full);
      animation: spin 800ms linear infinite;
    "></div>
    <span class="text-sm text-muted">${text}</span>
  </div>
  <style>
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
`;

/**
 * Generate skeleton cards placeholder HTML
 * @param {number} count
 * @returns {string}
 */
export const getSkeletonCardsHtml = (count = 3) => {
  let cards = '';
  for (let i = 0; i < count; i++) {
    cards += `
      <div class="glass-card" style="opacity: 0.6; pointer-events: none;">
        <div style="width: 100%; height: 180px; background: rgba(255,255,255,0.05); border-radius: var(--radius-lg); margin-bottom: 1rem; animation: pulse 1.5s ease-in-out infinite;"></div>
        <div style="width: 60%; height: 1.5rem; background: rgba(255,255,255,0.08); border-radius: var(--radius-sm); margin-bottom: 0.5rem; animation: pulse 1.5s ease-in-out infinite;"></div>
        <div style="width: 90%; height: 1rem; background: rgba(255,255,255,0.04); border-radius: var(--radius-sm); animation: pulse 1.5s ease-in-out infinite;"></div>
      </div>
    `;
  }
  return `
    <div class="grid grid-cols-3 gap-6">
      ${cards}
    </div>
    <style>
      @keyframes pulse {
        0%, 100% { opacity: 0.4; }
        50% { opacity: 0.8; }
      }
    </style>
  `;
};

export const getLoadingCardsHtml = getSkeletonCardsHtml;
