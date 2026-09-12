/**
 * E-Ticket & Digital Gate Pass Modal
 * Displays attendee ticket pass with crisp SVG QR Code for gate check-in
 */
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND, formatDateTime } from '../../utils/formatters.js';
import { generateQrSvg } from '../../utils/qrcode.util.js';
import { modalManager } from '../ui/modal.js';

class EticketModal {
  constructor() {
    this.modalEl = null;
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
              Xuất trình mã QR này tại cổng check-in
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
  }

  open(order) {
    if (!this.modalEl) this.init();

    const container = $('#eticket-content');
    if (!container || !order) return;

    const eventTitle = order.ticketTier?.event?.title || order.eventTitle || 'Sự Kiện';
    const tierName = order.ticketTier?.name || order.tierName || 'Hạng Vé Tiêu Chuẩn';
    const quantity = order.quantity || 1;
    const totalAmount = order.totalAmount || 0;
    const orderId = order.id;
    const status = order.status || 'COMPLETED';

    // Build QR Code Payload
    const qrPayload = order.qrPayload || JSON.stringify({
      orderId,
      eventId: order.ticketTier?.event?.id,
      eventTitle,
      tierName,
      quantity,
      status,
    });

    const qrSvg = generateQrSvg(qrPayload, 190);

    container.innerHTML = `
      <div class="eticket-card">
        <div class="eticket-header">
          <span class="badge badge-success" style="margin-bottom: 0.5rem;">
            ${status === 'CHECKED_IN' ? 'ĐÃ CHECK-IN' : 'ĐÃ THANH TOÁN (HỢP LỆ)'}
          </span>
          <h3 style="color: #FFFFFF; font-size: 1.15rem; margin-bottom: 0.25rem;">
            ${escapeHtml(eventTitle)}
          </h3>
          <p style="color: #CBD5E1; font-size: 0.85rem; margin: 0;">
            Hạng vé: <strong>${escapeHtml(tierName)}</strong> &bull; Số lượng: <strong>${quantity} vé</strong>
          </p>
        </div>

        <div class="eticket-body">
          <div class="eticket-qr-wrap">
            ${qrSvg}
          </div>

          <div style="background: rgba(255, 255, 255, 0.03); border: 1px solid var(--color-border-subtle); border-radius: var(--radius-md); padding: 0.75rem 1rem; text-align: left; font-size: 0.8125rem;">
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--color-text-muted);">Mã đơn hàng:</span>
              <span style="font-family: monospace; font-weight: 600; color: var(--color-brand-neon);">
                ${escapeHtml(orderId)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between; margin-bottom: 0.35rem;">
              <span style="color: var(--color-text-muted);">Tổng thanh toán:</span>
              <span style="font-weight: 700; color: var(--color-text-primary);">
                ${formatCurrencyVND(totalAmount)}
              </span>
            </div>
            <div style="display: flex; justify-content: space-between;">
              <span style="color: var(--color-text-muted);">Thời gian mua:</span>
              <span style="color: var(--color-text-secondary);">
                ${formatDateTime(order.createdAt || new Date())}
              </span>
            </div>
          </div>
        </div>
      </div>
    `;

    modalManager.open(this.modalEl);
  }
}

export const eticketModal = new EticketModal();

if (typeof window !== 'undefined') {
  window.__eticketModal = eticketModal;
}
