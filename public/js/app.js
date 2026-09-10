/**
 * Main Application Orchestrator (Entry Point)
 * Initializes Design System, Event Bus, Global UI Controllers
 */
import { CONFIG } from './core/config.js';
import { eventBus } from './core/event-bus.js';
import { toast } from './modules/ui/toast.js';
import { modalManager } from './modules/ui/modal.js';
import { formatCurrencyVND } from './utils/formatters.js';
import { $ } from './utils/dom.util.js';

class Application {
  constructor() {
    this.isReady = false;
  }

  async init() {
    console.log('[INFO] Initializing Ticketing Engine Frontend Architecture...');

    // 1. Verify and bind UI controllers
    this.bindGlobalEvents();

    // 2. Set ready flag for automated test runner
    this.isReady = true;
    window.__appReady = true;
    window.__app = this;

    console.log('[INFO] Frontend Architecture & Design System (Task 09A) Ready.');
  }

  bindGlobalEvents() {
    // Listen for custom event triggers
    eventBus.subscribe(CONFIG.EVENTS.AUTH_STATE_CHANGED, (data) => {
      console.log('[APP EVENT] Auth state changed:', data);
    });

    // Delegate modal close button clicks
    document.addEventListener('click', (e) => {
      const closeBtn = e.target.closest('.modal-close-btn');
      if (closeBtn) {
        const modal = closeBtn.closest('.modal-overlay');
        if (modal) modalManager.close(modal);
      }
    });
  }
}

// Bootstrap on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  const app = new Application();
  app.init();
});
