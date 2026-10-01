import { CalendarDate, toCalendar, isSameDay, startOfWeek, endOfWeek, startOfMonth, startOfYear, endOfMonth, endOfYear } from '@internationalized/date';
import { getCalendar, getWeekInfoField, parseDayOfWeek, resolveFirstDayOfWeek } from './locale.js';
import { resolveLabels } from './labels.js';
import { calendarDateToNative, resolveIntlCalendar, todayIn } from '../utils/common.js';
import { createFormatters } from '../utils/format.js';

const nonNegativeInt = (v) => {
  const n = parseInt(v);
  return n >= 0 ? n : null;
};

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
    disabledDaysOfWeek = null,
    disablePast = false,
    disableFuture = false,
    minNights = null,
    maxNights = null,
    excludeDisabled = null,
    isRTL = false,
    maxDates = null,
    sortDates = false,
    fixedWeeks = false,
    labels = null,
  } = options;

  const calendar = getCalendar(calendarId);
  const firstDayOfWeek = resolveFirstDayOfWeek(options.firstDayOfWeek, locale);

  let selectedDate = null;
  let rangeStart = null;
  let rangeEnd = null;
  let selectedDates = [];

  if (value) {
    const parsed = parseValueForType(value, type, calendar, locale, firstDayOfWeek);
    if (parsed) {
      ({ selectedDate, rangeStart, rangeEnd, selectedDates } = parsed);
      if (type === 'multiple') {
        if (maxDates) selectedDates = selectedDates.slice(0, maxDates);
        if (sortDates) selectedDates.sort((a, b) => a.compare(b));
      }
    }
  }

  // Locale weekend + explicit weekdays, as 0 (Sunday) – 6.
  const dows = new Set(disableWeekends ? getWeekendDays(locale) : []);
  for (const day of String(disabledDaysOfWeek ?? '').split(',')) {
    const d = parseDayOfWeek(day);
    if (d >= 0) dows.add(d);
  }

  const state = withToday({
    calendarId,
    calendar,
    locale,
    numerals,
    type,
    firstDayOfWeek,
    selectedDate,
    selectedDates,
    rangeStart,
    rangeEnd,
    isOpen: inline,
    inline,
    // User bounds; `min`/`max` are these narrowed by disable-past/-future.
    _min: parseBound(min, type, calendar, locale, firstDayOfWeek, false),
    _max: parseBound(max, type, calendar, locale, firstDayOfWeek, true),
    disablePast,
    disableFuture,
    hoveredDate: null,
    _disabledRanges: parseDisabledDates(disabledDates),
    disabledDatesFilter: disabledDatesFilter || null,
    _disabledDows: dows.size ? [...dows] : null,
    minNights: nonNegativeInt(minNights) || 0,
    maxNights: nonNegativeInt(maxNights),
    // Bare attribute (or "days") excludes whole days; "nights" lets the end
    // land on a disabled day.
    excludeDisabled: excludeDisabled === 'nights' ? 'nights' : excludeDisabled != null && excludeDisabled !== false ? 'days' : null,
    _isRTL: isRTL,
    maxDates: maxDates || null,
    sortDates,
    fixedWeeks,
    labels: labels || resolveLabels(locale, null),
    _fmt: createFormatters(locale, calendarId, numerals, firstDayOfWeek),
  }, todayIn(calendar));

  const focusDate = selectedDate || rangeStart || selectedDates[0] || state.today;
  return Object.assign(state, { focusedDate: focusDate, ...viewOf(focusDate) });
}

/**
 * Set `today` and the effective `min`/`max`: disable-past/-future narrow the
 * user's bounds to today's period for the picker type.
 */
function withToday(state, now) {
  const { type, locale, firstDayOfWeek, _min, _max } = state;
  const isWeek = type === 'week';
  const start = isWeek ? startOfWeek(now, locale, firstDayOfWeek)
    : type === 'month' ? startOfMonth(now)
    : type === 'year' ? startOfYear(now)
    : now;
  // The current week stays selectable under disable-future.
  const end = isWeek ? endOfWeek(now, locale, firstDayOfWeek) : start;
  const later = state.disablePast && (!_min || start.compare(_min) > 0) ? start : _min;
  const earlier = state.disableFuture && (!_max || end.compare(_max) < 0) ? end : _max;
  return { ...state, today: now, min: later, max: earlier };
}

/**
 * Re-derive `today` and the bounds that depend on it once the date has
 * changed (a calendar left open past midnight). Returns the same state when
 * nothing changed.
 */
export function refreshToday(state) {
  const now = todayIn(state.calendar);
  return state.today && !now.compare(state.today) ? state : withToday(state, now);
}

/**
 * View fields for the month containing `date`. The era is kept: a bare year
 * means the current era in the Japanese calendar.
 */
export function viewOf(date) {
  return { viewEra: date.era, viewYear: date.year, viewMonth: date.month };
}

/**
 * First day of the visible month, plus `monthOffset` months.
 */
export function firstOfView(state, monthOffset = 0) {
  const { calendar, viewEra, viewYear, viewMonth } = state;
  const first = viewEra
    ? new CalendarDate(calendar, viewEra, viewYear, viewMonth, 1)
    : new CalendarDate(calendar, viewYear, viewMonth, 1);
  return monthOffset ? first.add({ months: monthOffset }) : first;
}

/**
 * Normalize `disabled-dates` entries (`"YYYY-MM-DD"` or inclusive
 * `"YYYY-MM-DD/YYYY-MM-DD"`) into sorted, merged `[isoStart, isoEnd]`
 * intervals. Reversed ranges are swapped and invalid entries dropped.
 */
export function parseDisabledDates(list) {
  const valid = (iso) => parseISOToCalendar(iso, getCalendar('gregory'));
  const intervals = [];
  for (const item of Array.isArray(list) ? list : []) {
    const [a, b = a, extra] = typeof item === 'string' ? item.split('/') : [];
    if (extra === undefined && valid(a) && valid(b)) intervals.push(a <= b ? [a, b] : [b, a]);
  }
  // Zero-padded ISO strings sort and compare like dates.
  intervals.sort((x, y) => (x[0] < y[0] ? -1 : 1));
  const merged = [];
  for (const interval of intervals) {
    const last = merged[merged.length - 1];
    if (last && interval[0] <= last[1]) {
      if (interval[1] > last[1]) last[1] = interval[1];
    } else {
      merged.push(interval);
    }
  }
  return merged.length ? merged : null;
}

function inIntervals(intervals, iso) {
  let lo = 0;
  let hi = intervals.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (intervals[mid][1] < iso) lo = mid + 1;
    else if (intervals[mid][0] > iso) hi = mid - 1;
    else return true;
  }
  return false;
}

/**
 * Immutable state update — returns new state object.
 */
export function updateState(state, changes) {
  return { ...state, ...changes };
}

const sortPair = (a, b) => (a.compare(b) <= 0 ? [a, b] : [b, a]);

/**
 * Select a date. For range type, handles start/end logic and the range rules.
 * For multiple type, toggles selection. Returns the same state when the date
 * can't be selected.
 */
export function selectDate(state, date) {
  if (state.type === 'range') {
    const start = state.rangeStart;
    if (hasPendingStart(state)) {
      if (rangeError(state, start, date)) {
        // Re-picking the start cancels it when a same-day range isn't allowed,
        // so the user is never stuck.
        return isSameDay(date, start) ? updateState(state, { rangeStart: null, focusedDate: date }) : state;
      }
      const [rangeStart, rangeEnd] = sortPair(start, date);
      return updateState(state, { rangeStart, rangeEnd, focusedDate: date });
    }
    if (isDateDisabled(state, date)) return state;
    return updateState(state, {
      rangeStart: date,
      rangeEnd: null,
      focusedDate: date,
      selectedDate: null,
    });
  }

  if (state.type !== 'multiple' && isDateDisabled(state, date)) return state;

  if (state.type === 'week') {
    return updateState(state, {
      rangeStart: startOfWeek(date, state.locale, state.firstDayOfWeek),
      rangeEnd: endOfWeek(date, state.locale, state.firstDayOfWeek),
      focusedDate: date,
    });
  }

  if (state.type === 'multiple') {
    const existing = state.selectedDates || [];
    const idx = existing.findIndex(d => isSameDay(d, date));
    let newDates;
    if (idx >= 0) {
      // Toggle off, even a kept date that is now disabled.
      newDates = [...existing.slice(0, idx), ...existing.slice(idx + 1)];
    } else if (isDateDisabled(state, date)) {
      return state;
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
 * Why the range between `a` and `b` (either order) breaks the range rules:
 * `'unavailable'`, `'short'` or `'long'`, or null when it is valid.
 * Length is counted in nights (end − start).
 */
export function rangeError(state, a, b) {
  const [start, end] = sortPair(a, b);
  const mode = state.excludeDisabled;
  // Nights mode only needs the nights free: the end may be a disabled day
  // (check-out on the day someone else checks in), but not out of bounds.
  if (isDateDisabled(state, start) || (mode === 'nights' ? isOutOfBounds(state, end) : isDateDisabled(state, end))) {
    return 'unavailable';
  }
  if (mode) {
    for (let d = start.add({ days: 1 }); d.compare(end) < 0; d = d.add({ days: 1 })) {
      if (isDateDisabled(state, d)) return 'unavailable';
    }
  }
  const nights = end.compare(start);
  if (nights < state.minNights) return 'short';
  if (state.maxNights != null && nights > state.maxNights) return 'long';
  return null;
}

/**
 * While a range start is pending, the furthest valid ends on either side of
 * it: `{lo, hi}` (null = unbounded), plus `checkout`, the disabled day a
 * nights-mode range may end on. Scans outward from the start to the first
 * disabled day, `maxNights` or the window edge. Null when no rule applies.
 */
export function getRangeLimits(state, windowStart, windowEnd) {
  const { rangeStart: start, minNights, maxNights, excludeDisabled: mode } = state;
  if (!(minNights || maxNights != null || mode) || !hasPendingStart(state)) return null;
  const limits = { lo: null, hi: null, checkout: null };
  for (const dir of [1, -1]) {
    const edge = dir > 0 ? windowEnd : windowStart;
    let limit = maxNights != null ? start.add({ days: dir * maxNights }) : null;
    if (mode) {
      for (let d = start.add({ days: dir }); d.compare(edge) * dir <= 0 && !(limit && d.compare(limit) * dir > 0); d = d.add({ days: dir })) {
        if (!isDateDisabled(state, d)) continue;
        if (dir > 0 && mode === 'nights' && !isOutOfBounds(state, d)) limits.checkout = limit = d;
        else limit = d.add({ days: -dir });
        break;
      }
    }
    limits[dir > 0 ? 'hi' : 'lo'] = limit;
  }
  return limits;
}

/**
 * Whether a range start is pending that the next pick would end. A pending
 * start on a disabled day (a kept value) is replaced instead.
 */
export function hasPendingStart(state) {
  return state.type === 'range' && !!state.rangeStart && !state.rangeEnd && !isDateDisabled(state, state.rangeStart);
}

/**
 * Whether `date` can't end the pending range, given `getRangeLimits`.
 * The start itself is never blocked.
 */
export function isRangeBlocked(state, date, limits) {
  if (!limits) return false;
  const nights = Math.abs(date.compare(state.rangeStart));
  return nights > 0 && (nights < state.minNights
    || !!(limits.lo && date.compare(limits.lo) < 0)
    || !!(limits.hi && date.compare(limits.hi) > 0));
}

function isOutOfBounds(state, date) {
  return !!((state.min && date.compare(state.min) < 0) || (state.max && date.compare(state.max) > 0));
}

/**
 * Check if a date is disabled (outside min/max, in disabled-dates, on a
 * disabled weekday, or by the filter).
 */
export function isDateDisabled(state, date) {
  if (isOutOfBounds(state, date)) return true;
  const { _disabledRanges: ranges, _disabledDows: dows, disabledDatesFilter: filter } = state;
  const iso = ranges || filter ? toISO(date) : '';
  if (ranges && inIntervals(ranges, iso)) return true;
  if (!dows && !filter) return false;
  const dayOfWeek = getDayOfWeek(date);
  if (dows && dows.includes(dayOfWeek)) return true;
  if (filter) {
    try {
      return !!filter({ year: date.year, month: date.month, day: date.day, dayOfWeek, iso });
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
 * Get weekend day numbers (0 = Sunday) for a locale, from
 * `Intl.Locale` week info with a small fallback table.
 */
export function getWeekendDays(locale) {
  const weekend = getWeekInfoField(locale, 'weekend');
  // Intl weekend uses 1=Mon..7=Sun.
  if (weekend && weekend.length) return weekend.map(d => d % 7);
  const lang = locale.split('-')[0];
  return lang === 'fa' || lang === 'ps' || lang === 'ar' ? [5, 6] : [0, 6];
}

/**
 * Get week boundaries for hover preview (before any selection is made).
 * Returns { start, end } or null. Callers should cache per render pass.
 */
export function getHoveredWeekBounds(state) {
  if (state.type !== 'week' || !state.hoveredDate || state.rangeStart) return null;
  return {
    start: startOfWeek(state.hoveredDate, state.locale, state.firstDayOfWeek),
    end: endOfWeek(state.hoveredDate, state.locale, state.firstDayOfWeek),
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
  return updateState(state, { focusedDate: newDate, ...viewOf(newDate) });
}

/**
 * Whether the visible months already touch min (prev) or max (next).
 */
export function getNavLimits(state, monthCount = 1) {
  const first = firstOfView(state);
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
  return updateState(state, { focusedDate: newFocus, ...viewOf(newFocus) });
}

/**
 * Get ISO string from a CalendarDate (converts to Gregorian first).
 */
export function toISO(date) {
  if (!date) return '';
  const greg = toCalendar(date, getCalendar('gregory'));
  return `${pad(greg.year, 4)}-${pad(greg.month, 2)}-${pad(greg.day, 2)}`;
}

/**
 * Parse ISO date string to a CalendarDate in the given calendar.
 */
export function parseISOToCalendar(iso, calendar) {
  if (!iso) return null;
  const match = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  const [, year, month, day] = match.map(Number);
  const greg = new CalendarDate(year, month, day);
  // CalendarDate clamps invalid values (Feb 30, month 13, year 0) instead of
  // throwing: detect clamping by comparing input vs result.
  if (greg.year !== year || greg.month !== month || greg.day !== day) return null;
  return toCalendar(greg, calendar);
}

/**
 * Convert ISO week (year + week number) to the Gregorian CalendarDate of that week's Monday.
 * Uses the Jan 4 algorithm: Jan 4 is always in ISO week 1.
 * Returns null for invalid week numbers.
 */
export function isoWeekToCalendarDate(isoYear, weekNum, calendar) {
  if (weekNum < 1 || weekNum > 53) return null;
  const monday = startOfWeek(new CalendarDate(isoYear, 1, 4), 'en', 'mon').add({ weeks: weekNum - 1 });
  return calendar ? toCalendar(monday, calendar) : monday;
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
      greg = parseISOToCalendar(`${short[1]}-${short[2] || '01'}-01`, getCalendar('gregory'));
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
 * Parse a min/max bound. An ISO week bound covers its whole locale week, so
 * min is that week's first day and max its last; week pickers also accept a
 * plain, day-precise ISO date.
 */
function parseBound(value, type, calendar, locale, firstDayOfWeek, isMax) {
  if (!value) return null;
  if (type !== 'week') return parseTypedValue(value, type, calendar);
  const week = value.includes('W') && parseValueForType(value, type, calendar, locale, firstDayOfWeek);
  return week ? week[isMax ? 'rangeEnd' : 'rangeStart'] : parseISOToCalendar(value, calendar);
}

/**
 * Parse a `value` string for the given picker type into selection fields.
 * Returns null when the string isn't a valid value for that type.
 * Values on disabled dates are kept; validity reports them.
 */
export function parseValueForType(value, type, calendar, locale, firstDayOfWeek) {
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
    // Through the ISO week's Thursday: its Monday can sit in the previous
    // locale week when weeks start Tue–Thu. A plain ISO date is also accepted.
    const monday = parseTypedValue(value, 'week', calendar);
    const date = monday ? monday.add({ days: 3 }) : parseISOToCalendar(value, calendar);
    if (!date) return null;
    return {
      ...empty,
      rangeStart: startOfWeek(date, locale, firstDayOfWeek),
      rangeEnd: endOfWeek(date, locale, firstDayOfWeek),
    };
  }

  const date = parseTypedValue(value, type, calendar);
  return date ? { ...empty, selectedDate: date } : null;
}

/**
 * ISO 8601 week-year and week number (Monday-based, Gregorian).
 * Late December / early January can shift year (Dec 29 → W01 of next year).
 */
export function getISOWeek(date) {
  // The week belongs to the year of its Thursday.
  const thursday = startOfWeek(toCalendar(date, getCalendar('gregory')), 'en', 'mon').add({ days: 3 });
  return { year: thursday.year, week: Math.floor(thursday.compare(new CalendarDate(thursday.year, 1, 1)) / 7) + 1 };
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
    // The ISO week containing the locale week's middle day. Parsing goes
    // through that ISO week's Thursday, which always lies in this locale
    // week, so any first day of week round-trips.
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
