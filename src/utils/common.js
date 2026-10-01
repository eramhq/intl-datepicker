import { toCalendar, today, CalendarDate, startOfMonth, endOfMonth, startOfYear, endOfYear } from '@internationalized/date';
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
 * Today in the browser time zone, in `calendar`.
 */
export function todayIn(calendar) {
  return toCalendar(today(getTimeZone()), calendar);
}

const RELATIVE_DATES = {
  today: d => d,
  monthStart: startOfMonth,
  startOfMonth,
  monthEnd: endOfMonth,
  endOfMonth,
  prevMonthStart: d => startOfMonth(d.subtract({ months: 1 })),
  prevMonthEnd: d => startOfMonth(d).subtract({ days: 1 }),
  yearStart: startOfYear,
  startOfYear,
  yearEnd: endOfYear,
  endOfYear,
};

/**
 * Resolve a relative date expression to a CalendarDate, clamped to min/max.
 * Expressions: "today", "-Nd"/"+Nd", "monthStart"/"startOfMonth", "monthEnd"/"endOfMonth",
 * "prevMonthStart", "prevMonthEnd", "yearStart"/"startOfYear", "yearEnd"/"endOfYear", or "YYYY-MM-DD".
 */
export function resolveRelativeDate(expr, calendar, min, max) {
  const now = todayIn(calendar);
  const offset = expr.match(/^[+-]\d+(?=d$)/);
  const iso = expr.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  let result = Object.hasOwn(RELATIVE_DATES, expr) ? RELATIVE_DATES[expr](now)
    : offset ? now.add({ days: +offset[0] })
    : iso ? toCalendar(new CalendarDate(+iso[1], +iso[2], +iso[3]), calendar)
    : null;
  if (!result) return null;
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
