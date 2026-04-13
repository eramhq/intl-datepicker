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

function getWeekInfoField(locale, field) {
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
 * Get localized weekday names.
 */
export function getWeekdayNames(locale, format = 'short', numerals = null) {
  const effectiveLocale = applyNumerals(locale, numerals);
  const formatter = new Intl.DateTimeFormat(effectiveLocale, { weekday: format });
  const names = [];
  // Jan 1 2024 is a Monday
  for (let d = 0; d < 7; d++) {
    const date = new Date(2024, 0, d + 1);
    names.push(formatter.format(date));
  }
  // names[0]=Monday ... names[6]=Sunday
  // Reorder based on firstDay
  const firstDay = getFirstDayOfWeek(locale);
  // Intl weekdays: Mon=1, Tue=2, ..., Sun=7
  // Our array: index 0=Mon, 1=Tue, ..., 6=Sun
  // firstDay=1 → offset 0, firstDay=6 → offset 5, firstDay=7 → offset 6
  const offset = firstDay === 7 ? 6 : firstDay - 1;
  return [...names.slice(offset), ...names.slice(0, offset)];
}
