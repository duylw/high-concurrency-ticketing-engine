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
import { catalogView } from './modules/customer/catalog.view.js';
import { eventDetailView } from './modules/customer/event-detail.view.js';
import { myTicketsView } from './modules/customer/my-tickets.view.js';
import { checkoutDrawer } from './modules/customer/checkout.drawer.js';
import { eticketModal } from './modules/customer/eticket.modal.js';
import { organizerStudioView } from './modules/organizer/organizer-studio.view.js';
import { eventCreateModal } from './modules/organizer/event-create.modal.js';
import { gateScannerView } from './modules/organizer/gate-scanner.view.js';
import { formatCurrencyVND } from './utils/formatters.js';
import { $ } from './utils/dom.util.js';

class Application {
  constructor() {
    this.isReady = false;
  }

  async init() {
    console.log('[INFO] Initializing Ticketing Engine Customer Storefront & Flash-Sale UI...');

    // 1. Mount Modals, Drawers & Navigation Bar
    authModal.init();
    checkoutDrawer.init();
    eticketModal.init();
    eventDetailView.init();
    eventCreateModal.init();
    navbar.init();

    // 2. Restore and validate authentication session from LocalStorage
    await authStore.init();

    // 3. Verify and bind UI controllers & EventBus listeners
    this.bindGlobalEvents();

    // 4. Initialize Client Router (triggers initial route render)
    router.init();

    // 5. Set ready flag for automated test runner & debugging
    this.isReady = true;
    window.__appReady = true;
    window.__app = this;
    window.__authStore = authStore;
    window.__authModal = authModal;
    window.__navbar = navbar;
    window.__router = router;
    window.__httpClient = httpClient;
    window.__catalogView = catalogView;
    window.__eventDetailView = eventDetailView;
    window.__myTicketsView = myTicketsView;
    window.__checkoutDrawer = checkoutDrawer;
    window.__eticketModal = eticketModal;
    window.__organizerStudioView = organizerStudioView;
    window.__eventCreateModal = eventCreateModal;
    window.__gateScannerView = gateScannerView;

    console.log('[INFO] Ticketing Engine Gate Scanner (Task 11B) Ready.');
  }

  handleRoute(view, param) {
    if (view === 'event' && param) {
      eventDetailView.render(param);
    } else if (view === 'my-orders') {
      myTicketsView.render();
    } else if (view === 'organizer-studio') {
      organizerStudioView.render();
    } else if (view === 'gate-scanner') {
      gateScannerView.render(param);
    } else {
      catalogView.render();
    }
  }

  bindGlobalEvents() {
    // Listen for custom event triggers
    eventBus.subscribe(CONFIG.EVENTS.AUTH_STATE_CHANGED, (data) => {
      console.log('[APP EVENT] Auth state changed:', data);
      const current = router.getCurrentRoute();
      if (current === 'my-orders') {
        myTicketsView.render();
      } else if (current === 'organizer-studio') {
        organizerStudioView.render();
      } else if (current.startsWith('gate-scanner')) {
        const parts = current.split('/');
        gateScannerView.render(parts[1] || null);
      }
    });

    eventBus.subscribe(CONFIG.EVENTS.VIEW_CHANGED, ({ route, view, param }) => {
      console.log('[APP EVENT] Active route changed to:', route, { view, param });
      this.handleRoute(view, param);
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

