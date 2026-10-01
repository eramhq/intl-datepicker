import { registerLabels } from '../core/labels.js';

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
  selected: 'انتخاب‌شده',
  rangeStart: 'شروع بازه',
  rangeEnd: 'پایان بازه',
  rangeSelected: '{start} تا {end}',
  formatHint: 'مثال: {example}',
  invalidDate: 'تاریخ را مانند {example} وارد کنید',
  dateUnavailable: 'این تاریخ قابل انتخاب نیست',
  pleaseSelectDate: 'لطفاً یک تاریخ انتخاب کنید',
  dateTooEarly: 'تاریخ باید {date} یا بعد از آن باشد',
  dateTooLate: 'تاریخ باید {date} یا قبل از آن باشد',
  rangeTooShort: 'حداقل {nights} انتخاب کنید',
  rangeTooLong: 'حداکثر {nights} انتخاب کنید',
  rangeUnavailable: 'این بازه شامل تاریخ‌های غیرقابل‌انتخاب است',
  rangeIncomplete: 'تاریخ پایان را انتخاب کنید',
  minNightsHint: 'حداقل اقامت: {nights}',
  maxNightsHint: 'حداکثر: {nights}',
  // Persian nouns stay singular after a number.
  nights: '{n} شب',
});

registerLabels('fa', LABELS_FA);
