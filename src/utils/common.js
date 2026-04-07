import { toCalendar, today, CalendarDate } from '@internationalized/date';
import { getCalendar } from '../core/locale.js';

/**
 * Convert a CalendarDate to a native JS Date (via Gregorian).
 */
export function calendarDateToNative(date) {
  const greg = toCalendar(date, getCalendar('gregory'));
  return new Date(greg.year, greg.month - 1, greg.day);
}

/**
 * Resolve the Intl-compatible calendar identifier.
 * "islamic" needs to be mapped to "islamic-umalqura" for Intl APIs.
 */
export function resolveIntlCalendar(calendarId) {
  return calendarId === 'islamic' ? 'islamic-umalqura' : calendarId;
}

let _cachedTimeZone = null;

/**
 * Get the user's IANA timezone, with UTC fallback. Cached at module level.
 */
export function getTimeZone() {
  if (_cachedTimeZone) return _cachedTimeZone;
  try {
    _cachedTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    _cachedTimeZone = 'UTC';
  }
  return _cachedTimeZone;
}

/**
 * Resolve a relative date expression to a CalendarDate.
 * Expressions: "today", "-Nd"/"+Nd", "monthStart"/"startOfMonth", "monthEnd"/"endOfMonth",
 * "prevMonthStart", "prevMonthEnd", "yearStart"/"startOfYear", "yearEnd"/"endOfYear", or "YYYY-MM-DD".
 */
export function resolveRelativeDate(expr, calendar, min, max) {
  const tz = getTimeZone();
  const now = toCalendar(today(tz), calendar);

  let result;

  if (expr === 'today') {
    result = now;
  } else if (/^[+-]\d+d$/.test(expr)) {
    const days = parseInt(expr);
    result = now.add({ days });
  } else if (expr === 'monthStart' || expr === 'startOfMonth') {
    result = now.set({ day: 1 });
  } else if (expr === 'monthEnd' || expr === 'endOfMonth') {
    result = now.set({ day: 1 }).add({ months: 1 }).add({ days: -1 });
  } else if (expr === 'prevMonthStart') {
    result = now.set({ day: 1 }).add({ months: -1 });
  } else if (expr === 'prevMonthEnd') {
    result = now.set({ day: 1 }).add({ days: -1 });
  } else if (expr === 'yearStart' || expr === 'startOfYear') {
    result = now.set({ month: 1, day: 1 });
  } else if (expr === 'yearEnd' || expr === 'endOfYear') {
    result = now.set({ month: 1, day: 1 }).add({ years: 1 }).add({ days: -1 });
  } else {
    // Try absolute ISO date
    const match = expr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
      try {
        const greg = new CalendarDate(parseInt(match[1]), parseInt(match[2]), parseInt(match[3]));
        result = toCalendar(greg, calendar);
      } catch {
        return null;
      }
    } else {
      return null;
    }
  }

  // Clamp to min/max
  if (min && result.compare(min) < 0) result = min;
  if (max && result.compare(max) > 0) result = max;

  return result;
}

/**
 * Escape a string for safe interpolation into an HTML attribute value.
 * Quotes, ampersands, and angle brackets only — sufficient for double-quoted
 * attribute contexts which is the only place callers use this.
 */
export function escAttr(str) {
  return (str || '').replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
}

/**
 * Parse a JSON-encoded attribute value, returning the parsed result only if
 * it satisfies `validate`. Returns null on parse failure or validation
 * failure — never throws.
 */
export function parseJSONAttr(raw, validate) {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    return validate(parsed) ? parsed : null;
  } catch {
    return null;
  }
}
