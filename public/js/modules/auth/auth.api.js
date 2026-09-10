/**
 * Authentication API Service
 * Wraps backend endpoints for login, register, token refresh, logout, and profile
 */
import { httpClient } from '../../core/http-client.js';

export const authApi = {
  /**
   * Login user with email and password
   * @param {Object} credentials - { email, password }
   * @returns {Promise<{ success: boolean, message: string, data: { user: Object, accessToken: string, refreshToken: string } }>}
   */
  async login(credentials) {
    return httpClient.post('/auth/login', credentials);
  },

  /**
   * Register a new customer user
   * @param {Object} userData - { email, username, password, name }
   * @returns {Promise<{ success: boolean, message: string, data: { user: Object, tokens: { accessToken: string, refreshToken: string } } }>}
   */
  async register(userData) {
    return httpClient.post('/auth/register', userData);
  },

  /**
   * Explicitly refresh tokens
   * @param {string} refreshToken
   * @returns {Promise<{ success: boolean, message: string, data: { accessToken: string, refreshToken: string } }>}
   */
  async refreshToken(refreshToken) {
    return httpClient.post('/auth/refresh-token', { refreshToken });
  },

  /**
   * Logout current session
   * @param {string} refreshToken
   * @returns {Promise<{ success: boolean, message: string }>}
   */
  async logout(refreshToken) {
    return httpClient.post('/auth/logout', { refreshToken });
  },

  /**
   * Fetch current authenticated user profile
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async getMe() {
    return httpClient.get('/auth/me');
  },
};
