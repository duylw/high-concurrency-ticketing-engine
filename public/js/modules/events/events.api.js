/**
 * Events API Service
 * Wraps backend endpoints for discovering and retrieving events and ticket tiers
 */
import { httpClient } from '../../core/http-client.js';

export const eventsApi = {
  /**
   * Get paginated list of published events (with Redis Cache-Aside)
   * @param {Object} params
   * @param {number} [params.page=1]
   * @param {number} [params.limit=10]
   * @param {string} [params.search]
   * @returns {Promise<{ success: boolean, message: string, data: { total: number, events: Array, isFromCache: boolean } }>}
   */
  async getEvents({ page = 1, limit = 12, search = '' } = {}) {
    let endpoint = `/events?page=${page}&limit=${limit}`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    return httpClient.get(endpoint);
  },

  /**
   * Get detailed information for an event including ticket tiers and organizer
   * @param {string} id - Event ID
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async getEventById(id) {
    return httpClient.get(`/events/${id}`);
  },
};
