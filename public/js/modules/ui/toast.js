import { CONFIG } from '../../core/config.js';
import { escapeHtml, createFromHtml, $ } from '../../utils/dom.util.js';

class ToastManager {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    let container = $('#toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'toast-container';
      container.className = 'toast-container';
      document.body.appendChild(container);
    }
    this.container = container;
  }

  /**
   * Show a toast message
   * @param {Object} options - { title, message, type, duration }
   */
  show({ title = '', message = '', type = 'info', duration = CONFIG.TOAST_DURATION_MS }) {
    if (!this.container) this.init();

    const icons = {
      success: '✓',
      error: '✕',
      warning: '⚠',
      info: 'ℹ',
    };

    const icon = icons[type] || icons.info;

    const html = `
      <div class="toast toast-${escapeHtml(type)}" role="alert" aria-live="assertive">
        <div class="toast-icon">${icon}</div>
        <div class="toast-content">
          ${title ? `<div class="toast-title">${escapeHtml(title)}</div>` : ''}
          <div class="toast-message">${escapeHtml(message)}</div>
        </div>
        <button class="toast-close-btn" aria-label="Đóng thông báo">✕</button>
      </div>
    `;

    const toastEl = createFromHtml(html);
    this.container.appendChild(toastEl);

    const closeBtn = toastEl.querySelector('.toast-close-btn');

    let dismissed = false;
    const dismiss = () => {
      if (dismissed) return;
      dismissed = true;
      toastEl.classList.add('is-hiding');
      toastEl.addEventListener('animationend', () => {
        toastEl.remove();
      });
    };

    closeBtn.addEventListener('click', dismiss);

    if (duration > 0) {
      setTimeout(dismiss, duration);
    }

    return toastEl;
  }

  success(title, message, duration) {
    return this.show({ title, message, type: 'success', duration });
  }

  error(title, message, duration) {
    return this.show({ title, message, type: 'error', duration });
  }

  warning(title, message, duration) {
    return this.show({ title, message, type: 'warning', duration });
  }

  info(title, message, duration) {
    return this.show({ title, message, type: 'info', duration });
  }
}

export const toast = new ToastManager();

// Expose on window for easy developer & testing verification
if (typeof window !== 'undefined') {
  window.__toast = toast;
  window.__showToast = (msg, type = 'info') => toast.show({ message: msg, type });
}
