import { CalendarDate, toCalendar, today, isSameDay } from '@internationalized/date';
import { getCalendar } from './locale.js';
import { getTimeZone } from '../utils/common.js';

/**
 * Create initial state for the datepicker.
 */
export function createState(options = {}) {
  const {
    calendarId = 'gregory',
    locale = 'en-US',
    value = null,
    type = 'date',
    min = null,
    max = null,
    inline = false,
  } = options;

  const calendar = getCalendar(calendarId);
  const todayDate = toCalendar(today(getTimeZone()), calendar);

  let selectedDate = null;
  let rangeStart = null;
  let rangeEnd = null;

  if (value) {
    if (type === 'range' && value.includes('/')) {
      const [startIso, endIso] = value.split('/');
      rangeStart = parseISOToCalendar(startIso, calendar);
      rangeEnd = parseISOToCalendar(endIso, calendar);
    } else {
      selectedDate = parseISOToCalendar(value, calendar);
    }
  }

  const focusDate = selectedDate || rangeStart || todayDate;

  return {
    calendarId,
    calendar,
    locale,
    type,
    selectedDate,
    rangeStart,
    rangeEnd,
    focusedDate: focusDate,
    viewYear: focusDate.year,
    viewMonth: focusDate.month,
    isOpen: inline,
    inline,
    min: min ? parseISOToCalendar(min, calendar) : null,
    max: max ? parseISOToCalendar(max, calendar) : null,
    hoveredDate: null,
  };
}

/**
 * Immutable state update — returns new state object.
 */
export function updateState(state, changes) {
  return { ...state, ...changes };
}

/**
 * Select a date. For range type, handles start/end logic.
 */
export function selectDate(state, date) {
  if (isDateDisabled(state, date)) return state;

  if (state.type === 'range') {
    if (!state.rangeStart || state.rangeEnd) {
      // Start new range
      return updateState(state, {
        rangeStart: date,
        rangeEnd: null,
        focusedDate: date,
        selectedDate: null,
      });
    }
    // Complete range
    const start = date.compare(state.rangeStart) < 0 ? date : state.rangeStart;
    const end = date.compare(state.rangeStart) < 0 ? state.rangeStart : date;
    return updateState(state, {
      rangeStart: start,
      rangeEnd: end,
      focusedDate: date,
    });
  }

  return updateState(state, {
    selectedDate: date,
    focusedDate: date,
  });
}

/**
 * Check if a date is disabled (outside min/max).
 */
export function isDateDisabled(state, date) {
  if (state.min && date.compare(state.min) < 0) return true;
  if (state.max && date.compare(state.max) > 0) return true;
  return false;
}

/**
 * Check if a date is in the selected range (for range type).
 */
export function isInRange(state, date) {
  if (state.type !== 'range') return false;
  const start = state.rangeStart;
  const end = state.rangeEnd || state.hoveredDate;
  if (!start || !end) return false;

  const actualStart = start.compare(end) <= 0 ? start : end;
  const actualEnd = start.compare(end) <= 0 ? end : start;

  return date.compare(actualStart) >= 0 && date.compare(actualEnd) <= 0;
}

/**
 * Check if a date is the range start or end.
 */
export function isRangeEdge(state, date) {
  if (state.type !== 'range') return { isStart: false, isEnd: false };
  const end = state.rangeEnd || state.hoveredDate;
  return {
    isStart: state.rangeStart && isSameDay(date, state.rangeStart),
    isEnd: end && isSameDay(date, end),
  };
}

/**
 * Navigate: move focus date by given delta.
 */
export function moveFocus(state, delta) {
  const newDate = state.focusedDate.add(delta);
  return updateState(state, {
    focusedDate: newDate,
    viewYear: newDate.year,
    viewMonth: newDate.month,
  });
}

/**
 * Navigate to a specific month/year.
 */
export function goToMonth(state, year, month) {
  const newFocus = state.focusedDate.set({ year, month, day: 1 });
  return updateState(state, {
    focusedDate: newFocus,
    viewYear: year,
    viewMonth: month,
  });
}

/**
 * Get ISO string from a CalendarDate (converts to Gregorian first).
 */
export function toISO(date) {
  if (!date) return '';
  const greg = toCalendar(date, getCalendar('gregory'));
  const y = String(greg.year).padStart(4, '0');
  const m = String(greg.month).padStart(2, '0');
  const d = String(greg.day).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/**
 * Parse ISO date string to a CalendarDate in the given calendar.
 */
export function parseISOToCalendar(iso, calendar) {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const year = parseInt(match[1]);
  const month = parseInt(match[2]);
  const day = parseInt(match[3]);
  // Reject obviously invalid values before construction
  if (year < 1 || month < 1 || month > 12 || day < 1 || day > 31) return null;
  try {
    const greg = new CalendarDate(year, month, day);
    // CalendarDate clamps invalid values instead of throwing —
    // detect clamping by comparing input vs result
    if (greg.year !== year || greg.month !== month || greg.day !== day) return null;
    return toCalendar(greg, calendar);
  } catch {
    return null;
  }
}

