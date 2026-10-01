import { registerLabels } from '../core/labels.js';

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
  selected: 'محدد',
  rangeStart: 'بداية النطاق',
  rangeEnd: 'نهاية النطاق',
  rangeSelected: '{start} إلى {end}',
  formatHint: 'مثال: {example}',
  invalidDate: 'أدخل التاريخ مثل {example}',
  dateUnavailable: 'هذا التاريخ غير متاح',
  pleaseSelectDate: 'الرجاء اختيار تاريخ',
  dateTooEarly: 'يجب أن يكون التاريخ {date} أو بعده',
  dateTooLate: 'يجب أن يكون التاريخ {date} أو قبله',
});

registerLabels('ar', LABELS_AR);
