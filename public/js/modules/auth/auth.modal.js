/**
 * Authentication Modal Controller
 * Renders and handles Login & Register forms with real-time validation and tab switching
 */
import { $ } from '../../utils/dom.util.js';
import { toast } from '../ui/toast.js';
import { modalManager } from '../ui/modal.js';
import { getSpinnerHtml } from '../ui/loader.js';
import { authApi } from './auth.api.js';
import { authStore } from './auth.store.js';

class AuthModal {
  constructor() {
    this.modalEl = null;
    this.activeTab = 'login'; // 'login' | 'register'
  }

  /**
   * Mount modal into DOM and attach events
   */
  init() {
    const modalRoot = $('#modal-root');
    if (!modalRoot) return;

    // Check if already mounted
    if ($('#auth-modal')) return;

    const modalMarkup = `
      <div class="modal-overlay" id="auth-modal" role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <div class="modal-container">
          <div class="modal-header">
            <h3 class="modal-title" id="auth-modal-title">Tài Khoản Eventix</h3>
            <button class="modal-close-btn" id="auth-modal-close" aria-label="Đóng">&times;</button>
          </div>

          <div class="modal-tabs">
            <button type="button" class="modal-tab-btn is-active" id="tab-login-btn">Đăng Nhập</button>
            <button type="button" class="modal-tab-btn" id="tab-register-btn">Đăng Ký</button>
          </div>

          <div class="modal-body">
            <!-- Inline Error Alert -->
            <div id="auth-alert" style="display: none; padding: 0.75rem 1rem; border-radius: var(--radius-md); background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.3); color: #FCA5A5; font-size: 0.875rem; margin-bottom: 1.25rem;"></div>

            <!-- Login Form -->
            <form id="auth-login-form">
              <div class="form-group">
                <label class="form-label" for="login-email">Email hoặc Tên đăng nhập</label>
                <input type="email" id="login-email" class="form-input" placeholder="buyer@ticketing.com" required autocomplete="username">
              </div>

              <div class="form-group">
                <label class="form-label" for="login-password">Mật khẩu</label>
                <input type="password" id="login-password" class="form-input" placeholder="••••••••" required autocomplete="current-password">
              </div>

              <div style="margin-bottom: 1.25rem; display: flex; gap: 0.5rem; flex-wrap: wrap;">
                <span style="font-size: 0.75rem; color: var(--color-text-muted); width: 100%;">Tài khoản thử nghiệm nhanh:</span>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-quick-buyer" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                  Khách Hàng (Buyer)
                </button>
                <button type="button" class="btn btn-ghost btn-sm" id="btn-quick-organizer" style="padding: 0.25rem 0.5rem; font-size: 0.75rem;">
                  Ban Tổ Chức (Organizer)
                </button>
              </div>

              <button type="submit" class="btn btn-primary btn-block" id="btn-submit-login">
                Đăng Nhập
              </button>
            </form>

            <!-- Register Form -->
            <form id="auth-register-form" style="display: none;">
              <div class="form-group">
                <label class="form-label" for="register-name">Họ và Tên</label>
                <input type="text" id="register-name" class="form-input" placeholder="Nguyễn Văn A" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="register-username">Tên người dùng (Username)</label>
                <input type="text" id="register-username" class="form-input" placeholder="nguyenvana" required pattern="^[a-zA-Z0-9_]{3,30}$" title="Từ 3-30 ký tự, chỉ gồm chữ cái, số và dấu gạch dưới">
              </div>

              <div class="form-group">
                <label class="form-label" for="register-email">Email</label>
                <input type="email" id="register-email" class="form-input" placeholder="email@example.com" required>
              </div>

              <div class="form-group">
                <label class="form-label" for="register-password">Mật khẩu (tối thiểu 6 ký tự)</label>
                <input type="password" id="register-password" class="form-input" placeholder="••••••••" required minlength="6">
              </div>

              <button type="submit" class="btn btn-primary btn-block" id="btn-submit-register">
                Tạo Tài Khoản
              </button>
            </form>
          </div>
        </div>
      </div>
    `;

    modalRoot.insertAdjacentHTML('beforeend', modalMarkup);
    this.modalEl = $('#auth-modal');

    this._bindEvents();
  }

  _bindEvents() {
    // Close button
    $('#auth-modal-close')?.addEventListener('click', () => {
      modalManager.close(this.modalEl);
    });

    // Tab buttons
    $('#tab-login-btn')?.addEventListener('click', () => this.switchTab('login'));
    $('#tab-register-btn')?.addEventListener('click', () => this.switchTab('register'));

    // Quick fill buttons
    $('#btn-quick-buyer')?.addEventListener('click', () => {
      const emailEl = $('#login-email');
      const passEl = $('#login-password');
      if (emailEl) emailEl.value = 'buyer@ticketing.com';
      if (passEl) passEl.value = 'Password123!';
    });

    $('#btn-quick-organizer')?.addEventListener('click', () => {
      const emailEl = $('#login-email');
      const passEl = $('#login-password');
      if (emailEl) emailEl.value = 'organizer@ticketing.com';
      if (passEl) passEl.value = 'Password123!';
    });

    // Form submissions
    $('#auth-login-form')?.addEventListener('submit', (e) => this._handleLogin(e));
    $('#auth-register-form')?.addEventListener('submit', (e) => this._handleRegister(e));
  }

  switchTab(tab) {
    this.activeTab = tab;
    this._clearAlert();

    const isLogin = tab === 'login';
    const tabLoginBtn = $('#tab-login-btn');
    const tabRegisterBtn = $('#tab-register-btn');
    const loginForm = $('#auth-login-form');
    const registerForm = $('#auth-register-form');

    if (tabLoginBtn) tabLoginBtn.classList.toggle('is-active', isLogin);
    if (tabRegisterBtn) tabRegisterBtn.classList.toggle('is-active', !isLogin);

    if (loginForm) loginForm.style.display = isLogin ? 'block' : 'none';
    if (registerForm) registerForm.style.display = isLogin ? 'none' : 'block';

    const firstInput = isLogin ? $('#login-email') : $('#register-name');
    if (firstInput) firstInput.focus();
  }

  open(tab = 'login') {
    this.switchTab(tab);
    modalManager.open(this.modalEl);
  }

  _showAlert(message) {
    const alertEl = $('#auth-alert');
    if (alertEl) {
      alertEl.textContent = message;
      alertEl.style.display = 'block';
    }
  }

  _clearAlert() {
    const alertEl = $('#auth-alert');
    if (alertEl) {
      alertEl.textContent = '';
      alertEl.style.display = 'none';
    }
  }

  async _handleLogin(e) {
    e.preventDefault();
    this._clearAlert();

    const email = $('#login-email')?.value.trim();
    const password = $('#login-password')?.value;
    const submitBtn = $('#btn-submit-login');

    if (!email || !password) {
      this._showAlert('Vui lòng nhập đầy đủ email và mật khẩu.');
      return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${getSpinnerHtml('sm')} Đang xác thực...`;

    try {
      const res = await authApi.login({ email, password });
      if (res?.success && res.data) {
        const user = res.data.user;
        const accessToken = res.data.tokens?.accessToken || res.data.accessToken;
        const refreshToken = res.data.tokens?.refreshToken || res.data.refreshToken;
        authStore.setAuth({ user, accessToken, refreshToken });
        toast.success(`Đăng nhập thành công! Chào mừng ${user.name || user.username}.`);
        modalManager.close(this.modalEl);
        $('#auth-login-form')?.reset();
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Đăng nhập thất bại. Vui lòng kiểm tra lại thông tin.';
      this._showAlert(msg);
      toast.error(msg);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }

  async _handleRegister(e) {
    e.preventDefault();
    this._clearAlert();

    const name = $('#register-name')?.value.trim();
    const username = $('#register-username')?.value.trim();
    const email = $('#register-email')?.value.trim();
    const password = $('#register-password')?.value;
    const submitBtn = $('#btn-submit-register');

    if (!email || !username || !password) {
      this._showAlert('Vui lòng điền đầy đủ các trường thông tin bắt buộc.');
      return;
    }

    const originalBtnText = submitBtn.innerHTML;
    submitBtn.disabled = true;
    submitBtn.innerHTML = `${getSpinnerHtml('sm')} Đang tạo tài khoản...`;

    try {
      const res = await authApi.register({ name, username, email, password });
      if (res?.success && res.data) {
        const user = res.data.user;
        const accessToken = res.data.tokens?.accessToken || res.data.accessToken;
        const refreshToken = res.data.tokens?.refreshToken || res.data.refreshToken;
        authStore.setAuth({ user, accessToken, refreshToken });
        toast.success(`Tạo tài khoản thành công! Chào mừng ${user.name || user.username}.`);
        modalManager.close(this.modalEl);
        $('#auth-register-form')?.reset();
      }
    } catch (err) {
      const msg = err.data?.message || err.message || 'Đăng ký thất bại. Vui lòng thử lại.';
      this._showAlert(msg);
      toast.error(msg);
    } finally {
      submitBtn.disabled = false;
      submitBtn.innerHTML = originalBtnText;
    }
  }
}

export const authModal = new AuthModal();

if (typeof window !== 'undefined') {
  window.__authModal = authModal;
}
