import {
  CalendarDate,
  startOfWeek,
  getWeeksInMonth,
  isSameMonth,
  isSameDay,
  toCalendar,
  today,
} from '@internationalized/date';
import { getCalendar } from './locale.js';
import { isDateDisabled, isInRange, isRangeEdge, getHoveredWeekBounds } from './state.js';
import { calendarDateToNative, resolveIntlCalendar, getTimeZone } from '../utils/common.js';

/**
 * Generate a complete month grid for any calendar/locale.
 * Returns an array of weeks, each containing 7 day cells.
 */
export function generateMonthGrid(state) {
  const { calendar, viewYear, viewMonth, locale, selectedDate, selectedDates, focusedDate } = state;

  const firstOfMonth = new CalendarDate(calendar, viewYear, viewMonth, 1);
  const weekStart = startOfWeek(firstOfMonth, locale);
  const weeks = getWeeksInMonth(firstOfMonth, locale);

  const tz = getTimeZone();
  const todayDate = toCalendar(today(tz), calendar);

  // Precompute week hover bounds once per render (avoids 84+ startOfWeek/endOfWeek calls)
  const weekBounds = getHoveredWeekBounds(state);

  const grid = [];
  let current = weekStart;

  for (let w = 0; w < weeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const isCurrentMonth = isSameMonth(current, firstOfMonth);
      const isToday = isSameDay(current, todayDate);
      const isSelected = selectedDate
        ? isSameDay(current, selectedDate)
        : (selectedDates && selectedDates.length > 0)
          ? selectedDates.some(d => isSameDay(current, d))
          : false;
      const isFocused = isSameDay(current, focusedDate);
      const disabled = isDateDisabled(state, current);
      const inRange = isInRange(state, current, weekBounds);
      const { isStart, isEnd } = isRangeEdge(state, current, weekBounds);

      week.push({
        date: current,
        day: current.day,
        isCurrentMonth,
        isToday,
        isSelected,
        isFocused,
        disabled,
        inRange,
        isRangeStart: isStart,
        isRangeEnd: isEnd,
      });

      current = current.add({ days: 1 });
    }
    grid.push(week);
  }

  return grid;
}

/**
 * Get the number of months in the current year of the calendar.
 * Hebrew can have 13 months in leap years.
 */
export function getMonthCount(calendar, year) {
  // CalendarDate constrains out-of-range months rather than throwing.
  // If creating month 13 keeps month=13, the calendar has 13 months that year.
  try {
    const d = new CalendarDate(calendar, year, 13, 1);
    return d.month === 13 ? 13 : 12;
  } catch {
    return 12;
  }
}

/**
 * Get month names for a calendar year in the given locale.
 */
export function getMonthOptions(calendarId, year, locale) {
  const calendar = typeof calendarId === 'string' ? getCalendar(calendarId) : calendarId;
  const count = getMonthCount(calendar, year);
  const formatter = new Intl.DateTimeFormat(locale, {
    month: 'long',
    calendar: resolveIntlCalendar(calendarId),
  });
  const months = [];

  for (let m = 1; m <= count; m++) {
    const date = new CalendarDate(calendar, year, m, 1);
    months.push({
      value: m,
      label: formatter.format(calendarDateToNative(date)),
    });
  }

  return months;
}

