import { eventBus } from '../../core/event-bus.js';
import { CONFIG } from '../../core/config.js';
import { $, $$ } from '../../utils/dom.util.js';

class ModalController {
  constructor() {
    this.activeModal = null;
    this.bindGlobalEvents();
  }

  bindGlobalEvents() {
    // Listen for ESC key to close active modal
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && this.activeModal) {
        this.close(this.activeModal);
      }
    });

    // Listen for backdrop clicks
    document.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-overlay')) {
        this.close(e.target);
      }
    });
  }

  /**
   * Open a modal by element or selector ID
   * @param {string|Element} modalInput
   */
  open(modalInput) {
    const modal = typeof modalInput === 'string'
      ? (modalInput.startsWith('#') ? $(modalInput) : $(`#${modalInput}`))
      : modalInput;

    if (!modal) return;

    modal.classList.add('is-active');
    document.body.style.overflow = 'hidden'; // Prevent background scrolling
    this.activeModal = modal;

    // Focus first input inside modal if available
    const firstInput = modal.querySelector('input:not([type="hidden"]), button:not(.modal-close-btn)');
    if (firstInput) {
      setTimeout(() => firstInput.focus(), 50);
    }

    eventBus.publish(CONFIG.EVENTS.MODAL_OPEN, { modalId: modal.id });
  }

  /**
   * Close a modal by element or selector ID
   * @param {string|Element} modalInput
   */
  close(modalInput) {
    const modal = typeof modalInput === 'string'
      ? (modalInput.startsWith('#') ? $(modalInput) : $(`#${modalInput}`))
      : modalInput;

    if (!modal) return;

    modal.classList.remove('is-active');
    document.body.style.overflow = ''; // Restore background scrolling
    this.activeModal = null;

    eventBus.publish(CONFIG.EVENTS.MODAL_CLOSE, { modalId: modal.id });
  }
}

export const modalManager = new ModalController();

if (typeof window !== 'undefined') {
  window.__modalManager = modalManager;
}
