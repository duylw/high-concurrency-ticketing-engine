/**
 * Event & Flash-Sale Creation Modal
 * Handles creating new events with scheduled flash-sale windows and dynamic ticket tier builders
 */
import { $ } from '../../utils/dom.util.js';
import { toast } from '../ui/toast.js';
import { modalManager } from '../ui/modal.js';
import { getSpinnerHtml } from '../ui/loader.js';
import { organizerApi } from './organizer.api.js';
import { eventBus } from '../../core/event-bus.js';

class EventCreateModal {
  constructor() {
    this.modalEl = null;
    this.isSubmitting = false;
    this.tierCounter = 0;
    this.onSuccessCallback = null;
  }

  /**
   * Mount modal into DOM if not already mounted
   */
  init() {
    const modalRoot = $('#modal-root');
    if (!modalRoot || $('#create-event-modal')) return;

    const modalMarkup = `
      <div class="modal-overlay" id="create-event-modal" role="dialog" aria-modal="true" aria-labelledby="create-event-modal-title">
        <div class="modal-container" style="max-width: 680px; max-height: 90vh; overflow-y: auto;">
          <div class="modal-header">
            <h3 class="modal-title" id="create-event-modal-title">Tạo Sự Kiện & Lịch Mở Bán Flash-Sale</h3>
            <button class="modal-close-btn" id="create-event-close-btn" aria-label="Đóng">&times;</button>
          </div>

          <div class="modal-body">
            <form id="create-event-form">
              <!-- Inline Alert -->
              <div id="create-event-alert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #FCA5A5; font-size: 0.875rem; margin-bottom: 1.25rem;"></div>

              <!-- 1. Basic Info -->
              <div class="form-group">
                <label class="form-label" for="event-title">Tên sự kiện <span style="color: #EF4444;">*</span></label>
                <input type="text" id="event-title" class="form-input" placeholder="Ví dụ: Anh Trai Say Hi Live Concert 2026" required minlength="3">
              </div>

              <div class="form-group">
                <label class="form-label" for="event-description">Mô tả sự kiện <span style="color: #EF4444;">*</span></label>
                <textarea id="event-description" class="form-input" rows="3" placeholder="Giới thiệu chi tiết về đêm diễn, nghệ sĩ, quy định tham dự..." required minlength="10" style="resize: vertical;"></textarea>
              </div>

              <div class="form-group">
                <label class="form-label" for="event-banner">Đường dẫn Banner (URL)</label>
                <input type="url" id="event-banner" class="form-input" placeholder="https://images.unsplash.com/..." value="https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=1200&auto=format&fit=crop">
              </div>

              <!-- 2. Event Date & Times -->
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem; margin-bottom: 1.25rem;">
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="event-start-time">Thời gian bắt đầu sự kiện <span style="color: #EF4444;">*</span></label>
                  <input type="datetime-local" id="event-start-time" class="form-input" required>
                </div>
                <div class="form-group" style="margin-bottom: 0;">
                  <label class="form-label" for="event-end-time">Thời gian kết thúc sự kiện <span style="color: #EF4444;">*</span></label>
                  <input type="datetime-local" id="event-end-time" class="form-input" required>
                </div>
              </div>

              <!-- 3. Flash-Sale Window -->
              <div style="padding: 1rem; background: rgba(99, 102, 241, 0.05); border: 1px solid rgba(99, 102, 241, 0.2); border-radius: var(--radius-lg); margin-bottom: 1.5rem;">
                <h4 style="font-size: 0.9375rem; font-weight: 600; color: #A5B4FC; margin-bottom: 0.5rem; display: flex; align-items: center; gap: 0.5rem;">
                  <span>Lịch Hẹn Giờ Mở Bán Vé (Flash-Sale Window)</span>
                </h4>
                <p style="font-size: 0.8125rem; color: var(--color-text-secondary); margin-bottom: 0.75rem;">
                  Nếu để trống, vé sẽ được mở bán ngay lập tức khi tạo sự kiện.
                </p>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;">
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" for="event-sale-start" style="font-size: 0.8125rem;">Giờ mở bán vé</label>
                    <input type="datetime-local" id="event-sale-start" class="form-input" style="font-size: 0.8125rem;">
                  </div>
                  <div class="form-group" style="margin-bottom: 0;">
                    <label class="form-label" for="event-sale-end" style="font-size: 0.8125rem;">Giờ đóng cổng bán vé</label>
                    <input type="datetime-local" id="event-sale-end" class="form-input" style="font-size: 0.8125rem;">
                  </div>
                </div>
              </div>

              <!-- 4. Dynamic Ticket Tiers Builder -->
              <div class="tier-builder-container">
                <div class="tier-builder-header">
                  <h3>Cấu Hình Hạng Vé (Ticket Tiers)</h3>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted);">Tối thiểu 1 hạng vé</span>
                </div>

                <div class="tier-rows-list" id="tier-rows-container">
                  <!-- Dynamic tier rows will be inserted here -->
                </div>

                <button type="button" class="btn-add-tier" id="btn-add-tier-row">
                  + Thêm Hạng Vé Mới
                </button>
              </div>

              <!-- Submit Buttons -->
              <div style="display: flex; gap: 1rem; justify-content: flex-end; margin-top: 2rem;">
                <button type="button" class="btn btn-ghost" id="create-event-cancel-btn">Hủy Bỏ</button>
                <button type="submit" class="btn btn-primary" id="create-event-submit-btn">
                  Tạo Sự Kiện & Xuất Bản
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    `;

    modalRoot.insertAdjacentHTML('beforeend', modalMarkup);
    this.modalEl = $('#create-event-modal');
    this.bindEvents();
  }

  bindEvents() {
    $('#create-event-close-btn')?.addEventListener('click', () => this.close());
    $('#create-event-cancel-btn')?.addEventListener('click', () => this.close());

    $('#btn-add-tier-row')?.addEventListener('click', () => {
      this.addTierRow();
    });

    $('#create-event-form')?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.handleSubmit();
    });
  }

  /**
   * Add dynamic tier row into builder
   */
  addTierRow(defaultName = '', defaultPrice = '', defaultStock = '') {
    const container = $('#tier-rows-container');
    if (!container) return;

    this.tierCounter++;
    const rowId = `tier-row-${this.tierCounter}`;

    const rowMarkup = `
      <div class="tier-row" id="${rowId}">
        <input type="text" class="tier-name-input" placeholder="Tên hạng (VIP, GA...)" value="${defaultName}" required>
        <input type="number" class="tier-price-input" placeholder="Giá (VND)" value="${defaultPrice}" min="1000" step="1000" required>
        <input type="number" class="tier-stock-input" placeholder="Số vé" value="${defaultStock}" min="1" step="1" required>
        <button type="button" class="btn-remove-tier" title="Xóa hạng vé" data-target="${rowId}">&times;</button>
      </div>
    `;

    container.insertAdjacentHTML('beforeend', rowMarkup);

    // Attach delete handler
    $(`#${rowId} .btn-remove-tier`)?.addEventListener('click', (e) => {
      const rows = container.querySelectorAll('.tier-row');
      if (rows.length <= 1) {
        toast.warning('Sự kiện cần tối thiểu 1 hạng vé!');
        return;
      }
      $(`#${rowId}`)?.remove();
    });
  }

  /**
   * Open modal with default initial values
   */
  open(onSuccess = null) {
    this.init();
    this.onSuccessCallback = onSuccess;

    // Reset fields
    const form = $('#create-event-form');
    if (form) form.reset();

    const alert = $('#create-event-alert');
    if (alert) alert.style.display = 'none';

    // Clear and add 2 default tiers
    const container = $('#tier-rows-container');
    if (container) {
      container.innerHTML = '';
      this.addTierRow('Vé VIP Trải Nghiệm', '1200000', '100');
      this.addTierRow('Vé Phổ Thông (Standard GA)', '500000', '300');
    }

    // Set default dates: Event in 7 days, 4 hours duration
    const now = new Date();
    const eventStart = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventEnd = new Date(eventStart.getTime() + 4 * 60 * 60 * 1000);

    const toLocalIso = (d) => {
      const offset = d.getTimezoneOffset() * 60000;
      return new Date(d.getTime() - offset).toISOString().slice(0, 16);
    };

    const startInput = $('#event-start-time');
    const endInput = $('#event-end-time');
    if (startInput) startInput.value = toLocalIso(eventStart);
    if (endInput) endInput.value = toLocalIso(eventEnd);

    modalManager.open(this.modalEl);
  }

  close() {
    if (this.modalEl) {
      modalManager.close(this.modalEl);
    }
  }

  /**
   * Handle form submission: create event then iterate and add tiers
   */
  async handleSubmit() {
    if (this.isSubmitting) return;

    const title = $('#event-title')?.value.trim();
    const description = $('#event-description')?.value.trim();
    const bannerUrl = $('#event-banner')?.value.trim() || undefined;
    const startTimeVal = $('#event-start-time')?.value;
    const endTimeVal = $('#event-end-time')?.value;
    const saleStartTimeVal = $('#event-sale-start')?.value || null;
    const saleEndTimeVal = $('#event-sale-end')?.value || null;

    const alertEl = $('#create-event-alert');
    const submitBtn = $('#create-event-submit-btn');

    const showAlert = (msg) => {
      if (alertEl) {
        alertEl.textContent = msg;
        alertEl.style.display = 'block';
      }
    };

    if (!title || title.length < 3) {
      showAlert('Tên sự kiện phải có ít nhất 3 ký tự!');
      return;
    }

    if (!description || description.length < 10) {
      showAlert('Mô tả sự kiện phải có ít nhất 10 ký tự!');
      return;
    }

    const startDate = new Date(startTimeVal);
    const endDate = new Date(endTimeVal);
    if (endDate <= startDate) {
      showAlert('Thời gian kết thúc sự kiện phải diễn ra sau thời gian bắt đầu!');
      return;
    }

    // Parse tiers
    const tierRows = document.querySelectorAll('#tier-rows-container .tier-row');
    if (tierRows.length === 0) {
      showAlert('Vui lòng thêm ít nhất một hạng vé!');
      return;
    }

    const tiers = [];
    for (const row of tierRows) {
      const name = row.querySelector('.tier-name-input')?.value.trim();
      const price = parseFloat(row.querySelector('.tier-price-input')?.value);
      const totalStock = parseInt(row.querySelector('.tier-stock-input')?.value, 10);

      if (!name || isNaN(price) || price <= 0 || isNaN(totalStock) || totalStock <= 0) {
        showAlert('Vui lòng nhập đầy đủ Tên, Giá hợp lệ và Số lượng vé cho mỗi hạng!');
        return;
      }
      tiers.push({ name, price, totalStock });
    }

    try {
      this.isSubmitting = true;
      if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.innerHTML = `${getSpinnerHtml()} Đang tạo sự kiện...`;
      }
      if (alertEl) alertEl.style.display = 'none';

      // 1. Create Event
      const eventPayload = {
        title,
        description,
        bannerUrl,
        startTime: new Date(startTimeVal).toISOString(),
        endTime: new Date(endTimeVal).toISOString(),
        saleStartTime: saleStartTimeVal ? new Date(saleStartTimeVal).toISOString() : null,
        saleEndTime: saleEndTimeVal ? new Date(saleEndTimeVal).toISOString() : null,
        status: 'PUBLISHED',
      };

      const eventRes = await organizerApi.createEvent(eventPayload);
      const createdEvent = eventRes.data;

      // 2. Create Ticket Tiers
      for (const tier of tiers) {
        await organizerApi.addTicketTier(createdEvent.id, tier);
      }

      toast.success(`Đã tạo thành công sự kiện "${createdEvent.title}" với ${tiers.length} hạng vé!`);
      this.close();

      if (typeof this.onSuccessCallback === 'function') {
        this.onSuccessCallback(createdEvent);
      }

      eventBus.publish('EVENT_CREATED', createdEvent);
    } catch (err) {
      showAlert(err.message || 'Không thể tạo sự kiện. Vui lòng kiểm tra lại thông tin.');
    } finally {
      this.isSubmitting = false;
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = 'Tạo Sự Kiện & Xuất Bản';
      }
    }
  }
}

export const eventCreateModal = new EventCreateModal();
