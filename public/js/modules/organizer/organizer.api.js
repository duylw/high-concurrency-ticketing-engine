/**
 * Organizer API Service
 * Wraps backend endpoints for managing events, ticket tiers, sales analytics, and gate check-in
 */
import { httpClient } from '../../core/http-client.js';

export const organizerApi = {
  /**
   * Get all events created by the logged-in organizer with aggregate sales KPIs
   * @returns {Promise<{ success: boolean, message: string, data: Array }>}
   */
  async getMyEvents() {
    return httpClient.get('/events/organizer/my-events');
  },

  /**
   * Create a new event with scheduling and flash-sale window
   * @param {Object} eventData
   * @param {string} eventData.title
   * @param {string} eventData.description
   * @param {string} [eventData.bannerUrl]
   * @param {string} eventData.startTime - ISO string
   * @param {string} eventData.endTime - ISO string
   * @param {string} [eventData.saleStartTime] - ISO string
   * @param {string} [eventData.saleEndTime] - ISO string
   * @param {string} [eventData.status]
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async createEvent(eventData) {
    return httpClient.post('/events', eventData);
  },

  /**
   * Add a ticket tier to an existing event
   * @param {string} eventId
   * @param {Object} tierData
   * @param {string} tierData.name
   * @param {number} tierData.price
   * @param {number} tierData.totalStock
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async addTicketTier(eventId, tierData) {
    return httpClient.post(`/events/${eventId}/tiers`, tierData);
  },

  /**
   * Update event details or lifecycle status
   * @param {string} eventId
   * @param {Object} updateData
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async updateEvent(eventId, updateData) {
    return httpClient.patch(`/events/${eventId}`, updateData);
  },

  /**
   * Delete empty event or soft-cancel event with sales
   * @param {string} eventId
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async deleteEvent(eventId) {
    return httpClient.delete(`/events/${eventId}`);
  },

  /**
   * Validate and check-in an e-ticket at the gate
   * @param {string} orderId
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async checkInTicket(orderId) {
    return httpClient.post(`/orders/${orderId}/check-in`);
  },
};
