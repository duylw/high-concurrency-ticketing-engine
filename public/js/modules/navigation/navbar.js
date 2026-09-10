/**
 * Dynamic Role-Aware Navbar Controller
 * Re-renders header actions and role-specific navigation links reactively
 */
import { CONFIG } from '../../core/config.js';
import { eventBus } from '../../core/event-bus.js';
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { toast } from '../ui/toast.js';
import { authStore } from '../auth/auth.store.js';
import { authApi } from '../auth/auth.api.js';
import { authModal } from '../auth/auth.modal.js';

class NavbarController {
  constructor() {
    this.container = null;
  }

  init() {
    this.container = $('#navbar-actions');
    if (!this.container) return;

    // Listen to reactive auth state updates from EventBus
    eventBus.subscribe(CONFIG.EVENTS.AUTH_STATE_CHANGED, () => {
      this.render();
    });

    // Initial render based on existing store state
    this.render();
  }

  render() {
    if (!this.container) return;

    if (!authStore.isAuthenticated) {
      this._renderGuest();
    } else {
      this._renderAuthenticated(authStore.user);
    }
  }

  _renderGuest() {
    this.container.innerHTML = `
      <button class="btn btn-ghost btn-sm" id="btn-nav-login">Đăng Nhập</button>
      <button class="btn btn-primary btn-sm" id="btn-nav-register">Đăng Ký</button>
    `;

    $('#btn-nav-login')?.addEventListener('click', () => authModal.open('login'));
    $('#btn-nav-register')?.addEventListener('click', () => authModal.open('register'));
  }

  _renderAuthenticated(user) {
    const name = user?.name || user?.username || 'Người Dùng';
    const initial = (name[0] || 'U').toUpperCase();
    const role = (user?.role || 'USER').toUpperCase();
    const isOrganizer = authStore.isOrganizer;

    const roleTagClass = role === 'ADMIN' ? 'role-tag admin' : (role === 'ORGANIZER' ? 'role-tag organizer' : 'role-tag user');

    this.container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 0.75rem;">
        ${isOrganizer ? `
          <a href="#organizer-studio" class="btn btn-neon btn-sm" id="btn-nav-studio" style="font-weight: 700; text-decoration: none;">
            Kênh Ban Tổ Chức
          </a>
        ` : `
          <a href="#my-orders" class="btn btn-ghost btn-sm" id="btn-nav-orders" style="font-weight: 500; text-decoration: none;">
            Vé Của Tôi
          </a>
        `}

        <!-- User Profile Tag & Dropdown -->
        <div class="user-menu" id="user-menu-root">
          <div class="user-avatar" id="user-avatar-btn" title="${escapeHtml(name)}">
            ${escapeHtml(initial)}
          </div>

          <div style="display: flex; flex-direction: column; line-height: 1.2;">
            <span style="font-size: 0.875rem; font-weight: 600; color: var(--color-text-primary); max-width: 140px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">
              ${escapeHtml(name)}
            </span>
            <span class="${roleTagClass}" style="margin-top: 2px;">
              ${escapeHtml(role)}
            </span>
          </div>

          <button class="btn btn-ghost btn-sm" id="btn-nav-logout" title="Đăng Xuất" style="padding: 0.35rem 0.6rem; margin-left: 0.25rem;">
            Đăng Xuất
          </button>
        </div>
      </div>
    `;

    // Attach logout click handler
    $('#btn-nav-logout')?.addEventListener('click', async () => {
      await this._handleLogout();
    });
  }

  async _handleLogout() {
    const refreshToken = authStore.refreshToken;
    try {
      if (refreshToken) {
        await authApi.logout(refreshToken);
      }
    } catch (err) {
      console.warn('[NAVBAR LOGOUT] Server logout notice:', err.message);
    } finally {
      authStore.clearAuth();
      toast.info('Đã đăng xuất khỏi hệ thống.');
    }
  }
}

export const navbar = new NavbarController();

if (typeof window !== 'undefined') {
  window.__navbar = navbar;
}
