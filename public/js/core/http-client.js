/**
 * HTTP Client with Fetch Wrapper & Silent Refresh Token Rotation (RTR) Interceptor
 * 
 * Capabilities:
 * 1. Automatic Content-Type and Bearer token attachment.
 * 2. Intercepts 401 Unauthorized errors and triggers silent token refresh.
 * 3. Thread-safe request queueing during active token refresh to eliminate race conditions.
 * 4. Automatic retry of failed requests upon successful token rotation.
 * 5. Automatic session revocation dispatch upon expired or invalid refresh token.
 */
import { CONFIG } from './config.js';

class HttpClient {
  constructor() {
    this.tokenProvider = null;
    this.isRefreshing = false;
    this.failedQueue = [];
  }

  /**
   * Set token provider to bridge AuthStore without circular dependencies
   * @param {Object} provider
   * @param {Function} provider.getAccessToken
   * @param {Function} provider.getRefreshToken
   * @param {Function} provider.onTokensRefreshed
   * @param {Function} provider.onSessionExpired
   */
  setTokenProvider(provider) {
    this.tokenProvider = provider;
  }

  /**
   * Process all queued requests waiting for refreshed token
   * @private
   */
  _processQueue(error, newAccessToken = null) {
    this.failedQueue.forEach(({ resolve, reject, options, endpoint }) => {
      if (error) {
        reject(error);
      } else {
        const retryOptions = {
          ...options,
          _isRetry: true,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          },
        };
        this.request(endpoint, retryOptions).then(resolve).catch(reject);
      }
    });
    this.failedQueue = [];
  }

  /**
   * Core request executor with interceptors
   * @param {string} endpoint
   * @param {Object} options
   * @returns {Promise<any>}
   */
  async request(endpoint, options = {}) {
    let url = endpoint;
    if (!endpoint.startsWith('http://') && !endpoint.startsWith('https://')) {
      if (!endpoint.startsWith('/api')) {
        url = `${CONFIG.API_BASE_URL}${endpoint.startsWith('/') ? '' : '/'}${endpoint}`;
      }
    }

    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    };

    // Auto-inject Bearer Token if not already provided
    if (!headers['Authorization'] && this.tokenProvider) {
      const accessToken = this.tokenProvider.getAccessToken();
      if (accessToken) {
        headers['Authorization'] = `Bearer ${accessToken}`;
      }
    }

    const config = {
      ...options,
      headers,
    };

    // Serialize object body to JSON if needed
    if (config.body && typeof config.body === 'object' && !(config.body instanceof FormData)) {
      config.body = JSON.stringify(config.body);
    }

    let response;
    try {
      response = await fetch(url, config);
    } catch (networkErr) {
      throw new Error(`[NETWORK ERROR] Failed to connect to ${url}: ${networkErr.message}`);
    }

    // Intercept 401 Unauthorized for Silent Refresh Token Rotation
    const isAuthEndpoint = url.includes('/auth/refresh-token') || url.includes('/auth/login') || url.includes('/auth/register');
    if (response.status === 401 && !options._isRetry && !isAuthEndpoint) {
      const refreshToken = this.tokenProvider ? this.tokenProvider.getRefreshToken() : null;

      if (!refreshToken) {
        if (this.tokenProvider?.onSessionExpired) {
          this.tokenProvider.onSessionExpired();
        }
        const errJson = await response.json().catch(() => ({}));
        const error = new Error(errJson.message || 'Unauthorized. Session expired.');
        error.status = 401;
        error.data = errJson;
        throw error;
      }

      // If another refresh is already in-flight, queue this request
      if (this.isRefreshing) {
        return new Promise((resolve, reject) => {
          this.failedQueue.push({ resolve, reject, options, endpoint });
        });
      }

      this.isRefreshing = true;

      try {
        const refreshEndpoint = `${CONFIG.API_BASE_URL}/auth/refresh-token`;
        const refreshRes = await fetch(refreshEndpoint, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken }),
        });

        const refreshJson = await refreshRes.json().catch(() => ({}));

        if (!refreshRes.ok || !refreshJson.success) {
          throw new Error(refreshJson.message || 'Session refresh failed.');
        }

        const newAccessToken = refreshJson.data?.tokens?.accessToken || refreshJson.data?.accessToken;
        const newRefreshToken = refreshJson.data?.tokens?.refreshToken || refreshJson.data?.refreshToken;

        // Notify token provider of the rotated tokens
        if (this.tokenProvider?.onTokensRefreshed) {
          this.tokenProvider.onTokensRefreshed({
            accessToken: newAccessToken,
            refreshToken: newRefreshToken,
          });
        }

        // Flush queued requests
        this._processQueue(null, newAccessToken);

        // Retry the original request
        const retryOptions = {
          ...options,
          _isRetry: true,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${newAccessToken}`,
          },
        };

        return this.request(endpoint, retryOptions);
      } catch (refreshErr) {
        this._processQueue(refreshErr, null);
        if (this.tokenProvider?.onSessionExpired) {
          this.tokenProvider.onSessionExpired();
        }
        const error = new Error(refreshErr.message || 'Session expired. Please log in again.');
        error.status = 401;
        throw error;
      } finally {
        this.isRefreshing = false;
      }
    }

    // Handle non-2xx responses
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error = new Error(errorData.message || `Request failed with HTTP ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    // 204 No Content
    if (response.status === 204) {
      return null;
    }

    return await response.json();
  }

  get(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'GET' });
  }

  post(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'POST', body });
  }

  put(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PUT', body });
  }

  patch(endpoint, body, options = {}) {
    return this.request(endpoint, { ...options, method: 'PATCH', body });
  }

  delete(endpoint, options = {}) {
    return this.request(endpoint, { ...options, method: 'DELETE' });
  }
}

export const httpClient = new HttpClient();
