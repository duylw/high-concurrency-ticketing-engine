/**
 * Global Configuration & System Constants
 */
export const CONFIG = {
  API_BASE_URL: '/api/v1',
  STORAGE_KEYS: {
    ACCESS_TOKEN: 'ticketing_access_token',
    REFRESH_TOKEN: 'ticketing_refresh_token',
    USER_DATA: 'ticketing_user_data',
  },
  EVENTS: {
    AUTH_STATE_CHANGED: 'auth:state_changed',
    VIEW_CHANGED: 'nav:view_changed',
    MODAL_OPEN: 'modal:open',
    MODAL_CLOSE: 'modal:close',
  },
  TOAST_DURATION_MS: 4000,
};
