import { CalendarDate, toCalendar } from '@internationalized/date';
import { getCalendar } from './locale.js';

/**
 * Parse user-typed date segments into a CalendarDate.
 * Supports formats: YYYY/MM/DD, YYYY-MM-DD, DD/MM/YYYY, etc.
 * Returns null if invalid.
 */
export function parseInput(text, calendarId, locale) {
  if (!text || !text.trim()) return null;

  const cleaned = text.trim();

  // Try ISO format first (Gregorian input)
  const isoMatch = cleaned.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (isoMatch) {
    return safeCreateDate(
      parseInt(isoMatch[1]),
      parseInt(isoMatch[2]),
      parseInt(isoMatch[3]),
      calendarId === 'gregory' ? null : calendarId,
    );
  }

  // Try slash/dot separated: YYYY/MM/DD or DD/MM/YYYY
  const sepMatch = cleaned.match(/^(\d{1,4})[/.\-](\d{1,2})[/.\-](\d{1,4})$/);
  if (sepMatch) {
    let [, a, b, c] = sepMatch.map(Number);
    // Determine order: if first part > 31, it's year-first
    if (a > 31) {
      return safeCreateCalendarDate(a, b, c, calendarId);
    }
    // Otherwise day-first (common in many locales)
    if (c > 31) {
      return safeCreateCalendarDate(c, b, a, calendarId);
    }
  }

  return null;
}

function safeCreateDate(year, month, day, calendarId) {
  try {
    const greg = new CalendarDate(year, month, day);
    if (calendarId) {
      return toCalendar(greg, getCalendar(calendarId));
    }
    return greg;
  } catch {
    return null;
  }
}

function safeCreateCalendarDate(year, month, day, calendarId) {
  try {
    const calendar = getCalendar(calendarId);
    return new CalendarDate(calendar, year, month, day);
  } catch {
    return null;
  }
}

/**
 * Adjust a date segment (year, month, or day) by a delta.
 * Used for arrow up/down keyboard input on segments.
 */
export function adjustSegment(date, segment, delta, calendarId) {
  if (!date) return date;
  try {
    switch (segment) {
      case 'year':
        return date.add({ years: delta });
      case 'month':
        return date.add({ months: delta });
      case 'day':
        return date.add({ days: delta });
      default:
        return date;
    }
  } catch {
    return date;
  }
}
