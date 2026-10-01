import { applyNumerals, getWeekdayNames } from '../core/locale.js';
import { calendarDateToNative, resolveIntlCalendar } from './common.js';

/**
 * Build the Intl formatters a picker instance needs, once per
 * locale/calendar/numerals/first-day combination. The helpers below take the
 * result so render loops never build formatters.
 */
export function createFormatters(locale, calendarId, numerals = null, firstDayOfWeek) {
  const loc = applyNumerals(locale, numerals);
  const dtf = (opts, calendar = resolveIntlCalendar(calendarId)) => new Intl.DateTimeFormat(loc, { ...opts, calendar });
  return {
    short: dtf({ year: 'numeric', month: '2-digit', day: '2-digit' }),
    monthYear: dtf({ year: 'numeric', month: 'long' }),
    month: dtf({ month: 'long' }),
    year: dtf({ year: 'numeric' }),
    dayLabel: dtf({ weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' }),
    gregorian: dtf({ year: 'numeric', month: 'short', day: 'numeric' }, 'gregory'),
    number: new Intl.NumberFormat(loc, { useGrouping: false }),
    plural: new Intl.PluralRules(locale),
    weekdaysNarrow: getWeekdayNames(locale, 'narrow', numerals, firstDayOfWeek),
    weekdaysLong: getWeekdayNames(locale, 'long', numerals, firstDayOfWeek),
  };
}

/**
 * Format a CalendarDate as a short display string (e.g., "1403/06/15").
 */
export function formatDateShort(date, fmt) {
  return date ? fmt.short.format(calendarDateToNative(date)) : '';
}

/**
 * Format a date range for display.
 */
export function formatRange(start, end, fmt) {
  if (!start) return '';
  return end ? `${formatDateShort(start, fmt)} – ${formatDateShort(end, fmt)}` : formatDateShort(start, fmt);
}

/**
 * Format the month and year of `date` for the calendar header.
 */
export function formatMonthYear(date, fmt) {
  return fmt.monthYear.format(calendarDateToNative(date));
}

/**
 * Get the Gregorian equivalent string for a calendar date (for show-alternate).
 */
export function getGregorianEquivalent(date, fmt) {
  return date ? fmt.gregorian.format(calendarDateToNative(date)) : '';
}
