import { CalendarDate, toCalendar, today, isSameDay, startOfWeek, endOfWeek, startOfMonth, startOfYear, endOfMonth, endOfYear } from '@internationalized/date';
import { getCalendar } from './locale.js';
import { resolveLabels } from './labels.js';
import { getTimeZone, calendarDateToNative, resolveIntlCalendar } from '../utils/common.js';

/**
 * Create initial state for the datepicker.
 */
export function createState(options = {}) {
  const {
    calendarId = 'gregory',
    locale = 'en-US',
    numerals = null,
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
    fixedWeeks = false,
    labels = null,
  } = options;

  const calendar = getCalendar(calendarId);
  const todayDate = toCalendar(today(getTimeZone()), calendar);

  let selectedDate = null;
  let rangeStart = null;
  let rangeEnd = null;
  let selectedDates = [];

  if (value) {
    const parsed = parseValueForType(value, type, calendar, locale);
    if (parsed) {
      ({ selectedDate, rangeStart, rangeEnd, selectedDates } = parsed);
      if (type === 'multiple') {
        if (maxDates) selectedDates = selectedDates.slice(0, maxDates);
        if (sortDates) selectedDates.sort((a, b) => a.compare(b));
      }
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
    numerals,
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
    min: parseBound(min, type, calendar),
    max: parseBound(max, type, calendar),
    hoveredDate: null,
    disabledDatesSet,
    disabledDatesFilter: disabledDatesFilter || null,
    disableWeekends,
    _weekendDays: disableWeekends ? getWeekendDays(locale) : [],
    _isRTL: isRTL,
    maxDates: maxDates || null,
    sortDates,
    fixedWeeks,
    labels: labels || resolveLabels(locale, null),
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
  let newDate = state.focusedDate.add(delta);
  // Keep keyboard focus inside min/max so it never lands on an unreachable month.
  if (state.min && newDate.compare(state.min) < 0) newDate = state.min;
  if (state.max && newDate.compare(state.max) > 0) newDate = state.max;
  return updateState(state, {
    focusedDate: newDate,
    viewYear: newDate.year,
    viewMonth: newDate.month,
  });
}

/**
 * Whether the visible months already touch min (prev) or max (next).
 */
export function getNavLimits(state, monthCount = 1) {
  const first = new CalendarDate(state.calendar, state.viewYear, state.viewMonth, 1);
  const last = first.add({ months: monthCount - 1 });
  return {
    prev: !!state.min && first.compare(startOfMonth(state.min)) <= 0,
    next: !!state.max && last.compare(startOfMonth(state.max)) >= 0,
  };
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

/**
 * Convert ISO week (year + week number) to the Gregorian CalendarDate of that week's Monday.
 * Uses the Jan 4 algorithm: Jan 4 is always in ISO week 1.
 * Returns null for invalid week numbers.
 */
export function isoWeekToCalendarDate(isoYear, weekNum, calendar) {
  if (weekNum < 1 || weekNum > 53) return null;
  const jan4 = new Date(Date.UTC(isoYear, 0, 4));
  const jan4DayOfWeek = jan4.getUTCDay() || 7; // Mon=1..Sun=7
  const mondayOfWeek1 = new Date(jan4.getTime() - (jan4DayOfWeek - 1) * 86400000);
  const targetMonday = new Date(mondayOfWeek1.getTime() + (weekNum - 1) * 7 * 86400000);
  try {
    const gregDate = new CalendarDate(
      targetMonday.getUTCFullYear(),
      targetMonday.getUTCMonth() + 1,
      targetMonday.getUTCDate(),
    );
    return calendar ? toCalendar(gregDate, calendar) : gregDate;
  } catch {
    return null;
  }
}

// ISO date with an optional Temporal calendar annotation: "2024-07-22[u-ca=persian]".
const ISO_DATE_RE = /^(\d{4}-\d{2}-\d{2})(?:\[u-ca=[a-z0-9-]+\])?$/;

const pad = (n, len) => String(n).padStart(len, '0');

/**
 * Parse a type-aware value string to a CalendarDate in the given calendar.
 * - week:  YYYY-Www → Monday of that ISO week
 * - month: YYYY-MM (Gregorian only), or any ISO date (optionally `[u-ca=…]`-annotated) →
 *          first day of the month containing it in `calendar`
 * - year:  YYYY (Gregorian only), or any ISO date → first day of the year containing it
 * - other: YYYY-MM-DD
 * ISO strings are always Gregorian; month/year snapping happens in `calendar`.
 */
export function parseTypedValue(value, type, calendar) {
  if (!value) return null;

  if (type === 'week') {
    const match = value.match(/^(\d{4})-W(\d{2})$/);
    if (!match) return null;
    return isoWeekToCalendarDate(parseInt(match[1]), parseInt(match[2]), calendar);
  }

  if (type === 'month' || type === 'year') {
    let greg = null;
    const short = value.match(type === 'month' ? /^(\d{4})-(\d{2})$/ : /^(\d{4})$/);
    if (short) {
      // The short form has no calendar tag, so it is only unambiguous for Gregorian.
      if (calendar && calendar.identifier !== 'gregory') return null;
      const year = parseInt(short[1]);
      const month = type === 'month' ? parseInt(short[2]) : 1;
      if (year < 1 || month < 1 || month > 12) return null;
      greg = new CalendarDate(year, month, 1);
    } else {
      const iso = value.match(ISO_DATE_RE);
      greg = iso && parseISOToCalendar(iso[1], getCalendar('gregory'));
    }
    if (!greg) return null;
    const native = calendar ? toCalendar(greg, calendar) : greg;
    return type === 'month' ? startOfMonth(native) : startOfYear(native);
  }

  // Default: YYYY-MM-DD
  return parseISOToCalendar(value, calendar);
}

/**
 * Parse a min/max bound. Week pickers also accept a plain ISO date.
 */
function parseBound(value, type, calendar) {
  if (!value) return null;
  if (type === 'week') return parseTypedValue(value, 'week', calendar) || parseISOToCalendar(value, calendar);
  return parseTypedValue(value, type, calendar);
}

/**
 * Parse a `value` string for the given picker type into selection fields.
 * Returns null when the string isn't a valid value for that type.
 * Disabled-date filtering is left to the caller.
 */
export function parseValueForType(value, type, calendar, locale) {
  const empty = { selectedDate: null, rangeStart: null, rangeEnd: null, selectedDates: [] };
  if (!value) return empty;

  if (type === 'range') {
    const [startIso, endIso] = value.split('/');
    const start = parseISOToCalendar(startIso, calendar);
    if (!start) return null;
    if (endIso === undefined) return { ...empty, rangeStart: start };
    const end = parseISOToCalendar(endIso, calendar);
    if (!end) return null;
    return start.compare(end) <= 0
      ? { ...empty, rangeStart: start, rangeEnd: end }
      : { ...empty, rangeStart: end, rangeEnd: start };
  }

  if (type === 'multiple') {
    const dates = [];
    for (const part of value.split(',')) {
      const d = parseISOToCalendar(part.trim(), calendar);
      if (d && !dates.some(x => isSameDay(x, d))) dates.push(d);
    }
    return dates.length ? { ...empty, selectedDates: dates } : null;
  }

  if (type === 'week') {
    const date = parseBound(value, 'week', calendar);
    if (!date) return null;
    return { ...empty, rangeStart: startOfWeek(date, locale), rangeEnd: endOfWeek(date, locale) };
  }

  const date = parseTypedValue(value, type, calendar);
  return date ? { ...empty, selectedDate: date } : null;
}

/**
 * ISO 8601 week-year and week number (Monday-based, Gregorian).
 * Late December / early January can shift year (Dec 29 → W01 of next year).
 */
export function getISOWeek(date) {
  const native = calendarDateToNative(date);
  const d = new Date(Date.UTC(native.getFullYear(), native.getMonth(), native.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
}

/**
 * Gregorian start/end (as CalendarDates) of the month or year that `date`
 * falls in, in its own calendar.
 */
export function getPeriodBounds(date, type) {
  return type === 'year'
    ? { start: startOfYear(date), end: endOfYear(date) }
    : { start: startOfMonth(date), end: endOfMonth(date) };
}

/**
 * Serialize the current selection to the `value` string for its picker type.
 * Month/year values follow Temporal.PlainYearMonth: Gregorian stays
 * "YYYY-MM"/"YYYY"; other calendars emit the ISO date of the period's first
 * day plus a calendar annotation, e.g. "2024-07-22[u-ca=persian]".
 */
export function serializeValueForType(state) {
  if (!state) return '';
  const { type, selectedDate } = state;

  if (type === 'range') {
    const s = toISO(state.rangeStart);
    const e = toISO(state.rangeEnd);
    return s && e ? `${s}/${e}` : s;
  }
  if (type === 'multiple') {
    return (state.selectedDates || []).map(toISO).join(',');
  }
  if (type === 'week') {
    if (!state.rangeStart || !state.rangeEnd) return '';
    // Mid-week day: the locale week may start on Sat/Sun, which belong to the
    // previous ISO week. rangeStart + 3 is always inside the ISO week that
    // parses back to this same locale week.
    const { year, week } = getISOWeek(state.rangeStart.add({ days: 3 }));
    return `${year}-W${pad(week, 2)}`;
  }
  if ((type === 'month' || type === 'year') && selectedDate) {
    if (state.calendarId === 'gregory') {
      return type === 'month'
        ? `${pad(selectedDate.year, 4)}-${pad(selectedDate.month, 2)}`
        : pad(selectedDate.year, 4);
    }
    const { start } = getPeriodBounds(selectedDate, type);
    return `${toISO(start)}[u-ca=${resolveIntlCalendar(state.calendarId)}]`;
  }
  return toISO(selectedDate);
}
