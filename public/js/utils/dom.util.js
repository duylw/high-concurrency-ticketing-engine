/**
 * Lightweight DOM Utilities
 */

/**
 * Select a single element
 * @param {string} selector
 * @param {Element|Document} parent
 * @returns {Element|null}
 */
export const $ = (selector, parent = document) => parent.querySelector(selector);

/**
 * Select all matching elements as array
 * @param {string} selector
 * @param {Element|Document} parent
 * @returns {Array<Element>}
 */
export const $$ = (selector, parent = document) => Array.from(parent.querySelectorAll(selector));

/**
 * Escape HTML to prevent XSS attacks
 * @param {string} str
 * @returns {string}
 */
export const escapeHtml = (str) => {
  if (typeof str !== 'string') return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
};

/**
 * Create a DOM element from an HTML template string
 * @param {string} htmlString
 * @returns {Element}
 */
export const createFromHtml = (htmlString) => {
  const template = document.createElement('template');
  template.innerHTML = htmlString.trim();
  return template.content.firstElementChild;
};
