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

    const parts = route.split('/');
    const view = parts[0] || 'events';
    const param = parts[1] || null;

    eventBus.publish(CONFIG.EVENTS.VIEW_CHANGED, {
      route,
      view,
      param,
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
