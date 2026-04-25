import { registerLabels } from '../core/labels.js';

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

registerLabels('he', LABELS_HE);
