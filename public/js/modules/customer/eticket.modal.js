/**
 * E-Ticket & Digital Gate Pass Modal
 * Displays attendee ticket pass with crisp SVG QR Code for gate check-in
 * Supports multi-ticket carousel / tabs for itemized tickets (Task 11D)
 */
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND, formatDateTime } from '../../utils/formatters.js';
import { generateQrSvg } from '../../utils/qrcode.util.js';
import { modalManager } from '../ui/modal.js';

class EticketModal {
  constructor() {
    this.modalEl = null;
    this.currentOrder = null;
    this.activeTicketIndex = 0;
  }

  init() {
    const modalRoot = $('#modal-root');
    if (!modalRoot || $('#eticket-modal')) return;

    const markup = `
      <div class="modal-overlay" id="eticket-modal" role="dialog" aria-modal="true" aria-labelledby="eticket-title">
        <div class="modal-container" style="max-width: 480px;">
          <div class="modal-header">
            <h3 class="modal-title" id="eticket-title">Vé Điện Tử (E-Ticket Pass)</h3>
            <button class="modal-close-btn" id="eticket-modal-close" aria-label="Đóng">&times;</button>
          </div>

          <div class="modal-body" id="eticket-content">
            <!-- Dynamic E-Ticket Card rendered here -->
          </div>

          <div class="modal-footer" style="justify-content: space-between;">
            <span style="font-size: 0.8125rem; color: var(--color-text-muted);">
              Xuất trình mã QR tại cổng để nhân viên quét vé
            </span>
            <button class="btn btn-primary btn-sm" id="btn-eticket-done">Hoàn Tất</button>
          </div>
        </div>
      </div>
    `;

    modalRoot.insertAdjacentHTML('beforeend', markup);
    this.modalEl = $('#eticket-modal');

    $('#eticket-modal-close')?.addEventListener('click', () => {
      modalManager.close(this.modalEl);
    });

    $('#btn-eticket-done')?.addEventListener('click', () => {
      modalManager.close(this.modalEl);
    });

    // Keyboard support for carousel: ArrowLeft / ArrowRight
    window.addEventListener('keydown', (e) => {
      if (!this.modalEl || !this.modalEl.classList.contains('is-active')) return;
      if (!this.currentOrder?.tickets || this.currentOrder.tickets.length <= 1) return;

      if (e.key === 'ArrowLeft') {
        this._prevTicket();
      } else if (e.key === 'ArrowRight') {
        this._nextTicket();
      }
    });
  }

  open(order, initialTicketIndex = 0) {
    if (!this.modalEl) this.init();
    if (!order) return;

    this.currentOrder = order;
    const tickets = order.tickets || [];
    this.activeTicketIndex = Math.min(Math.max(0, initialTicketIndex), Math.max(0, tickets.length - 1));

    this._renderTicketView();
    modalManager.open(this.modalEl);
  }

  _renderTicketView() {
    const container = $('#eticket-content');
    if (!container || !this.currentOrder) return;

    const order = this.currentOrder;
    const tickets = order.tickets || [];
    const hasMultiple = tickets.length > 1;

    const eventTitle = order.ticketTier?.event?.title || order.eventTitle || 'Sự Kiện';
    const tierName = order.ticketTier?.name || order.tierName || 'Hạng Vé Tiêu Chuẩn';
    const totalAmount = order.totalAmount || 0;
    const orderId = order.id;

    // Current ticket in focus
    const currentTicket = tickets.length > 0 ? tickets[this.activeTicketIndex] : null;

    let qrPayload = '';
    let ticketCode = '';
    let isCheckedIn = false;
    let checkedInAtStr = '';

    if (currentTicket) {
      qrPayload = currentTicket.qrPayload;
      ticketCode = currentTicket.ticketCode;
      isCheckedIn = currentTicket.status === 'CHECKED_IN';
      if (currentTicket.checkedInAt) {
        checkedInAtStr = formatDateTime(currentTicket.checkedInAt);
      }
    } else {
      // Fallback for legacy orders without itemized tickets
      isCheckedIn = order.status === 'CHECKED_IN';
      ticketCode = order.id;
      qrPayload = order.qrPayload || JSON.stringify({
        orderId,
        eventId: order.ticketTier?.event?.id,
        eventTitle,
        tierName,
        quantity: order.quantity || 1,
        status: order.status,
      });
    }

    const qrSvg = generateQrSvg(qrPayload, 190);

    // Multi-ticket tab navigator markup
    let tabsMarkup = '';
    if (hasMultiple) {
      tabsMarkup = `
        <div class="eticket-carousel-controls">
          <button type="button" class="eticket-carousel-btn" id="btn-ticket-prev" ${this.activeTicketIndex === 0 ? 'disabled' : ''} aria-label="Vé trước">
            &#x276E;
          </button>
          
          <div class="ticket-tabs-nav" id="ticket-tabs-strip">
            ${tickets.map((t, idx) => {
              const activeClass = idx === this.activeTicketIndex ? 'is-active' : '';
              const isTktChecked = t.status === 'CHECKED_IN';
              return `
                <button type="button" class="ticket-tab-btn ${activeClass}" data-ticket-idx="${idx}">
                  <span>Vé ${idx + 1}</span>
                  <span class="ticket-tab-badge ${isTktChecked ? 'checked-in' : 'ready'}">
                    ${isTktChecked ? 'Đã quét' : 'Hợp lệ'}
                  </span>
                </button>
              `;
            }).join('')}
          </div>

          <button type="button" class="eticket-carousel-btn" id="btn-ticket-next" ${this.activeTicketIndex === tickets.length - 1 ? 'disabled' : ''} aria-label="Vé kế tiếp">
            &#x276F;
          </button>
        </div>
      `;
    }

    container.innerHTML = `
      <div class="eticket-card">
        <div class="eticket-header">
          <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 0.5rem; flex-wrap: wrap; gap: 0.5rem;">
            <span class="badge ${isCheckedIn ? 'badge-brand' : 'badge-success'}">
              ${isCheckedIn ? '&#x2705; ĐÃ CHECK-IN TẠI CỔNG' : '&#x2714; SẴN SÀNG VÀO CỔNG (HỢP LỆ)'}
            </span>
            ${hasMultiple ? `
              <span style="font-size: 0.75rem; color: #E2E8F0; background: rgba(255,255,255,0.15); padding: 0.2rem 0.6rem; border-radius: var(--radius-full); font-weight: 700;">
                Vé ${this.activeTicketIndex + 1} / ${tickets.length}
              </span>
            ` : ''}
          </div>

          <h3 style="color: #FFFFFF; font-size: 1.15rem; margin-bottom: 0.25rem;">
            ${escapeHtml(eventTitle)}
          </h3>
          <p style="color: #CBD5E1; font-size: 0.85rem; margin: 0;">
            Hạng vé: <strong>${escapeHtml(tierName)}</strong>
          </p>
        </div>

        <div class="eticket-body">
          ${tabsMarkup}

          <div class="eticket-qr-wrap" id="eticket-qr-display">
            ${qrSvg}
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 0.75rem 1rem; text-align: left; font-size: 0.8125rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--color-text-muted);">Mã vé cá nhân:</span>
              <span class="ticket-item-code" style="color: var(--color-brand-neon);">
                ${escapeHtml(ticketCode)}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--color-text-muted);">Mã đơn hàng:</span>
              <span style="font-family: monospace; font-weight: 600; color: var(--color-text-secondary);">
                ${escapeHtml(orderId)}
              </span>
            </div>

            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--color-text-muted);">Tổng đơn (${order.quantity || 1} vé):</span>
              <span style="font-weight: 700; color: var(--color-text-primary);">
                ${formatCurrencyVND(totalAmount)}
              </span>
            </div>

            ${isCheckedIn && checkedInAtStr ? `
              <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem; color: #A5B4FC;">
                <span>Giờ check-in:</span>
                <span>${checkedInAtStr}</span>
              </div>
            ` : ''}

            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--color-text-muted);">Ngày mua:</span>
              <span style="color: var(--color-text-secondary);">
                ${formatDateTime(order.createdAt || new Date())}
              </span>
            </div>
          </div>

          <div class="eticket-screenshot-tip">
            <span>&#x1F4F8;</span>
            <span>Chụp ảnh màn hình (screenshot) mã QR này để gửi cho bạn bè đi cùng nếu đến so le.</span>
          </div>
        </div>
      </div>
    `;

    this._bindCarouselEvents();
  }

  _bindCarouselEvents() {
    const container = $('#eticket-content');
    if (!container) return;

    // Tabs clicks
    container.querySelectorAll('.ticket-tab-btn').forEach((btn) => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.ticketIdx, 10);
        if (!isNaN(idx) && idx !== this.activeTicketIndex) {
          this.activeTicketIndex = idx;
          this._renderTicketView();
        }
      });
    });

    // Prev / Next button clicks
    container.querySelector('#btn-ticket-prev')?.addEventListener('click', () => {
      this._prevTicket();
    });

    container.querySelector('#btn-ticket-next')?.addEventListener('click', () => {
      this._nextTicket();
    });
  }

  _prevTicket() {
    if (this.activeTicketIndex > 0) {
      this.activeTicketIndex -= 1;
      this._renderTicketView();
    }
  }

  _nextTicket() {
    const total = this.currentOrder?.tickets?.length || 0;
    if (this.activeTicketIndex < total - 1) {
      this.activeTicketIndex += 1;
      this._renderTicketView();
    }
  }
}

export const eticketModal = new EticketModal();

if (typeof window !== 'undefined') {
  window.__eticketModal = eticketModal;
}
