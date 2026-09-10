/**
 * Pub/Sub Event Bus for Decoupled Inter-Module Communication
 */
class EventBus {
  constructor() {
    this.listeners = new Map();
  }

  /**
   * Subscribe to an event
   * @param {string} event - Event name
   * @param {Function} callback - Listener callback
   * @returns {Function} Unsubscribe function
   */
  subscribe(event, callback) {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event).add(callback);

    return () => this.unsubscribe(event, callback);
  }

  /**
   * Publish data to all subscribed listeners
   * @param {string} event - Event name
   * @param {*} data - Payload
   */
  publish(event, data) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).forEach((cb) => {
        try {
          cb(data);
        } catch (err) {
          console.error(`[EVENT BUS ERROR] in listener for ${event}:`, err);
        }
      });
    }
  }

  /**
   * Unsubscribe a specific callback
   * @param {string} event - Event name
   * @param {Function} callback - Listener callback
   */
  unsubscribe(event, callback) {
    if (this.listeners.has(event)) {
      this.listeners.get(event).delete(callback);
    }
  }
}

export const eventBus = new EventBus();
