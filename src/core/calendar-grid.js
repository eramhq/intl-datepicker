import {
  startOfWeek,
  startOfYear,
  getWeeksInMonth,
  isSameMonth,
  isSameDay,
} from '@internationalized/date';
import {
  isDateDisabled, isInRange, isRangeEdge, getHoveredWeekBounds,
  getRangeLimits, isRangeBlocked, firstOfView, toISO,
} from './state.js';
import { calendarDateToNative } from '../utils/common.js';

/**
 * Generate a complete month grid for any calendar/locale.
 * Returns an array of weeks, each containing 7 day cells.
 */
export function generateMonthGrid(state) {
  const { locale, firstDayOfWeek, selectedDate, selectedDates, focusedDate } = state;

  const firstOfMonth = firstOfView(state);
  const weekStart = startOfWeek(firstOfMonth, locale, firstDayOfWeek);
  const totalWeeks = state.fixedWeeks ? 6 : getWeeksInMonth(firstOfMonth, locale, firstDayOfWeek);

  // Computed once per render rather than per cell.
  const weekBounds = getHoveredWeekBounds(state);
  const limits = getRangeLimits(state, weekStart, weekStart.add({ days: totalWeeks * 7 - 1 }));

  const grid = [];
  let current = weekStart;

  for (let w = 0; w < totalWeeks; w++) {
    const week = [];
    for (let d = 0; d < 7; d++) {
      const isSelected = selectedDate
        ? isSameDay(current, selectedDate)
        : (selectedDates && selectedDates.length > 0)
          ? selectedDates.some(d => isSameDay(current, d))
          : false;
      const { isStart, isEnd } = isRangeEdge(state, current, weekBounds);
      const isRangeBlockedCell = isRangeBlocked(state, current, limits);

      week.push({
        date: current,
        day: current.day,
        isCurrentMonth: isSameMonth(current, firstOfMonth),
        isToday: isSameDay(current, state.today),
        isSelected,
        isFocused: isSameDay(current, focusedDate),
        disabled: isDateDisabled(state, current),
        inRange: isInRange(state, current, weekBounds),
        isRangeStart: isStart,
        isRangeEnd: isEnd,
        isRangeBlocked: isRangeBlockedCell,
        // A disabled day a nights-mode range may still end on.
        isCheckoutOnly: !isRangeBlockedCell && !!limits?.checkout && isSameDay(current, limits.checkout),
      });

      current = current.add({ days: 1 });
    }
    grid.push(week);
  }

  return grid;
}

/**
 * The months of the visible year, as `{value, iso, label, date}` starting at
 * each month's first day. Built by adding months to the year's first day,
 * so the Japanese calendar stays in the right era across an era change.
 */
export function getMonthOptions(state, fmt) {
  const start = startOfYear(firstOfView(state));
  const count = state.calendar.getMonthsInYear(start);
  const months = [];
  for (let m = 0; m < count; m++) {
    const date = start.add({ months: m });
    months.push({ value: date.month, iso: toISO(date), label: fmt.month.format(calendarDateToNative(date)), date });
  }
  return months;
}
