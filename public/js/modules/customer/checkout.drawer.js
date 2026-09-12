/**
 * Checkout Drawer & 10-Minute BullMQ Hold Visualizer
 * Manages order hold expiration timer, payment method, and idempotent checkout execution
 */
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND } from '../../utils/formatters.js';
import { toast } from '../ui/toast.js';
import { modalManager } from '../ui/modal.js';
import { getSpinnerHtml } from '../ui/loader.js';
import { ordersApi } from '../orders/orders.api.js';
import { eticketModal } from './eticket.modal.js';
import { eventBus } from '../../core/event-bus.js';
import { CONFIG } from '../../core/config.js';

class CheckoutDrawer {
  constructor() {
    this.modalEl = null;
    this.currentOrder = null;
    this.activeHoldOrder = null;
    this.timerInterval = null;
    this.bannerInterval = null;
  }

  init() {
    const modalRoot = $('#modal-root');
    if (!modalRoot || $('#checkout-drawer')) return;

    const markup = `
      <div class="modal-overlay" id="checkout-drawer" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div class="modal-container" style="max-width: 500px;">
          <div class="modal-header">
            <h3 class="modal-title" id="checkout-title">Xác Nhận & Thanh Toán Vé</h3>
            <button class="modal-close-btn" id="checkout-drawer-close" aria-label="Đóng">&times;</button>
          </div>

          <div class="modal-body">
            <!-- BullMQ 10-Minute Countdown Warning Banner -->
            <div class="hold-timer-banner">
              <div class="hold-pulse-dot"></div>
              <div>
                <span style="font-weight: 700; color: #F87171; font-size: 0.875rem;">Vé đang được giữ:</span>
                <span id="checkout-timer-text" style="font-family: monospace; font-weight: 800; color: #FCA5A5; font-size: 1rem; margin-left: 0.25rem;">
                  --:--
                </span>
                <div style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 2px;">
                  Vui lòng thanh toán trước khi vé được tự động hoàn về kho bởi hệ thống.
                </div>
              </div>
            </div>

            <!-- Order Summary -->
            <div id="checkout-summary-content" style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-lg); padding: 1.25rem; margin-bottom: 1.25rem;">
              <!-- Dynamic Summary -->
            </div>

            <!-- Payment Method Selector -->
            <div style="margin-bottom: 1.5rem;">
              <label class="form-label" style="margin-bottom: 0.75rem;">Phương thức thanh toán</label>
              <div style="display: flex; flex-direction: column; gap: 0.5rem;">
                <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: rgba(99, 102, 241, 0.08); border: 1px solid var(--color-brand-primary); border-radius: var(--radius-md); cursor: pointer;">
                  <input type="radio" name="payment_method" value="CREDIT_CARD" checked style="accent-color: var(--color-brand-primary);">
                  <span style="font-weight: 600; font-size: 0.9375rem;">Thẻ Quốc Tế (Visa / Mastercard / JCB)</span>
                </label>
                <label style="display: flex; align-items: center; gap: 0.75rem; padding: 0.75rem 1rem; background: rgba(255, 255, 255, 0.03); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); cursor: pointer;">
                  <input type="radio" name="payment_method" value="E_WALLET" style="accent-color: var(--color-brand-primary);">
                  <span style="font-weight: 600; font-size: 0.9375rem;">Ví Điện Tử (MoMo / ZaloPay giả lập)</span>
                </label>
              </div>
            </div>

            <!-- Security Badge -->
            <div style="display: flex; align-items: center; gap: 0.5rem; font-size: 0.75rem; color: var(--color-text-muted); margin-bottom: 1.25rem;">
              <span style="color: #10B981;">&#x2714;</span> Bảo vệ thanh toán Idempotent (Chống trừ tiền trùng lặp)
            </div>

            <!-- Submit Button -->
            <button class="btn btn-primary btn-block btn-lg" id="btn-submit-checkout">
              Thanh Toán Ngay
            </button>
          </div>
        </div>
      </div>
    `;

    modalRoot.insertAdjacentHTML('beforeend', markup);
    this.modalEl = $('#checkout-drawer');

    $('#checkout-drawer-close')?.addEventListener('click', () => {
      this.close();
    });

    $('#btn-submit-checkout')?.addEventListener('click', () => {
      this._handleCheckout();
    });

    eventBus.subscribe(CONFIG.EVENTS.MODAL_CLOSE, ({ modalId }) => {
      if (modalId === 'checkout-drawer') {
        this._onDrawerClosed();
      }
    });

    this.checkRestoredHold();
  }

  open(order) {
    if (!this.modalEl) this.init();

    this.currentOrder = order;
    this.activeHoldOrder = order;

    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem('active_hold_order', JSON.stringify(order));
      }
    } catch (e) {}

    this._removeFloatingBanner();
    this._renderSummary();
    this._startTimer();

    modalManager.open(this.modalEl);
  }

  close() {
    this._stopTimer();
    if (this.modalEl) modalManager.close(this.modalEl);
    this._onDrawerClosed();
  }

  _onDrawerClosed() {
    this._stopTimer();
    this.currentOrder = null;

    // If active hold is still valid, display floating bottom banner
    if (this.activeHoldOrder) {
      const remainingMs = new Date(this.activeHoldOrder.expiresAt).getTime() - Date.now();
      if (remainingMs > 0) {
        this._showFloatingBanner();
      } else {
        this._clearActiveHold();
      }
    }
  }

  _clearActiveHold() {
    this.activeHoldOrder = null;
    this.currentOrder = null;
    try {
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.removeItem('active_hold_order');
      }
    } catch (e) {}
    this._removeFloatingBanner();
  }

  _showFloatingBanner() {
    this._removeFloatingBanner();
    if (!this.activeHoldOrder) return;

    const expiresAt = new Date(this.activeHoldOrder.expiresAt).getTime();
    if (expiresAt <= Date.now()) {
      this._clearActiveHold();
      return;
    }

    const tierName = this.activeHoldOrder.ticketTier?.name || 'Hạng Vé';
    const quantity = this.activeHoldOrder.quantity || 1;

    const bannerHtml = `
      <div id="floating-hold-banner" class="floating-hold-banner">
        <div class="floating-hold-info">
          <div class="hold-pulse-dot"></div>
          <span class="floating-hold-text">
            Đang giữ ${quantity} vé <strong>${escapeHtml(tierName)}</strong> &bull; Còn:
          </span>
          <span class="floating-hold-timer" id="floating-banner-timer">--:--</span>
        </div>
        <button type="button" class="btn btn-primary btn-sm" id="btn-floating-resume">
          &#x26A1; Tiếp Tục Thanh Toán
        </button>
        <button type="button" class="floating-hold-close" id="btn-floating-close" title="Ẩn thông báo">&times;</button>
      </div>
    `;

    document.body.insertAdjacentHTML('beforeend', bannerHtml);

    const updateBannerClock = () => {
      const remainingMs = expiresAt - Date.now();
      const timerEl = $('#floating-banner-timer');

      if (remainingMs <= 0) {
        if (timerEl) timerEl.textContent = '00:00 (Hết Hạn)';
        this._removeFloatingBanner();
        toast.error('Thời gian giữ vé đã kết thúc! Vé đã được tự động hoàn về kho.');
        eventBus.publish('order:hold_expired', { orderId: this.activeHoldOrder?.id });
        this._clearActiveHold();
        return;
      }

      const totalSec = Math.floor(remainingMs / 1000);
      const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
      const s = (totalSec % 60).toString().padStart(2, '0');
      if (timerEl) timerEl.textContent = `${m}:${s}`;
    };

    updateBannerClock();
    this.bannerInterval = setInterval(updateBannerClock, 1000);

    $('#btn-floating-resume')?.addEventListener('click', () => {
      this._removeFloatingBanner();
      if (this.activeHoldOrder) {
        this.open(this.activeHoldOrder);
      }
    });

    $('#btn-floating-close')?.addEventListener('click', () => {
      this._removeFloatingBanner();
    });
  }

  _removeFloatingBanner() {
    if (this.bannerInterval) {
      clearInterval(this.bannerInterval);
      this.bannerInterval = null;
    }
    const banner = $('#floating-hold-banner');
    if (banner) banner.remove();
  }

  checkRestoredHold() {
    try {
      if (typeof sessionStorage !== 'undefined') {
        const stored = sessionStorage.getItem('active_hold_order');
        if (stored) {
          const order = JSON.parse(stored);
          if (order?.expiresAt && new Date(order.expiresAt).getTime() > Date.now()) {
            this.activeHoldOrder = order;
            this._showFloatingBanner();
          } else {
            sessionStorage.removeItem('active_hold_order');
          }
        }
      }
    } catch (e) {
      console.warn('[CHECKOUT DRAWER] Error restoring hold:', e);
    }
  }

  _renderSummary() {
    const summaryEl = $('#checkout-summary-content');
    if (!summaryEl || !this.currentOrder) return;

    const order = this.currentOrder;
    const eventTitle = order.ticketTier?.event?.title || 'Sự Kiện';
    const tierName = order.ticketTier?.name || 'Hạng Vé';
    const quantity = order.quantity || 1;
    const totalAmount = order.totalAmount || 0;

    summaryEl.innerHTML = `
      <h4 style="font-size: 1rem; color: var(--color-text-primary); margin-bottom: 0.5rem;">
        ${escapeHtml(eventTitle)}
      </h4>
      <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.35rem;">
        <span style="color: var(--color-text-muted);">Hạng vé:</span>
        <span style="color: var(--color-text-secondary); font-weight: 500;">${escapeHtml(tierName)}</span>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 0.875rem; margin-bottom: 0.35rem;">
        <span style="color: var(--color-text-muted);">Số lượng vé:</span>
        <span style="color: var(--color-text-secondary); font-weight: 500;">${quantity} vé</span>
      </div>
      <div style="border-top: 1px dashed var(--color-border-medium); margin: 0.75rem 0; padding-top: 0.75rem; display: flex; justify-content: space-between; font-size: 1.05rem;">
        <span style="font-weight: 700; color: var(--color-text-primary);">Tổng thanh toán:</span>
        <span style="font-weight: 800; color: var(--color-brand-neon);">
          ${formatCurrencyVND(totalAmount)}
        </span>
      </div>
    `;
  }

  _startTimer() {
    this._stopTimer();

    const expiresAt = new Date(this.currentOrder?.expiresAt).getTime();

    const updateClock = () => {
      const remainingMs = expiresAt - Date.now();
      const timerText = $('#checkout-timer-text');

      if (remainingMs <= 0) {
        if (timerText) timerText.textContent = '00:00 (HẾT HẠN)';
        this._stopTimer();
        toast.error('Thời gian giữ vé đã kết thúc! Vé đã được tự động hoàn về kho.');
        this._clearActiveHold();
        if (this.modalEl) modalManager.close(this.modalEl);
        eventBus.publish('order:hold_expired', { orderId: this.currentOrder?.id });
        return;
      }

      const totalSeconds = Math.floor(remainingMs / 1000);
      const minutes = Math.floor(totalSeconds / 60).toString().padStart(2, '0');
      const seconds = (totalSeconds % 60).toString().padStart(2, '0');

      if (timerText) {
        timerText.textContent = `${minutes}:${seconds}`;
      }
    };

    updateClock();
    this.timerInterval = setInterval(updateClock, 1000);
  }

  _stopTimer() {
    if (this.timerInterval) {
      clearInterval(this.timerInterval);
      this.timerInterval = null;
    }
  }

  async _handleCheckout() {
    if (!this.currentOrder) return;

    const btn = $('#btn-submit-checkout');
    const orderId = this.currentOrder.id;

    // Idempotency Key management: retrieve from sessionStorage or generate
    const storageKey = `checkout_key_${orderId}`;
    let idempotencyKey = (typeof sessionStorage !== 'undefined' ? sessionStorage.getItem(storageKey) : null);
    if (!idempotencyKey) {
      idempotencyKey = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `idemp_${Date.now()}_${Math.random()}`;
      if (typeof sessionStorage !== 'undefined') {
        sessionStorage.setItem(storageKey, idempotencyKey);
      }
    }

    const originalBtnText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${getSpinnerHtml('sm')} Đang xử lý thanh toán an toàn...`;

    try {
      const res = await ordersApi.checkout(orderId, {
        paymentMethod: 'CREDIT_CARD',
        idempotencyKey,
      });

      if (res?.success && res.data) {
        toast.success('Thanh toán thành công! Vé điện tử của bạn đã được xuất.');
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.removeItem(storageKey);
        }
        this._clearActiveHold();
        if (this.modalEl) modalManager.close(this.modalEl);

        // Open E-Ticket pass modal
        eticketModal.open(res.data);
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Thanh toán thất bại. Vui lòng thử lại.';
      toast.error(msg);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalBtnText;
      }
    }
  }
}

export const checkoutDrawer = new CheckoutDrawer();

if (typeof window !== 'undefined') {
  window.__checkoutDrawer = checkoutDrawer;
}
