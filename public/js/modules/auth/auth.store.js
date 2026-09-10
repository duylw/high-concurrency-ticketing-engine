/**
 * Centralized Authentication Store
 * Manages reactive session state, LocalStorage persistence, and token rotation hooks
 */
import { CONFIG } from '../../core/config.js';
import { eventBus } from '../../core/event-bus.js';
import { httpClient } from '../../core/http-client.js';
import { authApi } from './auth.api.js';

class AuthStore {
  constructor() {
    this._user = null;
    this._accessToken = null;
    this._refreshToken = null;
    this._isInitialized = false;

    // Connect HttpClient token provider to this store
    httpClient.setTokenProvider({
      getAccessToken: () => this.accessToken,
      getRefreshToken: () => this.refreshToken,
      onTokensRefreshed: ({ accessToken, refreshToken }) => {
        this.updateTokens({ accessToken, refreshToken });
      },
      onSessionExpired: () => {
        this.clearAuth();
      },
    });
  }

  get isInitialized() {
    return this._isInitialized;
  }

  get isAuthenticated() {
    return Boolean(this._accessToken && this._user);
  }

  get user() {
    return this._user;
  }

  get accessToken() {
    return this._accessToken;
  }

  get refreshToken() {
    return this._refreshToken;
  }

  get role() {
    return this._user?.role || null;
  }

  get isOrganizer() {
    return this.role === 'ORGANIZER' || this.role === 'ADMIN';
  }

  get isAdmin() {
    return this.role === 'ADMIN';
  }

  /**
   * Safe storage access (browser vs node/test environment)
   * @private
   */
  _getStorage() {
    if (typeof window !== 'undefined' && window.localStorage) {
      return window.localStorage;
    }
    return null;
  }

  /**
   * Initialize session from LocalStorage and validate with backend
   */
  async init() {
    const storage = this._getStorage();
    if (storage) {
      this._accessToken = storage.getItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN) || null;
      this._refreshToken = storage.getItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN) || null;
      
      const savedUser = storage.getItem(CONFIG.STORAGE_KEYS.USER_DATA);
      if (savedUser) {
        try {
          this._user = JSON.parse(savedUser);
        } catch {
          this._user = null;
        }
      }
    }

    // If an access token exists, silently verify and refresh profile
    if (this._accessToken) {
      try {
        const res = await authApi.getMe();
        if (res?.success && res.data) {
          this._user = res.data;
          if (storage) {
            storage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(this._user));
          }
        }
      } catch (err) {
        // If profile fetch fails completely even after refresh attempt, clear session
        if (err.status === 401) {
          this.clearAuth();
        }
      }
    }

    this._isInitialized = true;
    this._broadcastState();
  }

  /**
   * Set authenticated user session
   * @param {Object} payload
   * @param {Object} payload.user
   * @param {string} payload.accessToken
   * @param {string} payload.refreshToken
   */
  setAuth({ user, accessToken, refreshToken }) {
    this._user = user;
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;

    const storage = this._getStorage();
    if (storage) {
      if (accessToken) storage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) storage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      if (user) storage.setItem(CONFIG.STORAGE_KEYS.USER_DATA, JSON.stringify(user));
    }

    this._broadcastState();
  }

  /**
   * Update token pair after Silent Refresh Token Rotation
   * @param {Object} tokens
   * @param {string} tokens.accessToken
   * @param {string} tokens.refreshToken
   */
  updateTokens({ accessToken, refreshToken }) {
    this._accessToken = accessToken;
    this._refreshToken = refreshToken;

    const storage = this._getStorage();
    if (storage) {
      if (accessToken) storage.setItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN, accessToken);
      if (refreshToken) storage.setItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
  }

  /**
   * Clear user session on logout or expiration
   */
  clearAuth() {
    this._user = null;
    this._accessToken = null;
    this._refreshToken = null;

    const storage = this._getStorage();
    if (storage) {
      storage.removeItem(CONFIG.STORAGE_KEYS.ACCESS_TOKEN);
      storage.removeItem(CONFIG.STORAGE_KEYS.REFRESH_TOKEN);
      storage.removeItem(CONFIG.STORAGE_KEYS.USER_DATA);
    }

    this._broadcastState();
  }

  /**
   * Publish auth state change to EventBus
   * @private
   */
  _broadcastState() {
    eventBus.publish(CONFIG.EVENTS.AUTH_STATE_CHANGED, {
      isAuthenticated: this.isAuthenticated,
      user: this._user,
      role: this.role,
      isOrganizer: this.isOrganizer,
    });
  }
}

export const authStore = new AuthStore();

if (typeof window !== 'undefined') {
  window.__authStore = authStore;
}
