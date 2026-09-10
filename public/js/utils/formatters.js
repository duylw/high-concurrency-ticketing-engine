/**
 * Formatting Utilities for Currency, Date, and Time
 */

/**
 * Format number into Vietnamese Dong (e.g. 500.000 ₫)
 * @param {number} amount
 * @returns {string}
 */
export const formatCurrencyVND = (amount) => {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
  }).format(num);
};

/**
 * Format ISO date string into readable Vietnamese format (e.g. 19:30 - 25/12/2026)
 * @param {string|Date} dateInput
 * @returns {string}
 */
export const formatDateTime = (dateInput) => {
  if (!dateInput) return 'N/A';
  const date = new Date(dateInput);
  if (isNaN(date.getTime())) return 'Invalid Date';

  const time = date.toLocaleTimeString('vi-VN', {
    hour: '2-digit',
    minute: '2-digit',
  });

  const dayMonthYear = date.toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  return `${time} - ${dayMonthYear}`;
};

/**
 * Calculate countdown time remaining until target date
 * @param {string|Date} targetDateInput
 * @returns {{ days: number, hours: number, minutes: number, seconds: number, isExpired: boolean }}
 */
export const calculateCountdown = (targetDateInput) => {
  const target = new Date(targetDateInput).getTime();
  const now = Date.now();
  const diff = target - now;

  if (diff <= 0) {
    return { days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true };
  }

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return { days, hours, minutes, seconds, isExpired: false };
};
