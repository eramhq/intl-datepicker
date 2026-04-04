import { CalendarDate, toCalendar, today, isSameDay, startOfWeek, endOfWeek } from '@internationalized/date';
import { getCalendar } from './locale.js';
import { getTimeZone, calendarDateToNative } from '../utils/common.js';

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
    disabledDates = null,
    disabledDatesFilter = null,
    disableWeekends = false,
    isRTL = false,
    maxDates = null,
    sortDates = false,
  } = options;

  const calendar = getCalendar(calendarId);
  const todayDate = toCalendar(today(getTimeZone()), calendar);

  let selectedDate = null;
  let rangeStart = null;
  let rangeEnd = null;
  let selectedDates = [];

  if (value) {
    if (type === 'range' && value.includes('/')) {
      const [startIso, endIso] = value.split('/');
      rangeStart = parseISOToCalendar(startIso, calendar);
      rangeEnd = parseISOToCalendar(endIso, calendar);
    } else if (type === 'multiple' && value.includes(',')) {
      selectedDates = value.split(',')
        .map(s => parseISOToCalendar(s.trim(), calendar))
        .filter(d => d !== null);
    } else {
      selectedDate = parseISOToCalendar(value, calendar);
    }
  }

  let disabledDatesSet = null;
  if (disabledDates && Array.isArray(disabledDates) && disabledDates.length > 0) {
    disabledDatesSet = new Set(disabledDates);
  }

  const focusDate = selectedDate || rangeStart || (selectedDates.length > 0 ? selectedDates[0] : null) || todayDate;

  return {
    calendarId,
    calendar,
    locale,
    type,
    selectedDate,
    selectedDates,
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
    disabledDatesSet,
    disabledDatesFilter: disabledDatesFilter || null,
    disableWeekends,
    _weekendDays: disableWeekends ? getWeekendDays(locale) : [],
    _isRTL: isRTL,
    maxDates: maxDates || null,
    sortDates,
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
 * For multiple type, toggles selection.
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

  if (state.type === 'week') {
    const weekStart = startOfWeek(date, state.locale);
    const weekEnd = endOfWeek(date, state.locale);
    return updateState(state, {
      rangeStart: weekStart,
      rangeEnd: weekEnd,
      focusedDate: date,
    });
  }

  if (state.type === 'multiple') {
    const existing = state.selectedDates || [];
    const idx = existing.findIndex(d => isSameDay(d, date));
    let newDates;
    if (idx >= 0) {
      // Toggle off
      newDates = [...existing.slice(0, idx), ...existing.slice(idx + 1)];
    } else {
      // Check maxDates limit
      if (state.maxDates && existing.length >= state.maxDates) {
        return state;
      }
      newDates = [...existing, date];
    }
    if (state.sortDates) {
      newDates.sort((a, b) => a.compare(b));
    }
    return updateState(state, {
      selectedDates: newDates,
      focusedDate: date,
    });
  }

  return updateState(state, {
    selectedDate: date,
    focusedDate: date,
  });
}

/**
 * Check if a date is disabled (outside min/max, in disabled list, or by filter).
 */
export function isDateDisabled(state, date) {
  if (state.min && date.compare(state.min) < 0) return true;
  if (state.max && date.compare(state.max) > 0) return true;

  if (state.disabledDatesSet) {
    const iso = toISO(date);
    if (state.disabledDatesSet.has(iso)) return true;
  }

  const needsDayOfWeek = state.disableWeekends || state.disabledDatesFilter;
  const dayOfWeek = needsDayOfWeek ? getDayOfWeek(date) : -1;

  if (state.disableWeekends) {
    if (state._weekendDays.includes(dayOfWeek)) return true;
  }

  if (state.disabledDatesFilter) {
    try {
      if (state.disabledDatesFilter({ year: date.year, month: date.month, day: date.day, dayOfWeek })) return true;
    } catch { /* Don't crash on filter errors */ }
  }

  return false;
}

/**
 * Get the day of week (0=Sunday, 1=Monday, ..., 6=Saturday) for a CalendarDate.
 */
export function getDayOfWeek(date) {
  return calendarDateToNative(date).getDay();
}

/**
 * Get weekend day numbers for a locale.
 * Uses Intl.Locale.getWeekInfo().weekend when available, falls back to table.
 */
export function getWeekendDays(locale) {
  try {
    const loc = new Intl.Locale(locale);
    let weekend;
    if (typeof loc.getWeekInfo === 'function') {
      weekend = loc.getWeekInfo().weekend;
    } else if (loc.weekInfo) {
      weekend = loc.weekInfo.weekend;
    }
    if (weekend && weekend.length > 0) {
      // Intl weekend uses 1=Mon..7=Sun, convert to JS 0=Sun..6=Sat
      return weekend.map(d => d === 7 ? 0 : d);
    }
  } catch { /* fallback below */ }

  // Fallback: check language for known weekend patterns
  const lang = locale.split('-')[0];
  if (lang === 'fa' || lang === 'ps') {
    return [5, 6]; // Friday + Saturday
  }
  if (locale.startsWith('ar-') || lang === 'ar') {
    return [5, 6]; // Friday + Saturday for most Arab countries
  }
  return [0, 6]; // Saturday + Sunday (default)
}

/**
 * Get week boundaries for hover preview (before any selection is made).
 * Returns { start, end } or null. Callers should cache per render pass.
 */
export function getHoveredWeekBounds(state) {
  if (state.type !== 'week' || !state.hoveredDate || state.rangeStart) return null;
  return {
    start: startOfWeek(state.hoveredDate, state.locale),
    end: endOfWeek(state.hoveredDate, state.locale),
  };
}

/**
 * Check if a date is in the selected range (for range type).
 */
export function isInRange(state, date, weekBounds) {
  if (state.type !== 'range' && state.type !== 'week') return false;

  if (weekBounds) {
    return date.compare(weekBounds.start) >= 0 && date.compare(weekBounds.end) <= 0;
  }

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
export function isRangeEdge(state, date, weekBounds) {
  if (state.type !== 'range' && state.type !== 'week') return { isStart: false, isEnd: false };

  if (weekBounds) {
    return {
      isStart: isSameDay(date, weekBounds.start),
      isEnd: isSameDay(date, weekBounds.end),
    };
  }

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

