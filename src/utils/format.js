import { CalendarDate } from '@internationalized/date';
import { getCalendar, applyNumerals } from '../core/locale.js';
import { calendarDateToNative, resolveIntlCalendar } from './common.js';

/**
 * Format a CalendarDate for display using Intl.DateTimeFormat.
 */
export function formatDate(date, locale, calendarId, options = {}, numerals = null) {
  if (!date) return '';
  const intlCalendar = resolveIntlCalendar(calendarId);
  const formatter = new Intl.DateTimeFormat(applyNumerals(locale, numerals), {
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
export function formatDateShort(date, locale, calendarId, numerals = null) {
  if (!date) return '';
  const intlCalendar = resolveIntlCalendar(calendarId);
  const formatter = new Intl.DateTimeFormat(applyNumerals(locale, numerals), {
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
export function formatRange(start, end, locale, calendarId, numerals = null) {
  if (!start) return '';
  if (!end) return formatDateShort(start, locale, calendarId, numerals);
  return `${formatDateShort(start, locale, calendarId, numerals)} – ${formatDateShort(end, locale, calendarId, numerals)}`;
}

/**
 * Format month and year for the calendar header.
 */
export function formatMonthYear(year, month, locale, calendarId, numerals = null) {
  const calendar = getCalendar(calendarId);
  const date = new CalendarDate(calendar, year, month, 1);
  const intlCalendar = resolveIntlCalendar(calendarId);
  const formatter = new Intl.DateTimeFormat(applyNumerals(locale, numerals), {
    year: 'numeric',
    month: 'long',
    calendar: intlCalendar,
  });
  return formatter.format(calendarDateToNative(date));
}

/**
 * Get the Gregorian equivalent string for a calendar date (for show-alternate).
 */
export function getGregorianEquivalent(date, locale, numerals = null) {
  if (!date) return '';
  const formatter = new Intl.DateTimeFormat(applyNumerals(locale || 'en-US', numerals), {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    calendar: 'gregory',
  });
  return formatter.format(calendarDateToNative(date));
}

