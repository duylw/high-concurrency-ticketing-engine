/**
 * Gate Check-in Scanner View (Task 11B)
 * High-Speed Ticket Verification, Anti-Passback Defense & Audio-Visual Alarms
 */
import { httpClient } from '../../core/http-client.js';
import { authStore } from '../auth/auth.store.js';
import { eventsApi } from '../events/events.api.js';
import { toast } from '../ui/toast.js';
import { escapeHtml } from '../../utils/dom.util.js';

class SoundFx {
  constructor() {
    this.ctx = null;
  }

  _initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        this.ctx = new AudioCtx();
      }
    }
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  playSuccess() {
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'sine';
      // Pleasant high two-tone chime (880Hz A5 -> 1174Hz D6)
      osc.frequency.setValueAtTime(880, now);
      osc.frequency.setValueAtTime(1174.66, now + 0.1);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.35);
    } catch (e) {
      console.warn('[AUDIO] SoundFx playback error:', e);
    }
  }

  playAntiPassback() {
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      // Dual burst siren buzzer
      [0, 0.22].forEach((offset) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(240, now + offset);
        osc.frequency.linearRampToValueAtTime(120, now + offset + 0.18);

        gain.gain.setValueAtTime(0.35, now + offset);
        gain.gain.exponentialRampToValueAtTime(0.01, now + offset + 0.18);

        osc.connect(gain);
        gain.connect(this.ctx.destination);

        osc.start(now + offset);
        osc.stop(now + offset + 0.18);
      });
    } catch (e) {
      console.warn('[AUDIO] SoundFx playback error:', e);
    }
  }

  playWarning() {
    try {
      this._initContext();
      if (!this.ctx) return;

      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(350, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.01, now + 0.2);

      osc.connect(gain);
      gain.connect(this.ctx.destination);

      osc.start(now);
      osc.stop(now + 0.2);
    } catch (e) {
      console.warn('[AUDIO] SoundFx playback error:', e);
    }
  }
}

export class GateScannerView {
  constructor() {
    this.soundFx = new SoundFx();
    this.currentEventId = null;
    this.currentEvent = null;
    this.stats = {
      checkedIn: 0,
      totalTickets: 0,
    };
    this.history = [];
    this.mediaStream = null;
    this.isCameraActive = false;
    this.scanInterval = null;
  }

  async render(eventId = null) {
    const appEl = document.getElementById('app');
    if (!appEl) return;

    this.currentEventId = eventId;
    this.stopCamera();

    // 1. Role Guard: Organizer or Admin only
    if (!authStore.isAuthenticated) {
      appEl.innerHTML = this._renderGuestGuard();
      return;
    }

    if (!authStore.isOrganizer && authStore.user?.role !== 'ADMIN') {
      appEl.innerHTML = this._renderUnauthorizedGuard();
      return;
    }

    // 2. Load Event Context if eventId provided
    if (eventId) {
      try {
        const res = await eventsApi.getEventById(eventId);
        this.currentEvent = res.data?.event || res.data || null;
      } catch (err) {
        console.warn('[SCANNER] Could not fetch event details:', err);
      }
    }

    // 3. Render Main Scanner View
    appEl.innerHTML = this._renderScannerHtml();
    this._bindEvents();
  }

  _renderGuestGuard() {
    return `
      <section class="scanner-view-wrap">
        <div class="container text-center" style="max-width: 600px; padding: 4rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem;">🔒</div>
          <h2 style="font-weight: 800; margin-bottom: 1rem;">Yêu Cầu Đăng Nhập Ban Tổ Chức</h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
            Trạm Soát Vé yêu cầu tài khoản Ban Tổ Chức (ORGANIZER) hoặc Quản Trị Viên (ADMIN) để thực hiện xác thực và đóng dấu check-in vé.
          </p>
          <a href="#events" class="btn btn-primary" id="btn-login-scanner-guard">
            Đăng Nhập Ngay
          </a>
        </div>
      </section>
    `;
  }

  _renderUnauthorizedGuard() {
    return `
      <section class="scanner-view-wrap">
        <div class="container text-center" style="max-width: 600px; padding: 4rem 1rem;">
          <div style="font-size: 3rem; margin-bottom: 1rem; color: #EF4444;">⛔</div>
          <h2 style="font-weight: 800; margin-bottom: 1rem; color: #EF4444;">Truy Cập Bị Từ Chối (HTTP 403)</h2>
          <p style="color: var(--color-text-secondary); margin-bottom: 2rem;">
            Tài khoản hiện tại (${escapeHtml(authStore.user?.email || 'N/A')}) không có quyền soát vé tại cổng. Vui lòng đăng nhập bằng tài khoản Ban Tổ Chức hoặc Quản Trị Viên.
          </p>
          <a href="#events" class="btn btn-ghost">
            Quay Về Trang Chủ
          </a>
        </div>
      </section>
    `;
  }

  _renderScannerHtml() {
    const eventTitle = this.currentEvent?.title || 'Tất Cả Sự Kiện Hợp Lệ';

    return `
      <section class="scanner-view-wrap">
        <div class="container">
          
          <!-- Scanner Top Bar -->
          <div class="scanner-header">
            <div class="scanner-title-group">
              <h1>
                <span>Cổng Soát Vé Trực Tiếp</span>
                <span class="badge badge-brand" style="font-size: 0.75rem;">Gate Scanner</span>
              </h1>
              <p>Sự kiện: <strong style="color: var(--color-text);">${escapeHtml(eventTitle)}</strong></p>
            </div>

            <div class="scanner-stats-bar">
              <div class="scanner-stat-badge">
                <div>
                  <div class="stat-label">Đã Check-in</div>
                  <div class="stat-val" id="stat-checked-in-count">${this.stats.checkedIn}</div>
                </div>
              </div>
              <a href="#organizer-studio" class="btn btn-ghost btn-sm" style="text-decoration: none;">
                ← Kênh Quản Trị
              </a>
            </div>
          </div>

          <!-- Main 2-Column Split Grid -->
          <div class="scanner-grid">
            
            <!-- Left Column: Camera Viewport & Manual Input -->
            <div class="scanner-card">
              <div class="scanner-viewport-box" id="scanner-viewport-root">
                <video class="scanner-video" id="scanner-camera-feed" playsinline autoplay muted></video>
                <div class="scanner-overlay-laser" id="scanner-laser-line"></div>
                
                <div class="scanner-reticle">
                  <div class="scanner-reticle-corners"></div>
                  <div id="camera-idle-placeholder" style="text-align: center; color: var(--color-text-muted); font-size: 0.8125rem; padding: 1rem;">
                    <div style="font-size: 2rem; margin-bottom: 0.5rem;">📷</div>
                    <div>Camera đang tắt</div>
                    <div style="font-size: 0.75rem; opacity: 0.7;">Bấm "Bật Camera" hoặc nhập mã vé bên dưới</div>
                  </div>
                </div>
              </div>

              <!-- Manual / Barcode Input Form -->
              <form id="scanner-input-form" onsubmit="return false;">
                <div class="scanner-input-group">
                  <input 
                    type="text" 
                    id="scanner-ticket-input" 
                    placeholder="Quét mã QR hoặc dán mã Order ID (UUID)..." 
                    autocomplete="off" 
                    spellcheck="false"
                  />
                  <button type="submit" class="btn btn-primary" id="btn-submit-checkin" style="font-weight: 700;">
                    Soát Vé
                  </button>
                </div>
              </form>

              <div class="scanner-controls">
                <button type="button" class="btn btn-ghost btn-sm" id="btn-toggle-camera">
                  Bật Camera Quét QR
                </button>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-paste-clipboard">
                  Dán Từ Clipboard
                </button>
              </div>
            </div>

            <!-- Right Column: Visual Alarm State & Inspection Card -->
            <div class="scanner-result-panel">
              
              <!-- Real-time Visual Alarm Card -->
              <div class="scanner-alarm-card status-idle" id="scanner-alarm-card">
                <span class="alarm-badge" id="alarm-badge">SẴN SÀNG</span>
                <div class="alarm-title" id="alarm-title">Chờ Quét Vé</div>
                <div class="alarm-message" id="alarm-message">
                  Đưa mã QR của khách vào khung camera hoặc nhập mã vé để tiến hành soát vé tại cổng.
                </div>

                <!-- Ticket Inspection Details (Hidden on Idle) -->
                <div class="ticket-details-box" id="ticket-details-box" style="display: none;">
                  <div class="ticket-detail-row">
                    <span class="label">Mã Đơn / Vé:</span>
                    <span class="val" id="detail-order-id">-</span>
                  </div>
                  <div class="ticket-detail-row">
                    <span class="label">Khách Hàng:</span>
                    <span class="val" id="detail-customer-name" style="font-family: inherit;">-</span>
                  </div>
                  <div class="ticket-detail-row">
                    <span class="label">Sự Kiện:</span>
                    <span class="val" id="detail-event-title" style="font-family: inherit;">-</span>
                  </div>
                  <div class="ticket-detail-row">
                    <span class="label">Hạng Vé:</span>
                    <span class="val" id="detail-ticket-tier" style="color: #6366F1; font-family: inherit;">-</span>
                  </div>
                  <div class="ticket-detail-row">
                    <span class="label">Số Lượng:</span>
                    <span class="val" id="detail-quantity">-</span>
                  </div>
                  <div class="ticket-detail-row">
                    <span class="label">Thời Điểm Quét:</span>
                    <span class="val" id="detail-scanned-time" style="color: #10B981;">-</span>
                  </div>
                </div>
              </div>

              <!-- Recent Scans Live Session Feed -->
              <div class="scan-feed-card">
                <h3>
                  <span>Lịch Sử Quét Trong Phiên</span>
                  <span style="font-size: 0.75rem; color: var(--color-text-muted);" id="feed-count-badge">0 lượt</span>
                </h3>
                <ul class="scan-feed-list" id="scan-feed-list">
                  <li style="color: var(--color-text-muted); font-size: 0.8125rem; text-align: center; padding: 1rem;">
                    Chưa có lượt quét nào trong phiên làm việc này.
                  </li>
                </ul>
              </div>

            </div>

          </div>

        </div>
      </section>
    `;
  }

  _bindEvents() {
    const form = document.getElementById('scanner-input-form');
    const input = document.getElementById('scanner-ticket-input');
    const btnCamera = document.getElementById('btn-toggle-camera');
    const btnPaste = document.getElementById('btn-paste-clipboard');
    const btnLoginGuard = document.getElementById('btn-login-scanner-guard');

    if (btnLoginGuard) {
      btnLoginGuard.addEventListener('click', () => {
        window.__authModal?.show('login');
      });
    }

    if (form && input) {
      form.addEventListener('submit', (e) => {
        e.preventDefault();
        const val = input.value.trim();
        if (val) {
          this.processInput(val);
        }
      });
    }

    if (btnCamera) {
      btnCamera.addEventListener('click', () => {
        if (this.isCameraActive) {
          this.stopCamera();
          btnCamera.textContent = 'Bật Camera Quét QR';
        } else {
          this.startCamera();
          btnCamera.textContent = 'Tắt Camera';
        }
      });
    }

    if (btnPaste && input) {
      btnPaste.addEventListener('click', async () => {
        try {
          if (navigator.clipboard?.readText) {
            const text = await navigator.clipboard.readText();
            if (text) {
              input.value = text;
              this.processInput(text);
            }
          } else {
            toast.info('Trình duyệt không hỗ trợ đọc clipboard tự động. Vui lòng dán thủ công.');
          }
        } catch (e) {
          toast.info('Hãy dán mã vé (Ctrl+V) vào ô nhập.');
        }
      });
    }

    // Auto-focus input for physical barcode laser guns
    if (input) {
      setTimeout(() => input.focus(), 300);
    }
  }

  /**
   * Process raw input from either camera QR payload or manual text
   */
  processInput(rawInput) {
    if (!rawInput) return;
    let orderId = rawInput.trim();

    // 1. Check if rawInput is JSON string from QR Code payload
    try {
      if (orderId.startsWith('{') && orderId.endsWith('}')) {
        const parsed = JSON.parse(orderId);
        orderId = parsed.orderId || parsed.id || orderId;
      }
    } catch (e) {
      // Keep raw string if JSON parsing fails
    }

    // 2. Validate basic UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(orderId)) {
      this._setVisualState('warning', {
        badge: 'MÃ KHÔNG HỢP LỆ',
        title: 'Định Dạng Mã Vé Sai',
        message: `Mã "${escapeHtml(orderId)}" không đúng định dạng chuẩn UUID của hệ thống vé.`,
      });
      this.soundFx.playWarning();
      return;
    }

    this.checkIn(orderId);
  }

  /**
   * Execute Check-in API call and handle all 3 visual/audio states
   */
  async checkIn(orderId) {
    const input = document.getElementById('scanner-ticket-input');
    const submitBtn = document.getElementById('btn-submit-checkin');

    if (submitBtn) submitBtn.disabled = true;

    try {
      const response = await httpClient.post(`/orders/${orderId}/check-in`);
      const order = response.data?.order || response.data;

      // SUCCESS: Valid Check-in (State 1)
      this.soundFx.playSuccess();
      this.stats.checkedIn += 1;
      this._updateStatsCounter();

      this._setVisualState('valid', {
        badge: 'CHECK-IN THÀNH CÔNG',
        title: 'MỜI VÀO CỬA',
        message: 'Vé hợp lệ và đã được đánh dấu vào cổng thành công.',
        order: {
          id: order.id,
          customerName: order.user?.name || order.user?.email || 'Khách Hàng',
          eventTitle: order.ticketTier?.event?.title || 'Sự Kiện',
          tierName: order.ticketTier?.name || 'Tiêu chuẩn',
          quantity: `${order.quantity || 1} vé`,
          scannedTime: new Date().toLocaleTimeString('vi-VN'),
        },
      });

      this._addHistoryEntry({
        orderId,
        status: 'valid',
        customerName: order.user?.name || order.user?.email || 'Khách Hàng',
        tierName: order.ticketTier?.name || 'Vé',
        time: new Date().toLocaleTimeString('vi-VN'),
      });

      if (input) input.value = '';
    } catch (err) {
      const status = err.status || 500;
      const errMsg = err.message || err.data?.message || 'Có lỗi xảy ra khi soát vé.';

      if (status === 409) {
        // STATE 2: Anti-Passback Fraud Alert (CRITICAL RED)
        this.soundFx.playAntiPassback();
        this._setVisualState('alert', {
          badge: 'CẢNH BÁO: ANTI-PASSBACK',
          title: 'VÉ ĐÃ QUA CỔNG TRƯỚC ĐÓ!',
          message: 'Hệ thống phát hiện mã vé này ĐÃ ĐƯỢC CHECK-IN. Tuyệt đối không cho phép vào cửa trùng lặp.',
          order: {
            id: orderId,
            customerName: 'Không Xác Định',
            eventTitle: 'Vé Trùng Lặp',
            tierName: 'Đã Sử Dụng',
            quantity: '-',
            scannedTime: new Date().toLocaleTimeString('vi-VN') + ' (Bị Chặn)',
          },
        });

        this._addHistoryEntry({
          orderId,
          status: 'conflict',
          customerName: 'Vé quét lại (Anti-Passback)',
          tierName: 'BỊ TỪ CHỐI',
          time: new Date().toLocaleTimeString('vi-VN'),
        });
      } else if (status === 403) {
        // STATE 3A: Cross-Organizer Unauthorized Warning (AMBER)
        this.soundFx.playWarning();
        this._setVisualState('warning', {
          badge: 'KHÔNG CÓ QUYỀN',
          title: 'Vé Thuộc Sự Kiện Khác',
          message: errMsg || 'Bạn không phải là Ban tổ chức quản lý sự kiện của chiếc vé này.',
        });

        this._addHistoryEntry({
          orderId,
          status: 'error',
          customerName: 'Sai Ban Tổ Chức',
          tierName: 'HTTP 403',
          time: new Date().toLocaleTimeString('vi-VN'),
        });
      } else {
        // STATE 3B: Bad Request / Unpaid / Not Found (AMBER)
        this.soundFx.playWarning();
        this._setVisualState('warning', {
          badge: 'VÉ KHÔNG HỢP LỆ',
          title: 'Không Thể Check-in',
          message: errMsg,
        });

        this._addHistoryEntry({
          orderId,
          status: 'error',
          customerName: 'Thất bại',
          tierName: `HTTP ${status}`,
          time: new Date().toLocaleTimeString('vi-VN'),
        });
      }
    } finally {
      if (submitBtn) submitBtn.disabled = false;
      if (input) input.focus();
    }
  }

  _setVisualState(type, data) {
    const card = document.getElementById('scanner-alarm-card');
    const badge = document.getElementById('alarm-badge');
    const title = document.getElementById('alarm-title');
    const message = document.getElementById('alarm-message');
    const detailsBox = document.getElementById('ticket-details-box');

    if (!card || !badge || !title || !message) return;

    card.className = `scanner-alarm-card status-${type}`;
    badge.textContent = data.badge;
    title.textContent = data.title;
    message.textContent = data.message;

    if (data.order && detailsBox) {
      detailsBox.style.display = 'block';
      document.getElementById('detail-order-id').textContent = data.order.id;
      document.getElementById('detail-customer-name').textContent = data.order.customerName;
      document.getElementById('detail-event-title').textContent = data.order.eventTitle;
      document.getElementById('detail-ticket-tier').textContent = data.order.tierName;
      document.getElementById('detail-quantity').textContent = data.order.quantity;
      document.getElementById('detail-scanned-time').textContent = data.order.scannedTime;
    } else if (detailsBox) {
      detailsBox.style.display = 'none';
    }
  }

  _updateStatsCounter() {
    const statEl = document.getElementById('stat-checked-in-count');
    if (statEl) {
      statEl.textContent = this.stats.checkedIn;
    }
  }

  _addHistoryEntry(entry) {
    this.history.unshift(entry);
    if (this.history.length > 20) this.history.pop();

    const listEl = document.getElementById('scan-feed-list');
    const countBadge = document.getElementById('feed-count-badge');

    if (countBadge) {
      countBadge.textContent = `${this.history.length} lượt`;
    }

    if (listEl) {
      listEl.innerHTML = this.history.map((item) => `
        <li class="scan-feed-item is-${item.status}">
          <div class="feed-meta">
            <strong>${escapeHtml(item.customerName)}</strong>
            <span style="font-family: monospace; font-size: 0.75rem; color: var(--color-text-muted);">
              ${escapeHtml(item.orderId.substring(0, 18))}...
            </span>
          </div>
          <div style="text-align: right;">
            <div>${escapeHtml(item.tierName)}</div>
            <div class="feed-time">${escapeHtml(item.time)}</div>
          </div>
        </li>
      `).join('');
    }
  }

  async startCamera() {
    const video = document.getElementById('scanner-camera-feed');
    const laser = document.getElementById('scanner-laser-line');
    const placeholder = document.getElementById('camera-idle-placeholder');

    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      toast.info('Trình duyệt không hỗ trợ Camera API. Vui lòng nhập mã vé thủ công.');
      return;
    }

    try {
      this.mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
      });

      if (video) {
        video.srcObject = this.mediaStream;
        video.classList.add('is-active');
        await video.play();
      }

      if (laser) laser.classList.add('is-active');
      if (placeholder) placeholder.style.display = 'none';
      this.isCameraActive = true;

      // If native BarcodeDetector is available in browser
      if ('BarcodeDetector' in window) {
        const barcodeDetector = new window.BarcodeDetector({ formats: ['qr_code'] });
        this.scanInterval = setInterval(async () => {
          if (!this.isCameraActive || !video || video.readyState < 2) return;
          try {
            const barcodes = await barcodeDetector.detect(video);
            if (barcodes && barcodes.length > 0) {
              const rawValue = barcodes[0].rawValue;
              if (rawValue) {
                this.processInput(rawValue);
              }
            }
          } catch (detErr) {}
        }, 500);
      }
    } catch (err) {
      console.warn('[CAMERA] Cannot access camera:', err);
      toast.info('Không thể truy cập camera. Vui lòng cấp quyền hoặc nhập mã thủ công.');
      this.stopCamera();
    }
  }

  stopCamera() {
    if (this.scanInterval) {
      clearInterval(this.scanInterval);
      this.scanInterval = null;
    }
    if (this.mediaStream) {
      this.mediaStream.getTracks().forEach((track) => track.stop());
      this.mediaStream = null;
    }
    this.isCameraActive = false;

    const video = document.getElementById('scanner-camera-feed');
    const laser = document.getElementById('scanner-laser-line');
    const placeholder = document.getElementById('camera-idle-placeholder');

    if (video) {
      video.classList.remove('is-active');
      video.srcObject = null;
    }
    if (laser) laser.classList.remove('is-active');
    if (placeholder) placeholder.style.display = 'block';
  }
}

export const gateScannerView = new GateScannerView();
