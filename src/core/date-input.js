import { CalendarDate } from '@internationalized/date';
import { getCalendar } from './locale.js';
import { resolveIntlCalendar } from '../utils/common.js';

/**
 * Map of non-ASCII numeral codepoints → ASCII digit value (0-9).
 * Covers Persian, Arabic-Indic, Devanagari, Bengali, Gujarati, Gurmukhi,
 * Tamil, Telugu, Kannada, Malayalam, Thai, Myanmar, Khmer, Lao,
 * Tibetan, and Mongolian digit blocks.
 */
const DIGIT_RANGES = [
  [0x0660, 0x0669], // Arabic-Indic
  [0x06F0, 0x06F9], // Extended Arabic-Indic (Persian/Urdu)
  [0x07C0, 0x07C9], // NKo
  [0x0966, 0x096F], // Devanagari
  [0x09E6, 0x09EF], // Bengali
  [0x0A66, 0x0A6F], // Gurmukhi
  [0x0AE6, 0x0AEF], // Gujarati
  [0x0B66, 0x0B6F], // Oriya
  [0x0BE6, 0x0BEF], // Tamil
  [0x0C66, 0x0C6F], // Telugu
  [0x0CE6, 0x0CEF], // Kannada
  [0x0D66, 0x0D6F], // Malayalam
  [0x0E50, 0x0E59], // Thai
  [0x0ED0, 0x0ED9], // Lao
  [0x0F20, 0x0F29], // Tibetan
  [0x1040, 0x1049], // Myanmar
  [0x17E0, 0x17E9], // Khmer
  [0x1810, 0x1819], // Mongolian
];

/**
 * Translate any non-ASCII digits in a string to their ASCII equivalents.
 * Non-digit characters are left untouched.
 */
export function normalizeDigits(str) {
  if (!str) return str;
  let out = '';
  for (let i = 0; i < str.length; i++) {
    const code = str.charCodeAt(i);
    if (code >= 0x30 && code <= 0x39) {
      out += str[i];
      continue;
    }
    let mapped = null;
    for (const [start, end] of DIGIT_RANGES) {
      if (code >= start && code <= end) {
        mapped = String(code - start);
        break;
      }
    }
    out += mapped ?? str[i];
  }
  return out;
}

const ORDER_CACHE = new Map();

/**
 * Discover the segment order (YMD / DMY / MDY) for a locale + calendar by
 * inspecting Intl.DateTimeFormat's part stream for a sentinel date.
 *
 * Returns one of: 'YMD', 'DMY', 'MDY'.
 * Falls back to 'YMD' for any locale where parts can't be inferred.
 */
export function getLocaleSegmentOrder(locale, calendarId) {
  const cacheKey = `${locale}::${calendarId}`;
  const cached = ORDER_CACHE.get(cacheKey);
  if (cached) return cached;
  let order = 'YMD';
  try {
    const intlCalendar = resolveIntlCalendar(calendarId);
    const fmt = new Intl.DateTimeFormat(locale, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      calendar: intlCalendar,
    });
    // Use a sentinel where year/month/day are all distinguishable.
    const parts = fmt.formatToParts(new Date(2024, 5, 17));
    const seq = parts.filter(p => p.type === 'year' || p.type === 'month' || p.type === 'day')
      .map(p => p.type[0].toUpperCase());
    const joined = seq.join('');
    if (joined === 'YMD' || joined === 'DMY' || joined === 'MDY') {
      order = joined;
    }
  } catch { /* fall through to default */ }
  ORDER_CACHE.set(cacheKey, order);
  return order;
}

function safeCreateInCalendar(year, month, day, calendarId) {
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  if (year < 1 || month < 1 || month > 13 || day < 1 || day > 31) return null;
  try {
    const calendar = getCalendar(calendarId);
    const cd = new CalendarDate(calendar, year, month, day);
    // CalendarDate silently clamps invalid combinations (e.g. Feb 31) — detect
    // by comparing the parsed input against the constructed result.
    if (cd.year !== year || cd.month !== month || cd.day !== day) return null;
    return cd;
  } catch {
    return null;
  }
}

const SEPARATOR_REGEX = /[/.\-\s]/;

/**
 * Parse user-typed date input into a CalendarDate in the active calendar.
 *
 * Behavior:
 * - Persian/Arabic-Indic/etc digits are normalized to ASCII first.
 * - The resulting numeric segments are interpreted *in the active calendar*.
 *   Typing "1403-01-01" with calendar="persian" yields Persian year 1403,
 *   NOT Gregorian year 1403 converted to Persian.
 * - Segment order is auto-detected from the locale (Y-M-D, D-M-Y, M-D-Y).
 *   Override via `format` ('YMD' | 'DMY' | 'MDY' | 'auto').
 *
 * Returns null on any parsing failure.
 */
export function parseInput(text, calendarId, locale, format) {
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (!trimmed) return null;

  const normalized = normalizeDigits(trimmed);
  // Strip Japanese era prefix (令和 etc.) and any other leading non-digits.
  const stripped = normalized.replace(/^[^0-9]+/, '');

  const segments = stripped.split(SEPARATOR_REGEX).filter(Boolean);
  if (segments.length !== 3) return null;
  if (!segments.every(s => /^\d+$/.test(s))) return null;

  // Reject all-2-digit input — ambiguous and almost always user error.
  const widths = segments.map(s => s.length);
  if (widths.every(w => w <= 2)) return null;

  const nums = segments.map(Number);
  if (nums.some(n => n < 0)) return null;

  // Prefer width-based year detection so "1403/01/01" works regardless of locale.
  const yearIdx = widths.findIndex(w => w >= 3);

  let order = (format && format !== 'auto') ? format : getLocaleSegmentOrder(locale, calendarId);
  if (!['YMD', 'DMY', 'MDY'].includes(order)) order = 'YMD';

  let year, month, day;
  if (yearIdx === 0 || (yearIdx === -1 && order === 'YMD')) {
    [year, month, day] = nums;
  } else if (yearIdx === 2 || (yearIdx === -1 && order === 'DMY')) {
    if (order === 'MDY') {
      [month, day, year] = nums;
    } else {
      [day, month, year] = nums;
    }
  } else if (yearIdx === -1 && order === 'MDY') {
    [month, day, year] = nums;
  } else {
    if (order === 'YMD') [year, month, day] = nums;
    else if (order === 'DMY') [day, month, year] = nums;
    else [month, day, year] = nums;
  }

  return safeCreateInCalendar(year, month, day, calendarId);
}

/**
 * Adjust a date segment (year, month, or day) by a delta.
 * Used for arrow up/down keyboard input on segments.
 */
export function adjustSegment(date, segment, delta) {
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
