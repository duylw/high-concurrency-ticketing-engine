/**
 * Organizer Studio & Sales Analytics View
 * Displays real-time aggregate KPI metrics, my-events management table, and event lifecycle actions
 */
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND } from '../../utils/formatters.js';
import { getSkeletonCardsHtml } from '../ui/loader.js';
import { toast } from '../ui/toast.js';
import { authStore } from '../auth/auth.store.js';
import { authModal } from '../auth/auth.modal.js';
import { organizerApi } from './organizer.api.js';
import { eventCreateModal } from './event-create.modal.js';

class OrganizerStudioView {
  constructor() {
    this.container = null;
    this.events = [];
    this.isLoading = false;
  }

  async render() {
    this.container = $('#app');
    if (!this.container) return;

    // 1. Role Guard: Check if logged in and is ORGANIZER or ADMIN
    if (!authStore.isAuthenticated || !authStore.isOrganizer) {
      this._renderUnauthorized();
      return;
    }

    // 2. Render Loading State
    this.container.innerHTML = `
      <div class="container" style="padding-top: 2rem; padding-bottom: 4rem;">
        <div class="studio-header">
          <div class="studio-title-group">
            <h1>Kênh Quản Trị & Doanh Thu Sự Kiện</h1>
            <p>Đang tải dữ liệu kinh doanh từ hệ thống...</p>
          </div>
        </div>
        ${getSkeletonCardsHtml(3)}
      </div>
    `;

    try {
      this.isLoading = true;
      const res = await organizerApi.getMyEvents();
      this.events = res.data || [];
      this._renderDashboard();
    } catch (err) {
      console.error('[ORGANIZER STUDIO ERROR]', err);
      this._renderError(err.message || 'Không thể kết nối đến máy chủ.');
    } finally {
      this.isLoading = false;
    }
  }

  _renderUnauthorized() {
    this.container.innerHTML = `
      <div class="container" style="padding: 4rem 1rem; max-width: 600px; text-align: center;">
        <div class="glass-card" style="padding: 3rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1.25rem;">[LOCK]</div>
          <h2 style="font-size: 1.5rem; font-weight: 800; margin-bottom: 0.75rem; color: var(--color-text-primary);">
            Khu Vực Dành Riêng Cho Ban Tổ Chức
          </h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 2rem; font-size: 0.9375rem; line-height: 1.6;">
            Bạn cần đăng nhập bằng tài khoản có vai trò <strong>ORGANIZER</strong> hoặc <strong>ADMIN</strong> để truy cập phân hệ quản trị và báo cáo doanh thu.
          </p>
          <div style="display: flex; gap: 1rem; justify-content: center; flex-wrap: wrap;">
            <a href="#events" class="btn btn-ghost">Quay Về Trang Chủ</a>
            <button class="btn btn-primary" id="btn-studio-login">Đăng Nhập Ngay</button>
          </div>
        </div>
      </div>
    `;

    $('#btn-studio-login')?.addEventListener('click', () => {
      authModal.open('login');
    });
  }

  _renderDashboard() {
    // Calculate aggregate metrics
    let totalRevenue = 0;
    let totalTicketsSold = 0;
    let totalStock = 0;

    for (const evt of this.events) {
      totalRevenue += evt.totalRevenue ?? evt.stats?.totalRevenue ?? 0;
      totalTicketsSold += evt.totalTicketsSold ?? evt.stats?.totalTicketsSold ?? 0;
      totalStock += evt.totalStock ?? evt.stats?.totalStock ?? 0;
    }

    const overallSoldRatio = totalStock > 0
      ? Math.round((totalTicketsSold / totalStock) * 100)
      : 0;

    this.container.innerHTML = `
      <div class="container" style="padding-top: 2rem; padding-bottom: 5rem;">
        <!-- Studio Header -->
        <div class="studio-header">
          <div class="studio-title-group">
            <h1>Kênh Quản Trị & Doanh Thu Sự Kiện</h1>
            <p>Báo cáo doanh thu thực tế, tiến độ bán vé và điều phối sự kiện thời gian thực</p>
          </div>
          <div>
            <button class="btn btn-primary" id="btn-create-event-top" style="display: inline-flex; align-items: center; gap: 0.5rem; font-weight: 700;">
              <span>+ Tạo Sự Kiện Mới</span>
            </button>
          </div>
        </div>

        <!-- 3 KPI Cards Grid -->
        <div class="kpi-grid">
          <!-- KPI 1: Total Revenue -->
          <div class="kpi-card kpi-revenue">
            <div class="kpi-card-header">
              <span class="kpi-label">Tổng Doanh Thu Thực Tế</span>
              <div class="kpi-icon-pill" style="color: #10B981;">[VND]</div>
            </div>
            <div class="kpi-value">${formatCurrencyVND(totalRevenue)}</div>
            <div class="kpi-subtext">Thu từ ${totalTicketsSold.toLocaleString()} vé đã thanh toán hoàn tất</div>
          </div>

          <!-- KPI 2: Tickets Sold -->
          <div class="kpi-card kpi-tickets">
            <div class="kpi-card-header">
              <span class="kpi-label">Tổng Vé Đã Bán / Phát Hành</span>
              <div class="kpi-icon-pill" style="color: #818CF8;">[TICKETS]</div>
            </div>
            <div class="kpi-value">${totalTicketsSold.toLocaleString()} / ${totalStock.toLocaleString()}</div>
            <div class="kpi-subtext">${this.events.length} sự kiện đã và đang phát hành</div>
          </div>

          <!-- KPI 3: Sold-Out Percentage -->
          <div class="kpi-card kpi-ratio">
            <div class="kpi-card-header">
              <span class="kpi-label">Tỷ Lệ Bán Vé Toàn Sàn</span>
              <div class="kpi-icon-pill" style="color: #F59E0B;">[RATIO]</div>
            </div>
            <div class="kpi-value">${overallSoldRatio}%</div>
            <div class="mini-progress-wrap" style="width: 100%; margin-top: 0.25rem;">
              <div class="mini-progress-bar" style="height: 8px;">
                <div class="mini-progress-fill ${overallSoldRatio >= 100 ? 'full' : ''}" style="width: ${Math.min(overallSoldRatio, 100)}%;"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- Event Management Table Section -->
        <div class="section-bar">
          <h2>Danh Sách Sự Kiện Của Tôi</h2>
          <span style="font-size: 0.875rem; color: var(--color-text-secondary); background: rgba(255, 255, 255, 0.05); padding: 0.25rem 0.75rem; border-radius: var(--radius-full);">
            ${this.events.length} sự kiện
          </span>
        </div>

        ${this.events.length === 0 ? this._renderEmptyState() : this._renderTable()}
      </div>
    `;

    this._bindDashboardEvents();
  }

  _renderEmptyState() {
    return `
      <div class="studio-table-wrap">
        <div class="studio-empty-state">
          <div class="studio-empty-icon">[NO-EVENTS]</div>
          <h3>Chưa có sự kiện nào được tạo</h3>
          <p>Hãy bắt đầu tạo sự kiện đầu tiên của bạn để thiết lập lịch mở bán Flash-Sale và cấu hình các hạng vé.</p>
          <button class="btn btn-primary" id="btn-create-event-empty">
            + Tạo Sự Kiện Đầu Tiên
          </button>
        </div>
      </div>
    `;
  }

  _renderTable() {
    const rows = this.events.map((evt) => {
      const sold = evt.totalTicketsSold ?? evt.stats?.totalTicketsSold ?? 0;
      const stock = evt.totalStock ?? evt.stats?.totalStock ?? 0;
      const ratio = evt.soldOutPercentage ?? evt.stats?.soldOutPercentage ?? (stock > 0 ? Math.round((sold / stock) * 100) : 0);
      const revenue = evt.totalRevenue ?? evt.stats?.totalRevenue ?? 0;
      const statusClass = (evt.status || 'DRAFT').toLowerCase();
      const statusLabel = evt.status === 'PUBLISHED' ? 'Đang Mở Bán' : (evt.status === 'CLOSED' ? 'Đã Đóng' : evt.status);

      const tiersSummary = (evt.ticketTiers || []).map(t => `${t.name}: ${formatCurrencyVND(t.price)}`).join(', ') || 'Chưa có hạng vé';

      return `
        <tr data-event-id="${evt.id}">
          <td>
            <div class="event-cell-meta">
              <img src="${escapeHtml(evt.bannerUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=120')}" class="event-cell-img" alt="${escapeHtml(evt.title)}">
              <div class="event-cell-info">
                <h4>${escapeHtml(evt.title)}</h4>
                <span>Bắt đầu: ${new Date(evt.startTime).toLocaleDateString('vi-VN')}</span>
              </div>
            </div>
          </td>
          <td>
            <div style="font-size: 0.8125rem; color: var(--color-text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;" title="${escapeHtml(tiersSummary)}">
              ${escapeHtml(tiersSummary)}
            </div>
          </td>
          <td>
            <div class="mini-progress-wrap">
              <div class="mini-progress-bar">
                <div class="mini-progress-fill ${ratio >= 100 ? 'full' : ''}" style="width: ${Math.min(ratio, 100)}%;"></div>
              </div>
              <div class="mini-progress-text">${sold.toLocaleString()} / ${stock.toLocaleString()} vé (${ratio}%)</div>
            </div>
          </td>
          <td>
            <strong style="color: #10B981; font-family: var(--font-heading); font-size: 0.9375rem;">
              ${formatCurrencyVND(revenue)}
            </strong>
          </td>
          <td>
            <span class="status-pill ${statusClass}">
              ${escapeHtml(statusLabel)}
            </span>
          </td>
          <td>
            <div class="table-actions">
              <a href="#event/${evt.id}" class="btn btn-ghost btn-sm" title="Xem trang bán vé">
                Chi Tiết
              </a>
              <a href="#gate-scanner/${evt.id}" class="btn btn-neon btn-sm" title="Soát vé tại cổng" style="font-size: 0.75rem;">
                Trạm Soát Vé
              </a>
              ${evt.status === 'PUBLISHED' ? `
                <button class="btn btn-danger btn-sm btn-close-event" data-id="${evt.id}" title="Đóng bán vé" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                  Đóng
                </button>
              ` : ''}
            </div>
          </td>
        </tr>
      `;
    }).join('');

    return `
      <div class="studio-table-wrap">
        <div class="table-responsive">
          <table class="studio-table">
            <thead>
              <tr>
                <th>Sự Kiện</th>
                <th>Hạng Vé & Giá</th>
                <th>Tiến Độ Bán Vé</th>
                <th>Doanh Thu</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              ${rows}
            </tbody>
          </table>
        </div>
      </div>
    `;
  }

  _bindDashboardEvents() {
    const openModal = () => {
      eventCreateModal.open(() => {
        this.render();
      });
    };

    $('#btn-create-event-top')?.addEventListener('click', openModal);
    $('#btn-create-event-empty')?.addEventListener('click', openModal);

    // Handle close event button
    const closeButtons = document.querySelectorAll('.btn-close-event');
    closeButtons.forEach((btn) => {
      btn.addEventListener('click', async (e) => {
        const id = e.currentTarget.getAttribute('data-id');
        if (!confirm('Bạn có chắc chắn muốn đóng cổng bán vé cho sự kiện này không?')) return;

        try {
          btn.disabled = true;
          await organizerApi.updateEvent(id, { status: 'CLOSED' });
          toast.success('Đã đóng cổng bán vé thành công.');
          this.render();
        } catch (err) {
          toast.error(err.message || 'Không thể đóng cổng bán vé.');
          btn.disabled = false;
        }
      });
    });
  }

  _renderError(message) {
    this.container.innerHTML = `
      <div class="container" style="padding: 4rem 1rem; max-width: 600px; text-align: center;">
        <div class="glass-card" style="padding: 3rem 2rem;">
          <div style="font-size: 3rem; margin-bottom: 1.25rem; color: #EF4444;">[ERROR]</div>
          <h2 style="font-size: 1.375rem; font-weight: 700; margin-bottom: 0.75rem; color: var(--color-text-primary);">
            Lỗi Tải Báo Cáo Doanh Thu
          </h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 2rem; font-size: 0.875rem;">
            ${escapeHtml(message)}
          </p>
          <button class="btn btn-primary" id="btn-studio-retry">Thử Lại</button>
        </div>
      </div>
    `;

    $('#btn-studio-retry')?.addEventListener('click', () => {
      this.render();
    });
  }
}

export const organizerStudioView = new OrganizerStudioView();
