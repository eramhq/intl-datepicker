import { CalendarDate } from '@internationalized/date';
import { getCalendar, applyNumerals, getWeekdayNames } from '../core/locale.js';
import { calendarDateToNative, resolveIntlCalendar } from './common.js';

/**
 * Build the Intl formatters a picker instance needs, once per
 * locale/calendar/numerals combination. The helpers below accept the result
 * as an optional last argument so render loops don't rebuild formatters.
 */
export function createFormatters(locale, calendarId, numerals = null) {
  const loc = applyNumerals(locale, numerals);
  const calendar = resolveIntlCalendar(calendarId);
  const dtf = (opts) => new Intl.DateTimeFormat(loc, { ...opts, calendar });
  return {
    short: dtf({ year: 'numeric', month: '2-digit', day: '2-digit' }),
    monthYear: dtf({ year: 'numeric', month: 'long' }),
    month: dtf({ month: 'long' }),
    year: dtf({ year: 'numeric' }),
    dayLabel: dtf({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    number: new Intl.NumberFormat(loc, { useGrouping: false }),
    weekdaysNarrow: getWeekdayNames(locale, 'narrow', numerals),
    weekdaysLong: getWeekdayNames(locale, 'long', numerals),
  };
}

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
export function formatDateShort(date, locale, calendarId, numerals = null, fmt = null) {
  if (!date) return '';
  const formatter = fmt?.short || new Intl.DateTimeFormat(applyNumerals(locale, numerals), {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    calendar: resolveIntlCalendar(calendarId),
  });
  return formatter.format(calendarDateToNative(date));
}

/**
 * Format a date range for display.
 */
export function formatRange(start, end, locale, calendarId, numerals = null, fmt = null) {
  if (!start) return '';
  const one = (d) => formatDateShort(d, locale, calendarId, numerals, fmt);
  return end ? `${one(start)} – ${one(end)}` : one(start);
}

/**
 * Format month and year for the calendar header.
 */
export function formatMonthYear(year, month, locale, calendarId, numerals = null, fmt = null) {
  const date = new CalendarDate(getCalendar(calendarId), year, month, 1);
  const formatter = fmt?.monthYear || new Intl.DateTimeFormat(applyNumerals(locale, numerals), {
    year: 'numeric',
    month: 'long',
    calendar: resolveIntlCalendar(calendarId),
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

