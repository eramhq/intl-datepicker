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
  pleaseSelectDate: 'الرجاء اختيار تاريخ',
});

registerLabels('ar', LABELS_AR);
