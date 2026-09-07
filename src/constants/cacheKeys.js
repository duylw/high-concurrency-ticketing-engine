/**
 * Standardized Redis Cache Keys & Patterns
 */
export const CacheKeys = {
  EVENT_DETAILS: (id) => `events:${id}:details`,
  EVENT_LIST: (page, limit) => `events:list:${page}:${limit}`,
  ALL_EVENTS_PATTERN: "events:*",
  IDEMPOTENCY: (key) => `idempotency:${key}`,
};
