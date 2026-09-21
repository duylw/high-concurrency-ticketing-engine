/**
 * Standardized Redis Cache Keys & Patterns
 */
export const CacheKeys = {
  EVENT_DETAILS: (id: string): string => `events:${id}:details`,
  EVENT_LIST: (page: number | string, limit: number | string): string =>
    `events:list:${page}:${limit}`,
  ALL_EVENTS_PATTERN: "events:*",
  IDEMPOTENCY: (key: string): string => `idempotency:${key}`,
} as const;
