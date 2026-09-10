/**
 * Lightweight Client-Side SPA Router
 * Listens for hash changes and emits VIEW_CHANGED events across modules
 */
import { CONFIG } from '../../core/config.js';
import { eventBus } from '../../core/event-bus.js';

class Router {
  constructor() {
    this.currentRoute = 'events';
  }

  init() {
    window.addEventListener('hashchange', () => this._handleHashChange());
    this._handleHashChange();
  }

  _handleHashChange() {
    const rawHash = window.location.hash.replace(/^#/, '').trim();
    const route = rawHash || 'events';
    this.currentRoute = route;

    eventBus.publish(CONFIG.EVENTS.VIEW_CHANGED, {
      route,
      hash: window.location.hash,
    });
  }

  navigate(route) {
    const cleanRoute = route.startsWith('#') ? route : `#${route}`;
    window.location.hash = cleanRoute;
  }

  getCurrentRoute() {
    return this.currentRoute;
  }
}

export const router = new Router();

if (typeof window !== 'undefined') {
  window.__router = router;
}
