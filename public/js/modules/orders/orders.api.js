/**
 * Orders API Service
 * Wraps backend endpoints for holding tickets, completing checkout, and viewing order history
 */
import { httpClient } from '../../core/http-client.js';

export const ordersApi = {
  /**
   * Hold tickets atomically (Pessimistic Locking + BullMQ 10m Delayed Release)
   * @param {Object} payload
   * @param {string} payload.ticketTierId
   * @param {number} [payload.quantity=1]
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async holdTicket({ ticketTierId, quantity = 1 }) {
    return httpClient.post('/orders/hold', {
      ticketTierId,
      quantity,
    });
  },

  /**
   * Complete checkout for held order with Idempotency Key protection
   * @param {string} orderId
   * @param {Object} payload
   * @param {string} [payload.paymentMethod="CREDIT_CARD"]
   * @param {string} payload.idempotencyKey
   * @returns {Promise<{ success: boolean, message: string, data: Object }>}
   */
  async checkout(orderId, { paymentMethod = 'CREDIT_CARD', idempotencyKey } = {}) {
    const key = idempotencyKey || (typeof crypto !== 'undefined' ? crypto.randomUUID() : `key_${Date.now()}`);

    return httpClient.post(
      `/orders/${orderId}/checkout`,
      { paymentMethod },
      {
        headers: {
          'X-Idempotency-Key': key,
        },
      }
    );
  },

  /**
   * Fetch all orders placed by the current authenticated user
   * @returns {Promise<{ success: boolean, message: string, data: Array }>}
   */
  async getMyOrders() {
    return httpClient.get('/orders/my-orders');
  },
};
