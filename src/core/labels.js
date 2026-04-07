/**
 * Localized labels for every visible / accessible string in the component.
 *
 * Resolution order: English defaults ← locale defaults ← user overrides.
 * Built-in defaults are shipped for the project's hero RTL locales (en, fa, ar, he).
 * Other locales fall back to English so the API works everywhere — users can override
 * individual keys via the `labels` property/attribute.
 *
 * NOTE: The fa/ar/he translations should be reviewed by native speakers before
 * the v0.2 release. They're correct enough to be useful, but ship as community-
 * reviewable defaults rather than authoritative translations.
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

export const LABELS_FA = Object.freeze({
  today: 'امروز',
  clear: 'پاک کردن',
  clearDate: 'پاک کردن تاریخ',
  datePicker: 'انتخاب تاریخ',
  rangePresets: 'پیش‌فرض‌های بازه تاریخ',
  calendarNavigation: 'پیمایش تقویم',
  monthSelection: 'انتخاب ماه',
  yearSelection: 'انتخاب سال',
  previousMonth: 'ماه قبل',
  nextMonth: 'ماه بعد',
  previousDecade: 'بیست سال قبل',
  nextDecade: 'بیست سال بعد',
  selectMonth: 'انتخاب ماه',
  selectYear: 'انتخاب سال',
  weekNumber: 'شماره هفته',
  pleaseSelectDate: 'لطفاً یک تاریخ انتخاب کنید',
});

export const LABELS_AR = Object.freeze({
  today: 'اليوم',
  clear: 'مسح',
  clearDate: 'مسح التاريخ',
  datePicker: 'منتقي التاريخ',
  rangePresets: 'إعدادات نطاق التاريخ',
  calendarNavigation: 'التنقل في التقويم',
  monthSelection: 'اختيار الشهر',
  yearSelection: 'اختيار السنة',
  previousMonth: 'الشهر السابق',
  nextMonth: 'الشهر التالي',
  previousDecade: 'العشرون سنة السابقة',
  nextDecade: 'العشرون سنة التالية',
  selectMonth: 'اختر الشهر',
  selectYear: 'اختر السنة',
  weekNumber: 'رقم الأسبوع',
  pleaseSelectDate: 'الرجاء اختيار تاريخ',
});

export const LABELS_HE = Object.freeze({
  today: 'היום',
  clear: 'נקה',
  clearDate: 'נקה תאריך',
  datePicker: 'בוחר תאריך',
  rangePresets: 'טווחי תאריכים מוגדרים מראש',
  calendarNavigation: 'ניווט בלוח השנה',
  monthSelection: 'בחירת חודש',
  yearSelection: 'בחירת שנה',
  previousMonth: 'החודש הקודם',
  nextMonth: 'החודש הבא',
  previousDecade: '20 השנים הקודמות',
  nextDecade: '20 השנים הבאות',
  selectMonth: 'בחר חודש',
  selectYear: 'בחר שנה',
  weekNumber: 'מספר שבוע',
  pleaseSelectDate: 'אנא בחר תאריך',
});

const BUILTIN_LOCALE_DEFAULTS = {
  en: DEFAULT_LABELS_EN,
  fa: LABELS_FA,
  ar: LABELS_AR,
  he: LABELS_HE,
};

/**
 * Resolve the label set for a given locale, applying user overrides on top.
 * Order: English defaults ← locale defaults (if shipped) ← user overrides.
 */
export function resolveLabels(locale, userOverrides) {
  const lang = (locale || 'en').toLowerCase().split('-')[0];
  const localeDefaults = BUILTIN_LOCALE_DEFAULTS[lang] || null;
  const merged = { ...DEFAULT_LABELS_EN };
  if (localeDefaults) Object.assign(merged, localeDefaults);
  if (userOverrides && typeof userOverrides === 'object') {
    for (const [k, v] of Object.entries(userOverrides)) {
      if (typeof v === 'string' && v.length > 0) merged[k] = v;
    }
  }
  return merged;
}
