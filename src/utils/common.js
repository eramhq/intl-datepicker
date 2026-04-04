import { toCalendar } from '@internationalized/date';
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

/**
 * Get the user's IANA timezone, with UTC fallback.
 */
export function getTimeZone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return 'UTC';
  }
}
