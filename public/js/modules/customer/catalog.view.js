/**
 * Customer Event Catalog View
 * High-speed event discovery with Redis Cache-Aside, live search filter, and status badges
 */
import { $ } from '../../utils/dom.util.js';
import { escapeHtml } from '../../utils/dom.util.js';
import { formatCurrencyVND, formatDateTime } from '../../utils/formatters.js';
import { getSpinnerHtml } from '../ui/loader.js';
import { eventsApi } from '../events/events.api.js';

class CatalogView {
  constructor() {
    this.container = null;
    this.events = [];
    this.searchQuery = '';
    this.debounceTimer = null;
  }

  async render() {
    this.container = $('#app');
    if (!this.container) return;

    this.container.innerHTML = `
      <!-- Hero Banner Section -->
      <section class="section" style="padding-bottom: 2rem;">
        <div class="container text-center" style="max-width: 860px; margin: 0 auto;">
          <div class="badge badge-brand" style="margin-bottom: 1.5rem;">
            <span>&#x26A1;</span> Kiến Trúc High-Concurrency Flash-Sale Engine
          </div>
          
          <h1 style="margin-bottom: 1.25rem;">
            Săn Vé Tốc Độ Cao <br>
            <span class="text-gradient-brand">Không Bao Giờ Bán Lệch Kho</span>
          </h1>
          
          <p class="text-lead" style="margin-bottom: 2.25rem;">
            Hệ thống bán vé sự kiện phân tán với thời gian phản hồi sub-15ms qua Redis Cache-Aside, bảo vệ chống Double-Payment bằng Distributed Idempotency và thu hồi vé hết hạn tự động qua BullMQ.
          </p>

          <!-- Search Filter Bar -->
          <div class="flex items-center justify-center" style="margin-bottom: 1rem;">
            <div class="search-bar-wrap">
              <span class="search-icon">&#x1F50D;</span>
              <input type="text" id="catalog-search-input" class="search-input" placeholder="Tìm kiếm sự kiện, nghệ sĩ, concert..." value="${escapeHtml(this.searchQuery)}">
            </div>
          </div>
        </div>
      </section>

      <!-- Events Grid Section -->
      <section class="section-sm" id="catalog-events-section">
        <div class="container">
          <div class="flex items-center justify-between" style="margin-bottom: 2rem;">
            <div>
              <h2>Sự Kiện Nổi Bật</h2>
              <p class="text-sm">Trải nghiệm săn vé trực tiếp được bảo vệ bởi PostgreSQL Row Lock & Redis Cache</p>
            </div>
            <div id="cache-indicator-badge">
              <!-- Cache HIT / MISS indicator -->
            </div>
          </div>

          <!-- Dynamic Events Grid -->
          <div id="catalog-grid-container">
            <div class="text-center" style="padding: 3rem 0;">
              ${getSpinnerHtml('lg')}
              <p style="color: var(--color-text-muted); margin-top: 1rem;">Đang tải danh sách sự kiện từ Redis Cache...</p>
            </div>
          </div>
        </div>
      </section>
    `;

    this._bindSearch();
    await this._loadEvents();
  }

  async _loadEvents() {
    try {
      const res = await eventsApi.getEvents({ limit: 12 });
      if (res?.success && res.data) {
        this.events = res.data.events || [];
        
        // Cache indicator
        const cacheEl = $('#cache-indicator-badge');
        if (cacheEl && res.data.isFromCache !== undefined) {
          cacheEl.innerHTML = res.data.isFromCache
            ? '<span class="badge badge-success">&#x26A1; Redis Cache HIT (&lt;3ms)</span>'
            : '<span class="badge badge-brand">&#x1F504; PostgreSQL DB MISS</span>';
        }

        this._renderGrid();
      }
    } catch (err) {
      const grid = $('#catalog-grid-container');
      if (grid) {
        grid.innerHTML = `
          <div class="text-center" style="padding: 3rem 0; color: #EF4444;">
            <p>Không thể kết nối đến máy chủ sự kiện: ${escapeHtml(err.message)}</p>
          </div>
        `;
      }
    }
  }

  _renderGrid() {
    const grid = $('#catalog-grid-container');
    if (!grid) return;

    // Filter events by search query
    const filtered = this.events.filter((ev) => {
      if (!this.searchQuery) return true;
      const q = this.searchQuery.toLowerCase();
      return (ev.title || '').toLowerCase().includes(q) || (ev.description || '').toLowerCase().includes(q);
    });

    if (filtered.length === 0) {
      grid.innerHTML = `
        <div class="glass-card text-center" style="padding: 4rem 2rem;">
          <h3 style="color: var(--color-text-secondary); margin-bottom: 0.5rem;">Không tìm thấy sự kiện nào</h3>
          <p style="color: var(--color-text-muted); font-size: 0.9375rem;">Hãy thử tìm kiếm với từ khóa khác.</p>
        </div>
      `;
      return;
    }

    const now = new Date();

    grid.innerHTML = `
      <div class="grid grid-cols-3" style="gap: 1.75rem;">
        ${filtered.map((event) => {
          const saleStart = event.saleStartTime ? new Date(event.saleStartTime) : null;
          const saleEnd = event.saleEndTime ? new Date(event.saleEndTime) : null;

          const isUpcoming = saleStart && now < saleStart;
          const isClosed = saleEnd && now > saleEnd;
          const isActive = !isUpcoming && !isClosed;

          // Find lowest ticket price
          const prices = (event.ticketTiers || []).map((t) => Number(t.price));
          const lowestPrice = prices.length > 0 ? Math.min(...prices) : 0;

          // Calculate total available stock across all tiers
          const totalAvailable = (event.ticketTiers || []).reduce((acc, t) => acc + (t.availableStock || 0), 0);
          const isSoldOut = totalAvailable <= 0;

          const bannerImg = event.bannerUrl || 'https://images.unsplash.com/photo-1470225620780-dba8ba36b745?w=800&auto=format&fit=crop&q=80';

          return `
            <article class="glass-card event-card" style="display: flex; flex-direction: column; justify-content: space-between;">
              <div>
                <!-- Event Image & Badges -->
                <div style="height: 190px; background-image: url('${escapeHtml(bannerImg)}'); background-size: cover; background-position: center; border-radius: var(--radius-lg); margin-bottom: 1.25rem; position: relative;">
                  <div style="position: absolute; top: 0.75rem; left: 0.75rem; display: flex; gap: 0.4rem; flex-wrap: wrap;">
                    ${isSoldOut ? '<span class="badge badge-sold-out">Hết Vé</span>' : ''}
                    ${!isSoldOut && isActive ? '<span class="badge badge-flash-active">&#x26A1; Đang Mở Bán</span>' : ''}
                    ${!isSoldOut && isUpcoming ? '<span class="badge badge-flash-upcoming">&#x23F3; Sắp Mở Bán</span>' : ''}
                    ${!isSoldOut && isClosed ? '<span class="badge badge-sold-out">Đã Đóng Bán</span>' : ''}
                  </div>
                </div>

                <!-- Event Details -->
                <h3 style="font-size: 1.15rem; margin-bottom: 0.5rem; line-height: 1.35; color: var(--color-text-primary);">
                  ${escapeHtml(event.title)}
                </h3>

                <p style="font-size: 0.8125rem; color: var(--color-text-muted); margin-bottom: 0.75rem;">
                  &#x1F4C5; ${formatDateTime(event.startTime)}
                </p>

                <p style="font-size: 0.875rem; color: var(--color-text-secondary); line-height: 1.5; margin-bottom: 1.25rem; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">
                  ${escapeHtml(event.description || '')}
                </p>
              </div>

              <!-- Price & CTA Button -->
              <div style="border-top: 1px solid var(--color-border-subtle); padding-top: 1rem; display: flex; align-items: center; justify-content: space-between;">
                <div>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted); display: block;">Giá vé từ</span>
                  <strong style="font-size: 1.1rem; color: var(--color-brand-neon);">
                    ${lowestPrice > 0 ? formatCurrencyVND(lowestPrice) : 'Liên hệ'}
                  </strong>
                </div>

                <a href="#event/${event.id}" class="btn ${isActive && !isSoldOut ? 'btn-primary' : 'btn-ghost'} btn-sm" style="text-decoration: none;">
                  ${isActive && !isSoldOut ? 'Săn Vé Ngay' : 'Xem Chi Tiết'}
                </a>
              </div>
            </article>
          `;
        }).join('')}
      </div>
    `;
  }

  _bindSearch() {
    const input = $('#catalog-search-input');
    if (!input) return;

    input.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.trim();
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => {
        this._renderGrid();
      }, 250);
    });
  }
}

export const catalogView = new CatalogView();

if (typeof window !== 'undefined') {
  window.__catalogView = catalogView;
}
