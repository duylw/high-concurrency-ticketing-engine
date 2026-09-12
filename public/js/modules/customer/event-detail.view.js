/**
 * Event Detail & Flash-Sale Ticket Tier Selector View
 * Handles scheduled flash-sale countdown, live stock visualization, and atomic ticket holding
 */
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND, formatDateTime, calculateCountdown } from '../../utils/formatters.js';
import { toast } from '../ui/toast.js';
import { getSpinnerHtml } from '../ui/loader.js';
import { eventsApi } from '../events/events.api.js';
import { ordersApi } from '../orders/orders.api.js';
import { authStore } from '../auth/auth.store.js';
import { authModal } from '../auth/auth.modal.js';
import { checkoutDrawer } from './checkout.drawer.js';
import { eventBus } from '../../core/event-bus.js';

class EventDetailView {
  constructor() {
    this.container = null;
    this.eventData = null;
    this.selectedTier = null;
    this.selectedQuantity = 1;
    this.countdownInterval = null;
  }

  init() {
    // Listen for order release events to refresh stock
    eventBus.subscribe('order:hold_expired', () => {
      if (this.eventData) {
        this.render(this.eventData.id);
      }
    });
  }

  async render(eventId) {
    this.container = $('#app');
    if (!this.container) return;

    this._stopCountdown();

    this.container.innerHTML = `
      <div class="container section text-center">
        ${getSpinnerHtml('lg')}
        <p style="color: var(--color-text-muted); margin-top: 1rem;">Đang tải thông tin sự kiện & bảng giá vé...</p>
      </div>
    `;

    try {
      const res = await eventsApi.getEventById(eventId);
      if (!res?.success || !res.data) {
        throw new Error('Không thể tải thông tin sự kiện.');
      }

      this.eventData = res.data;
      this.selectedTier = this.eventData.ticketTiers?.[0] || null;
      this.selectedQuantity = 1;

      this._renderContent();
    } catch (err) {
      this.container.innerHTML = `
        <div class="container section text-center">
          <h2 style="color: #EF4444; margin-bottom: 1rem;">Không tìm thấy sự kiện</h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 1.5rem;">${escapeHtml(err.message)}</p>
          <a href="#events" class="btn btn-primary">Quay Lại Danh Sách Sự Kiện</a>
        </div>
      `;
    }
  }

  _renderContent() {
    const event = this.eventData;
    const now = new Date();
    const saleStart = event.saleStartTime ? new Date(event.saleStartTime) : null;
    const saleEnd = event.saleEndTime ? new Date(event.saleEndTime) : null;

    const isUpcomingSale = saleStart && now < saleStart;
    const isClosedSale = saleEnd && now > saleEnd;
    const isSaleActive = !isUpcomingSale && !isClosedSale;

    const bannerImg = event.bannerUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop&q=80';

    this.container.innerHTML = `
      <div class="container section-sm">
        <!-- Back Navigation -->
        <div style="margin-bottom: 1.5rem;">
          <a href="#events" class="btn btn-ghost btn-sm" style="display: inline-flex; align-items: center; gap: 0.5rem; text-decoration: none;">
            &larr; Quay Lại Danh Mục Sự Kiện
          </a>
        </div>

        <!-- Event Hero Header Card -->
        <div class="glass-card" style="margin-bottom: 2.5rem; overflow: hidden;">
          <div style="height: 320px; background-image: url('${escapeHtml(bannerImg)}'); background-size: cover; background-position: center; position: relative;">
            <div style="position: absolute; inset: 0; background: linear-gradient(180deg, rgba(7,9,14,0.1) 0%, rgba(7,9,14,0.95) 100%);"></div>
            
            <div style="position: absolute; bottom: 1.5rem; left: 1.5rem; right: 1.5rem;">
              <div style="display: flex; gap: 0.5rem; margin-bottom: 0.75rem; flex-wrap: wrap;">
                ${isSaleActive ? '<span class="badge badge-flash-active">&#x26A1; Đang Mở Bán Flash-Sale</span>' : ''}
                ${isUpcomingSale ? '<span class="badge badge-flash-upcoming">&#x23F3; Sắp Mở Bán</span>' : ''}
                ${isClosedSale ? '<span class="badge badge-sold-out">&#x1F512; Đã Đóng Mở Bán</span>' : ''}
                <span class="badge badge-brand">Ban Tổ Chức: ${escapeHtml(event.organizer?.name || 'Eventix Official')}</span>
              </div>

              <h1 style="font-size: 2rem; color: #FFFFFF; margin-bottom: 0.5rem;">
                ${escapeHtml(event.title)}
              </h1>

              <p style="color: var(--color-text-secondary); font-size: 0.9375rem; margin: 0;">
                &#x1F4C5; Thời gian: <strong>${formatDateTime(event.startTime)}</strong> &mdash; <strong>${formatDateTime(event.endTime)}</strong>
              </p>
            </div>
          </div>

          <div style="padding: 1.5rem;">
            <h3 style="font-size: 1.1rem; margin-bottom: 0.75rem;">Giới thiệu sự kiện</h3>
            <p style="color: var(--color-text-secondary); line-height: 1.6; margin: 0;">
              ${escapeHtml(event.description || 'Chưa có mô tả chi tiết cho sự kiện này.')}
            </p>
          </div>
        </div>

        <!-- Flash-Sale Ticket Selector Section -->
        <div class="grid grid-cols-3" style="gap: 2rem;">
          <!-- Left 2 Cols: Ticket Tiers Selection -->
          <div style="grid-column: span 2;">
            <!-- Scheduled Countdown Card if upcoming -->
            ${isUpcomingSale ? `
              <div class="flash-countdown-card" id="sale-countdown-card">
                <div>
                  <h4 style="color: #FCD34D; font-size: 0.95rem; margin-bottom: 0.25rem;">
                    &#x23F3; Giờ mở bán Flash-Sale sắp bắt đầu!
                  </h4>
                  <span style="font-size: 0.8125rem; color: var(--color-text-muted);">
                    Hệ thống sẽ tự động kích hoạt nút săn vé khi đồng hồ về 00:00:00.
                  </span>
                </div>
                <div class="countdown-digits" id="sale-countdown-timer">
                  00:00:00
                </div>
              </div>
            ` : ''}

            <h3 style="margin-bottom: 1.25rem; display: flex; align-items: center; justify-content: space-between;">
              <span>Chọn Hạng Vé</span>
              <span style="font-size: 0.8125rem; font-weight: 500; color: var(--color-text-muted);">
                Tồn kho cập nhật thời gian thực
              </span>
            </h3>

            <div class="tier-cards-list" id="tier-cards-container">
              <!-- Rendered via _renderTiers() -->
            </div>
          </div>

          <!-- Right 1 Col: Summary & Buy Card -->
          <div>
            <div class="glass-card" style="padding: 1.5rem; position: sticky; top: 96px;">
              <h3 style="font-size: 1.15rem; margin-bottom: 1.25rem;">Tóm Tắt Đặt Vé</h3>

              <div style="margin-bottom: 1.25rem;">
                <label class="form-label">Hạng vé đang chọn</label>
                <div id="summary-tier-name" style="font-weight: 700; color: var(--color-brand-neon); font-size: 1.05rem;">
                  ${escapeHtml(this.selectedTier?.name || 'Chưa chọn')}
                </div>
              </div>

              <!-- Quantity Selector -->
              <div style="margin-bottom: 1.25rem;">
                <label class="form-label">Số lượng vé</label>
                <div class="qty-selector">
                  <button type="button" class="qty-btn" id="btn-qty-minus">&minus;</button>
                  <span class="qty-value" id="qty-display">${this.selectedQuantity}</span>
                  <button type="button" class="qty-btn" id="btn-qty-plus">&plus;</button>
                </div>
                <span style="font-size: 0.75rem; color: var(--color-text-muted); margin-top: 4px; display: block;">
                  Tối đa 4 vé mỗi lần giữ chỗ
                </span>
              </div>

              <!-- Total Amount -->
              <div style="border-top: 1px dashed var(--color-border-medium); margin: 1rem 0; padding-top: 1rem; display: flex; justify-content: space-between; align-items: baseline;">
                <span style="font-weight: 600; color: var(--color-text-secondary);">Tạm tính:</span>
                <span id="summary-total-price" style="font-size: 1.35rem; font-weight: 800; color: var(--color-text-primary);">
                  ${formatCurrencyVND((this.selectedTier?.price || 0) * this.selectedQuantity)}
                </span>
              </div>

              <!-- CTA Hold Button -->
              <button class="btn btn-primary btn-block btn-lg" id="btn-hold-ticket" ${!isSaleActive ? 'disabled' : ''}>
                ${isUpcomingSale ? 'Chờ Mở Bán...' : (isClosedSale ? 'Đã Đóng Bán' : 'Giữ Vé Ngay (10 Phút)')}
              </button>

              <div style="margin-top: 1rem; font-size: 0.75rem; color: var(--color-text-muted); line-height: 1.4;">
                &#x1F512; Vé được khóa nguyên tử (Atomic Lock) tại cơ sở dữ liệu. Sau khi giữ vé, bạn có 10 phút để hoàn tất thanh toán trước khi vé được tự động hoàn về kho.
              </div>
            </div>
          </div>
        </div>
      </div>
    `;

    this._renderTiers();
    this._bindEvents();

    if (isUpcomingSale) {
      this._startSaleCountdown(saleStart);
    }
  }

  _renderTiers() {
    const container = $('#tier-cards-container');
    if (!container || !this.eventData?.ticketTiers) return;

    container.innerHTML = this.eventData.ticketTiers.map((tier) => {
      const isSelected = this.selectedTier?.id === tier.id;
      const isSoldOut = tier.availableStock <= 0;
      const percent = tier.totalStock > 0 ? Math.round((tier.availableStock / tier.totalStock) * 100) : 0;
      const isLowStock = percent <= 10 && !isSoldOut;

      return `
        <div class="tier-card ${isSelected ? 'is-selected' : ''} ${isSoldOut ? 'is-sold-out' : ''}" data-tier-id="${tier.id}">
          <div style="flex: 1;">
            <div style="display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.25rem;">
              <strong style="font-size: 1.1rem; color: var(--color-text-primary);">${escapeHtml(tier.name)}</strong>
              ${isSoldOut ? '<span class="badge badge-sold-out">Hết Vé</span>' : ''}
              ${isLowStock ? '<span class="badge badge-sold-out">&#x26A0; Sắp Hết</span>' : ''}
            </div>
            
            <div style="font-size: 1.25rem; font-weight: 800; color: var(--color-brand-neon);">
              ${formatCurrencyVND(tier.price)}
            </div>
          </div>

          <!-- Stock Progress Bar -->
          <div class="stock-bar-wrap text-right">
            <div style="font-size: 0.8125rem; color: ${isLowStock ? '#EF4444' : 'var(--color-text-secondary)'}; font-weight: 600;">
              ${isSoldOut ? 'Hết vé' : `Còn ${tier.availableStock} / ${tier.totalStock} vé`}
            </div>
            <div class="stock-bar">
              <div class="stock-bar-fill ${isLowStock ? 'warning' : ''}" style="width: ${percent}%;"></div>
            </div>
          </div>
        </div>
      `;
    }).join('');
  }

  _bindEvents() {
    // Tier Selection click
    $('#tier-cards-container')?.addEventListener('click', (e) => {
      const card = e.target.closest('.tier-card:not(.is-sold-out)');
      if (!card) return;

      const tierId = card.dataset.tierId;
      this.selectedTier = this.eventData.ticketTiers.find((t) => t.id === tierId) || null;
      this._renderTiers();
      this._updateSummary();
    });

    // Quantity selectors
    $('#btn-qty-minus')?.addEventListener('click', () => {
      if (this.selectedQuantity > 1) {
        this.selectedQuantity--;
        this._updateSummary();
      }
    });

    $('#btn-qty-plus')?.addEventListener('click', () => {
      const maxAvailable = this.selectedTier?.availableStock || 4;
      if (this.selectedQuantity < Math.min(4, maxAvailable)) {
        this.selectedQuantity++;
        this._updateSummary();
      } else {
        toast.info('Số lượng tối đa mỗi lần giữ chỗ là 4 vé.');
      }
    });

    // Hold Ticket Button
    $('#btn-hold-ticket')?.addEventListener('click', () => this._handleHoldTicket());
  }

  _updateSummary() {
    const nameEl = $('#summary-tier-name');
    const qtyEl = $('#qty-display');
    const totalEl = $('#summary-total-price');

    if (nameEl) nameEl.textContent = this.selectedTier?.name || 'Chưa chọn';
    if (qtyEl) qtyEl.textContent = this.selectedQuantity;
    if (totalEl) {
      const total = (this.selectedTier?.price || 0) * this.selectedQuantity;
      totalEl.textContent = formatCurrencyVND(total);
    }
  }

  _startSaleCountdown(targetDate) {
    this._stopCountdown();

    const updateTimer = () => {
      const countdown = calculateCountdown(targetDate);
      const timerEl = $('#sale-countdown-timer');

      if (countdown.isExpired) {
        this._stopCountdown();
        toast.success('Flash-Sale chính thức mở bán! Chúc bạn săn vé thành công!');
        this.render(this.eventData.id); // Re-render to enable button
        return;
      }

      if (timerEl) {
        const h = countdown.hours.toString().padStart(2, '0');
        const m = countdown.minutes.toString().padStart(2, '0');
        const s = countdown.seconds.toString().padStart(2, '0');
        timerEl.textContent = `${h}:${m}:${s}`;
      }
    };

    updateTimer();
    this.countdownInterval = setInterval(updateTimer, 1000);
  }

  _stopCountdown() {
    if (this.countdownInterval) {
      clearInterval(this.countdownInterval);
      this.countdownInterval = null;
    }
  }

  async _handleHoldTicket() {
    if (!this.selectedTier) {
      toast.error('Vui lòng chọn một hạng vé.');
      return;
    }

    // Auth check
    if (!authStore.isAuthenticated) {
      toast.info('Vui lòng đăng nhập để tham gia săn vé!');
      authModal.open('login');
      return;
    }

    const btn = $('#btn-hold-ticket');
    const originalText = btn.innerHTML;
    btn.disabled = true;
    btn.innerHTML = `${getSpinnerHtml('sm')} Đang giữ vé trong kho...`;

    try {
      const res = await ordersApi.holdTicket({
        ticketTierId: this.selectedTier.id,
        quantity: this.selectedQuantity,
      });

      if (res?.success && res.data) {
        // Decrement local stock for instant visual feedback
        this.selectedTier.availableStock -= this.selectedQuantity;
        this._renderTiers();

        toast.success(`Đã giữ ${this.selectedQuantity} vé thành công! Bạn có 10 phút để thanh toán.`);
        
        // Open Checkout Drawer
        checkoutDrawer.open(res.data);
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Không thể giữ vé. Vé có thể đã hết.';
      toast.error(msg);
      // Refresh event details to get current stock
      this.render(this.eventData.id);
    } finally {
      if (btn) {
        btn.disabled = false;
        btn.innerHTML = originalText;
      }
    }
  }
}

export const eventDetailView = new EventDetailView();

if (typeof window !== 'undefined') {
  window.__eventDetailView = eventDetailView;
}
