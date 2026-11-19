import { applyNumerals, getWeekdayNames } from '../core/locale.js';
import { calendarDateToNative, resolveIntlCalendar } from './common.js';

const SHORT = { year: 'numeric', month: '2-digit', day: '2-digit' };
const DAY_LABEL = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };

/**
 * Build the Intl formatters a picker instance needs, once per
 * locale/calendar/numerals/first-day combination. The helpers below take the
 * result so render loops never build formatters. `timeOpts` (date + time
 * pickers) adds the time-of-day formatters.
 */
export function createFormatters(locale, calendarId, numerals = null, firstDayOfWeek, timeOpts = null) {
  const loc = applyNumerals(locale, numerals);
  const dtf = (opts, calendar = resolveIntlCalendar(calendarId)) => new Intl.DateTimeFormat(loc, { ...opts, calendar });
  const time = timeOpts && {
    hour: 'numeric',
    minute: '2-digit',
    second: timeOpts.timeMode === 'second' ? '2-digit' : undefined,
    hourCycle: timeOpts.hourCycle === 12 ? 'h12' : 'h23',
  };
  const timeFmt = time && dtf(time);
  return {
    ...(time && {
      time: timeFmt,
      timeLayout: getTimeLayout(timeFmt),
      dateTime: dtf({ ...SHORT, ...time }),
      dateTimeLong: dtf({ ...DAY_LABEL, ...time }),
      pad2: new Intl.NumberFormat(loc, { minimumIntegerDigits: 2, useGrouping: false }),
    }),
    short: dtf(SHORT),
    monthYear: dtf({ year: 'numeric', month: 'long' }),
    month: dtf({ month: 'long' }),
    year: dtf({ year: 'numeric' }),
    dayLabel: dtf(DAY_LABEL),
    gregorian: dtf({ year: 'numeric', month: 'short', day: 'numeric' }, 'gregory'),
    number: new Intl.NumberFormat(loc, { useGrouping: false }),
    plural: new Intl.PluralRules(locale),
    weekdaysNarrow: getWeekdayNames(locale, 'narrow', numerals, firstDayOfWeek),
    weekdaysLong: getWeekdayNames(locale, 'long', numerals, firstDayOfWeek),
  };
}

/**
 * How the locale lays out a time: whether the day period (AM/PM) comes
 * before the hour (ja, ko, zh), the hour–minute separator, and the AM/PM text.
 */
function getTimeLayout(timeFmt) {
  const parts = (hour) => timeFmt.formatToParts(new Date(2000, 0, 1, hour, 30));
  const pm = parts(21);
  const types = pm.map(p => p.type);
  const period = (list) => list.find(p => p.type === 'dayPeriod')?.value || '';
  const at = types.indexOf('dayPeriod');
  return {
    periodFirst: at >= 0 && at < types.indexOf('hour'),
    sep: pm[types.indexOf('hour') + 1]?.value.trim() || ':',
    am: period(parts(9)),
    pm: period(pm),
  };
}

/**
 * Format a CalendarDate as a short display string (e.g., "1403/06/15").
 */
export function formatDateShort(date, fmt) {
  return date ? fmt.short.format(calendarDateToNative(date)) : '';
}

/**
 * Format a CalendarDate plus a `{hour, minute, second}` time with one of the
 * date-time formatters (`fmt.dateTime` by default).
 */
export function formatDateTime(date, time, fmt, formatter = fmt.dateTime) {
  const d = calendarDateToNative(date);
  d.setHours(time.hour, time.minute, time.second);
  return formatter.format(d);
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
