import { CalendarDate, toCalendar } from '@internationalized/date';
import { getCalendar } from '../core/locale.js';

/**
 * Format a CalendarDate for display using Intl.DateTimeFormat.
 */
export function formatDate(date, locale, calendarId, options = {}) {
  if (!date) return '';
  const intlCalendar = resolveIntlCalendar(calendarId);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    calendar: intlCalendar,
    ...options,
  });
  return formatter.format(calendarDateToNative(date));
}

/**
 * Format a CalendarDate as a short display string (e.g., "1403/06/15").
 */
export function formatDateShort(date, locale, calendarId) {
  if (!date) return '';
  const intlCalendar = resolveIntlCalendar(calendarId);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: intlCalendar,
  });
  return formatter.format(calendarDateToNative(date));
}

/**
 * Format a date range for display.
 */
export function formatRange(start, end, locale, calendarId) {
  if (!start) return '';
  if (!end) return formatDateShort(start, locale, calendarId);
  return `${formatDateShort(start, locale, calendarId)} – ${formatDateShort(end, locale, calendarId)}`;
}

/**
 * Format month and year for the calendar header.
 */
export function formatMonthYear(year, month, locale, calendarId) {
  const calendar = getCalendar(calendarId);
  const date = new CalendarDate(calendar, year, month, 1);
  const intlCalendar = resolveIntlCalendar(calendarId);
  const formatter = new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: 'long',
    calendar: intlCalendar,
  });
  return formatter.format(calendarDateToNative(date));
}

/**
 * Get the Gregorian equivalent string for a calendar date (for show-alternate).
 */
export function getGregorianEquivalent(date, locale) {
  if (!date) return '';
  const greg = toCalendar(date, getCalendar('gregory'));
  const formatter = new Intl.DateTimeFormat(locale || 'en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    calendar: 'gregory',
  });
  return formatter.format(new Date(greg.year, greg.month - 1, greg.day));
}

function calendarDateToNative(date) {
  const greg = toCalendar(date, getCalendar('gregory'));
  return new Date(greg.year, greg.month - 1, greg.day);
}

function resolveIntlCalendar(calendarId) {
  return calendarId === 'islamic' ? 'islamic-umalqura' : calendarId;
}
