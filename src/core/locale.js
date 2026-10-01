import { GregorianCalendar } from '@internationalized/date';

const calendarRegistry = new Map([
  ['gregory', () => new GregorianCalendar()],
]);

export function registerCalendar(name, factory) {
  calendarRegistry.set(name, factory);
}

export function isCalendarRegistered(id) {
  return calendarRegistry.has(id);
}

export function getSupportedCalendars() {
  return [...calendarRegistry.keys()];
}

const calendarCache = new Map();

export function getCalendar(identifier) {
  const cached = calendarCache.get(identifier);
  if (cached) return cached;

  const factory = calendarRegistry.get(identifier);
  if (!factory) {
    console.warn(`Calendar "${identifier}" not registered. Import 'intl-datepicker/calendars/${identifier}' to enable it.`);
    const fallback = new GregorianCalendar();
    calendarCache.set(identifier, fallback);
    return fallback;
  }
  const instance = factory();
  calendarCache.set(identifier, instance);
  return instance;
}

// RTL detection with fallback table
const RTL_LOCALES = new Set([
  'ar', 'fa', 'he', 'ur', 'ps', 'sd', 'ckb', 'yi', 'arc', 'dv', 'ku',
]);

export function isRTL(locale) {
  try {
    const loc = new Intl.Locale(locale);
    // Modern browsers: getTextInfo() or textInfo
    if (typeof loc.getTextInfo === 'function') {
      return loc.getTextInfo().direction === 'rtl';
    }
    if (loc.textInfo) {
      return loc.textInfo.direction === 'rtl';
    }
    // Fallback: check language prefix
    return RTL_LOCALES.has(loc.language);
  } catch {
    return false;
  }
}

// Week info (firstDay) with fallback table
const WEEK_START_FALLBACKS = {
  // Saturday-start countries
  'fa': 6, 'ps': 6, // Iran, Afghanistan
  'ar-SA': 6, 'ar-AE': 6, 'ar-BH': 6, 'ar-DZ': 6, 'ar-EG': 6,
  'ar-IQ': 6, 'ar-JO': 6, 'ar-KW': 6, 'ar-LY': 6, 'ar-OM': 6,
  'ar-QA': 6, 'ar-SY': 6, 'ar-YE': 6,
  // Sunday-start countries
  'en-US': 7, 'en-CA': 7, 'ja': 7, 'ko': 7, 'zh': 7,
  'he': 7, 'hi': 7, 'pt-BR': 7,
};

export function getWeekInfoField(locale, field) {
  try {
    const loc = new Intl.Locale(locale);
    const info = typeof loc.getWeekInfo === 'function' ? loc.getWeekInfo() : loc.weekInfo;
    if (info) return info[field];
  } catch { /* fallback */ }
  return undefined;
}

export function getFirstDayOfWeek(locale) {
  const day = getWeekInfoField(locale, 'firstDay');
  if (day != null) return day;

  // Check exact locale, then language only
  if (WEEK_START_FALLBACKS[locale] !== undefined) {
    return WEEK_START_FALLBACKS[locale];
  }
  const lang = locale.split('-')[0];
  if (WEEK_START_FALLBACKS[lang] !== undefined) {
    return WEEK_START_FALLBACKS[lang];
  }
  return 1; // Monday (ISO default)
}

const DAY_NAMES = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

/**
 * Parse a day of week given as 0–6 (0 = Sunday) or `sun`…`sat`. Returns -1
 * for anything else.
 */
export function parseDayOfWeek(value) {
  const v = String(value).trim().toLowerCase();
  return /^[0-6]$/.test(v) ? +v : DAY_NAMES.indexOf(v);
}

/**
 * Resolve the `first-day-of-week` attribute to the `'sun'`…`'sat'` form
 * `@internationalized/date` takes. Invalid or missing values fall back to
 * the locale's first day.
 */
export function resolveFirstDayOfWeek(attr, locale) {
  const day = attr == null ? -1 : parseDayOfWeek(attr);
  return DAY_NAMES[day >= 0 ? day : getFirstDayOfWeek(locale) % 7];
}

export function getMinimalDays(locale) {
  return getWeekInfoField(locale, 'minimalDays') ?? 4;
}

/**
 * Apply a numbering system override to a locale string.
 * Returns the locale with `-u-nu-{numerals}` appended (or replaced).
 */
export function applyNumerals(locale, numerals) {
  if (!numerals) return locale;
  try {
    return new Intl.Locale(locale, { numberingSystem: numerals }).toString();
  } catch { return locale; }
}

/**
 * Resolve locale string. Priority: explicit > document lang > navigator.language
 */
export function resolveLocale(explicit) {
  if (explicit) return explicit;
  if (typeof document !== 'undefined' && document.documentElement.lang) {
    return document.documentElement.lang;
  }
  if (typeof navigator !== 'undefined') {
    return navigator.language;
  }
  return 'en-US';
}

/**
 * Get localized weekday names, starting at `firstDayOfWeek` (`'sun'`…`'sat'`).
 */
export function getWeekdayNames(locale, format = 'short', numerals = null, firstDayOfWeek = resolveFirstDayOfWeek(null, locale)) {
  const formatter = new Intl.DateTimeFormat(applyNumerals(locale, numerals), { weekday: format });
  const first = DAY_NAMES.indexOf(firstDayOfWeek);
  // Jan 7 2024 is a Sunday.
  return Array.from({ length: 7 }, (_, i) => formatter.format(new Date(2024, 0, 7 + first + i)));
}
