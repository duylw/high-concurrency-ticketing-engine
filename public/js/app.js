/**
 * Main Application Orchestrator (Entry Point)
 * Initializes Design System, Event Bus, Auth Store, Navbar, Router & Modals
 */
import { CONFIG } from './core/config.js';
import { eventBus } from './core/event-bus.js';
import { httpClient } from './core/http-client.js';
import { toast } from './modules/ui/toast.js';
import { modalManager } from './modules/ui/modal.js';
import { authStore } from './modules/auth/auth.store.js';
import { authModal } from './modules/auth/auth.modal.js';
import { navbar } from './modules/navigation/navbar.js';
import { router } from './modules/navigation/router.js';
import { formatCurrencyVND } from './utils/formatters.js';
import { $ } from './utils/dom.util.js';

class Application {
  constructor() {
    this.isReady = false;
  }

  async init() {
    console.log('[INFO] Initializing Ticketing Engine Frontend Architecture & Auth Layer...');

    // 1. Mount Auth Modal Dialog & Navigation Bar
    authModal.init();
    navbar.init();

    // 2. Initialize Client Router
    router.init();

    // 3. Restore and validate authentication session from LocalStorage
    await authStore.init();

    // 4. Verify and bind UI controllers
    this.bindGlobalEvents();

    // 5. Set ready flag for automated test runner & debugging
    this.isReady = true;
    window.__appReady = true;
    window.__app = this;
    window.__authStore = authStore;
    window.__authModal = authModal;
    window.__navbar = navbar;
    window.__router = router;
    window.__httpClient = httpClient;

    console.log('[INFO] Frontend Architecture & Auth Layer (Task 09A + 09B) Ready.');
  }

  bindGlobalEvents() {
    // Listen for custom event triggers
    eventBus.subscribe(CONFIG.EVENTS.AUTH_STATE_CHANGED, (data) => {
      console.log('[APP EVENT] Auth state changed:', data);
    });

    eventBus.subscribe(CONFIG.EVENTS.VIEW_CHANGED, ({ route }) => {
      console.log('[APP EVENT] Active route changed to:', route);
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

