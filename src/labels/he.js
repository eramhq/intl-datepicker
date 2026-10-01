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
  selected: 'נבחר',
  rangeStart: 'תחילת הטווח',
  rangeEnd: 'סוף הטווח',
  rangeSelected: '{start} עד {end}',
  formatHint: 'פורמט: {format}',
  invalidDate: 'יש להזין תאריך כמו {example}',
  dateUnavailable: 'תאריך זה אינו זמין',
  pleaseSelectDate: 'אנא בחר תאריך',
  dateTooEarly: 'התאריך חייב להיות {date} או מאוחר יותר',
  dateTooLate: 'התאריך חייב להיות {date} או מוקדם יותר',
});

registerLabels('he', LABELS_HE);
