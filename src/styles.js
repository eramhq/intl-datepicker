import CSS from './styles.css?inline';

let _stylesheet = null;
let _stylesheetTried = false;

/**
 * Get the constructable stylesheet, creating it lazily on first call.
 * Returns null in environments without CSSStyleSheet (Node/SSR) or
 * older Safari that lacks the constructable variant.
 */
export function getStyles() {
  if (_stylesheetTried) return _stylesheet;
  _stylesheetTried = true;
  if (typeof CSSStyleSheet === 'undefined') return null;
  try {
    const sheet = new CSSStyleSheet();
    sheet.replaceSync(CSS);
    _stylesheet = sheet;
  } catch {
    _stylesheet = null;
  }
  return _stylesheet;
}

/**
 * Get the raw CSS text, used as a fallback for browsers without
 * adoptedStyleSheets support (Safari < 16.4).
 */
export function getStylesText() {
  return CSS;
}

export const calendarIcon = `<svg class="idp-calendar-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <rect x="2" y="3" width="16" height="15" rx="2"/>
  <path d="M2 7h16M6 1v4M14 1v4"/>
</svg>`;

export const chevronLeft = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4L6 8L10 12"/></svg>`;

export const chevronRight = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4L10 8L6 12"/></svg>`;

export const chevronDown = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4.5L6 7.5L9 4.5"/></svg>`;

export const clearIcon = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3L11 11M11 3L3 11"/></svg>`;
