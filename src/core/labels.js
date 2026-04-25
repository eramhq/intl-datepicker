/**
 * Localized labels for every visible / accessible string in the component.
 *
 * Resolution order: English defaults ← locale defaults ← user overrides.
 * English ships inline; other locales are opt-in via `intl-datepicker/labels/{lang}`,
 * mirroring the calendar plugin pattern. `intl-datepicker/full` registers all of them.
 */

export const DEFAULT_LABELS_EN = Object.freeze({
  // Buttons / footer
  today: 'Today',
  clear: 'Clear',
  clearDate: 'Clear date',
  // Dialog / regions
  datePicker: 'Date picker',
  rangePresets: 'Date range presets',
  calendarNavigation: 'Calendar navigation',
  monthSelection: 'Month selection',
  yearSelection: 'Year selection',
  // Navigation
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  previousDecade: 'Previous 20 years',
  nextDecade: 'Next 20 years',
  selectMonth: 'Select month',
  selectYear: 'Select year',
  weekNumber: 'Week number',
  // Validation
  pleaseSelectDate: 'Please select a date',
});

const labelRegistry = new Map();

/**
 * Register a built-in label set for a language code (e.g. 'fa', 'ar', 'he').
 * Side-effect imports in `intl-datepicker/labels/{lang}` call this.
 */
export function registerLabels(lang, labels) {
  labelRegistry.set(lang, Object.freeze({ ...labels }));
}

export function resolveLabels(locale, userOverrides) {
  const lang = (locale || 'en').toLowerCase().split('-')[0];
  const localeDefaults = lang === 'en' ? DEFAULT_LABELS_EN : labelRegistry.get(lang);
  const merged = { ...DEFAULT_LABELS_EN };
  if (localeDefaults) Object.assign(merged, localeDefaults);
  if (userOverrides && typeof userOverrides === 'object') {
    for (const [k, v] of Object.entries(userOverrides)) {
      if (typeof v === 'string' && v.length > 0) merged[k] = v;
    }
  }
  return merged;
}
