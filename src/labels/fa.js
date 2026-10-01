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
});

registerLabels('fa', LABELS_FA);
