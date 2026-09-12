/**
 * Customer "My Tickets" View
 * Displays purchased orders, gate check-in status, and digital QR passes
 */
import { $, $$ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND, formatDateTime } from '../../utils/formatters.js';
import { getSpinnerHtml } from '../ui/loader.js';
import { ordersApi } from '../orders/orders.api.js';
import { authStore } from '../auth/auth.store.js';
import { authModal } from '../auth/auth.modal.js';
import { eticketModal } from './eticket.modal.js';
import { checkoutDrawer } from './checkout.drawer.js';

class MyTicketsView {
  constructor() {
    this.container = null;
    this.orders = [];
    this.currentFilter = 'ALL'; // 'ALL' | 'PENDING' | 'COMPLETED' | 'CHECKED_IN'
    this.tickInterval = null;
  }

  async render() {
    this.container = $('#app');
    if (!this.container) return;
    this._stopTick();

    // Must be logged in to view tickets
    if (!authStore.isAuthenticated) {
      this.container.innerHTML = `
        <div class="container section text-center" style="max-width: 540px; margin: 0 auto;">
          <div class="glass-card" style="padding: 3rem 2rem;">
            <div style="font-size: 3rem; margin-bottom: 1rem;">&#x1F39F;</div>
            <h2 style="margin-bottom: 0.75rem;">Đăng Nhập Để Xem Vé</h2>
            <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">
              Vui lòng đăng nhập vào tài khoản của bạn để truy cập danh sách vé điện tử và mã QR check-in tại cổng.
            </p>
            <button class="btn btn-primary btn-lg" id="btn-login-mytickets">Đăng Nhập Ngay</button>
          </div>
        </div>
      `;

      $('#btn-login-mytickets')?.addEventListener('click', () => {
        authModal.open('login');
      });
      return;
    }

    this.container.innerHTML = `
      <div class="container section-sm">
        <div class="flex items-center justify-between" style="margin-bottom: 2rem; flex-wrap: wrap; gap: 1rem;">
          <div>
            <h1>Vé Của Tôi</h1>
            <p class="text-sm">Quản lý vé điện tử và mã QR xuất trình tại cổng sự kiện</p>
          </div>

          <!-- Status Filters -->
          <div style="display: flex; gap: 0.5rem; flex-wrap: wrap;">
            <button type="button" class="btn btn-sm ${this.currentFilter === 'ALL' ? 'btn-primary' : 'btn-ghost'}" data-filter="ALL">Tất Cả</button>
            <button type="button" class="btn btn-sm ${this.currentFilter === 'PENDING' ? 'btn-primary' : 'btn-ghost'}" data-filter="PENDING">Chờ Thanh Toán</button>
            <button type="button" class="btn btn-sm ${this.currentFilter === 'COMPLETED' ? 'btn-primary' : 'btn-ghost'}" data-filter="COMPLETED">Đã Thanh Toán</button>
            <button type="button" class="btn btn-sm ${this.currentFilter === 'CHECKED_IN' ? 'btn-primary' : 'btn-ghost'}" data-filter="CHECKED_IN">Đã Check-in</button>
          </div>
        </div>

        <div id="my-tickets-list-container">
          <div class="text-center" style="padding: 3rem 0;">
            ${getSpinnerHtml('lg')}
            <p style="color: var(--color-text-muted); margin-top: 1rem;">Đang tải danh sách vé điện tử...</p>
          </div>
        </div>
      </div>
    `;

    this._bindFilters();
    await this._loadOrders();
  }

  async _loadOrders() {
    try {
      const res = await ordersApi.getMyOrders();
      if (res?.success && res.data) {
        this.orders = res.data;
        this._renderOrdersList();
      }
    } catch (err) {
      const listEl = $('#my-tickets-list-container');
      if (listEl) {
        listEl.innerHTML = `
          <div class="text-center" style="padding: 3rem 0; color: #EF4444;">
            <p>Không thể tải danh sách vé: ${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }

  _renderOrdersList() {
    const listEl = $('#my-tickets-list-container');
    if (!listEl) return;
    this._stopTick();

    const now = Date.now();

    const filtered = this.orders.filter((order) => {
      if (this.currentFilter === 'ALL') return true;
      if (this.currentFilter === 'PENDING') {
        return order.status === 'PENDING' && new Date(order.expiresAt).getTime() > now;
      }
      return order.status === this.currentFilter;
    });

    if (filtered.length === 0) {
      listEl.innerHTML = `
        <div class="glass-card text-center" style="padding: 4rem 2rem;">
          <div style="font-size: 2.5rem; margin-bottom: 0.75rem;">&#x1F4E6;</div>
          <h3 style="color: var(--color-text-secondary); margin-bottom: 0.5rem;">Bạn chưa có vé nào trong mục này</h3>
          <p style="color: var(--color-text-muted); font-size: 0.9375rem; margin-bottom: 1.5rem;">
            Hãy khám phá các concert đỉnh cao và tham gia săn vé Flash-Sale ngay hôm nay!
          </p>
          <a href="#events" class="btn btn-primary">Khám Phá Sự Kiện</a>
        </div>
      `;
      return;
    }

    let hasActivePending = false;

    listEl.innerHTML = `
      <div style="display: flex; flex-direction: column; gap: 1.25rem;">
        ${filtered.map((order) => {
          const event = order.ticketTier?.event || {};
          const tier = order.ticketTier || {};
          const bannerImg = event.bannerUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=400&auto=format&fit=crop&q=80';

          const isCompleted = order.status === 'COMPLETED';
          const isCheckedIn = order.status === 'CHECKED_IN';
          const isPending = order.status === 'PENDING';
          const expiresAtTime = new Date(order.expiresAt).getTime();
          const remainingMs = expiresAtTime - now;
          const isPendingActive = isPending && remainingMs > 0;

          if (isPendingActive) hasActivePending = true;

          let statusBadge = '<span class="badge badge-sold-out">Đã Hết Hạn</span>';
          if (isCompleted) {
            statusBadge = '<span class="badge badge-success">&#x2714; Đã Thanh Toán (Hợp Lệ)</span>';
          } else if (isCheckedIn) {
            statusBadge = '<span class="badge badge-brand">&#x2705; Đã Check-in Tại Cổng</span>';
          } else if (isPendingActive) {
            const totalSec = Math.floor(remainingMs / 1000);
            const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
            const s = (totalSec % 60).toString().padStart(2, '0');
            statusBadge = `
              <span class="badge badge-warning" style="display: inline-flex; align-items: center; gap: 5px;">
                <span class="hold-pulse-dot" style="width: 6px; height: 6px;"></span>
                Chờ Thanh Toán (<span class="order-countdown-text" data-expires="${expiresAtTime}">${m}:${s}</span>)
              </span>
            `;
          }

          return `
            <div class="glass-card" style="padding: 1.5rem; display: flex; align-items: center; justify-content: space-between; gap: 1.5rem; flex-wrap: wrap;">
              <!-- Left: Image & Info -->
              <div style="display: flex; gap: 1.25rem; align-items: center; min-width: 320px; flex: 1;">
                <div style="width: 100px; height: 100px; background-image: url('${escapeHtml(bannerImg)}'); background-size: cover; background-position: center; border-radius: var(--radius-md); flex-shrink: 0;"></div>
                
                <div>
                  <div style="margin-bottom: 0.35rem;">
                    ${statusBadge}
                  </div>
                  <h3 style="font-size: 1.15rem; color: var(--color-text-primary); margin-bottom: 0.25rem;">
                    ${escapeHtml(event.title || 'Sự Kiện')}
                  </h3>
                  <p style="font-size: 0.8125rem; color: var(--color-text-muted); margin-bottom: 0.25rem;">
                    &#x1F4C5; ${formatDateTime(event.startTime || order.createdAt)}
                  </p>
                  <p style="font-size: 0.875rem; color: var(--color-text-secondary); margin: 0;">
                    Hạng vé: <strong>${escapeHtml(tier.name || 'Tiêu chuẩn')}</strong> &bull; Số lượng: <strong>${order.quantity} vé</strong>
                  </p>
                </div>
              </div>

              <!-- Right: Total & Action -->
              <div style="text-align: right; display: flex; flex-direction: column; align-items: flex-end; gap: 0.75rem;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted); display: block;">Tổng tiền</span>
                  <span style="font-size: 1.25rem; font-weight: 800; color: var(--color-brand-neon);">
                    ${formatCurrencyVND(order.totalAmount)}
                  </span>
                </div>

                ${isCompleted || isCheckedIn ? `
                  <button type="button" class="btn btn-primary btn-sm btn-view-eticket" data-order-id="${order.id}">
                    &#x1F3AB; Xem Vé &amp; Mã QR
                  </button>
                ` : ''}

                ${isPendingActive ? `
                  <button type="button" class="btn btn-neon btn-sm btn-resume-checkout" data-order-id="${order.id}">
                    &#x26A1; Tiếp Tục Thanh Toán
                  </button>
                ` : ''}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    // Bind QR view clicks
    $$('.btn-view-eticket', listEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.orderId;
        const order = this.orders.find((o) => o.id === orderId);
        if (order) {
          eticketModal.open(order);
        }
      });
    });

    // Bind Resume Checkout clicks
    $$('.btn-resume-checkout', listEl).forEach((btn) => {
      btn.addEventListener('click', () => {
        const orderId = btn.dataset.orderId;
        const order = this.orders.find((o) => o.id === orderId);
        if (order) {
          checkoutDrawer.open(order);
        }
      });
    });

    if (hasActivePending) {
      this._startTick();
    }
  }

  _startTick() {
    this._stopTick();
    this.tickInterval = setInterval(() => {
      const countdownEls = $$('.order-countdown-text', this.container);
      if (countdownEls.length === 0) {
        this._stopTick();
        return;
      }

      let expiredFound = false;
      const now = Date.now();

      countdownEls.forEach((el) => {
        const target = parseInt(el.dataset.expires, 10);
        const rem = target - now;
        if (rem <= 0) {
          el.textContent = '00:00';
          expiredFound = true;
        } else {
          const sec = Math.floor(rem / 1000);
          const m = Math.floor(sec / 60).toString().padStart(2, '0');
          const s = (sec % 60).toString().padStart(2, '0');
          el.textContent = `${m}:${s}`;
        }
      });

      if (expiredFound) {
        this._stopTick();
        this._loadOrders();
      }
    }, 1000);
  }

  _stopTick() {
    if (this.tickInterval) {
      clearInterval(this.tickInterval);
      this.tickInterval = null;
    }
  }

  _bindFilters() {
    this.container.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-filter]');
      if (!btn) return;

      this.currentFilter = btn.dataset.filter;

      // Update button active state
      $$('[data-filter]', this.container).forEach((b) => {
        const isActive = b.dataset.filter === this.currentFilter;
        b.className = `btn btn-sm ${isActive ? 'btn-primary' : 'btn-ghost'}`;
      });

      this._renderOrdersList();
    });
  }
}

export const myTicketsView = new MyTicketsView();

if (typeof window !== 'undefined') {
  window.__myTicketsView = myTicketsView;
}
