import { CalendarDate } from '@internationalized/date';

// ── Picker types ──

export type DatepickerType = 'date' | 'range' | 'week' | 'multiple' | 'month' | 'year';

// ── Event detail types ──

export interface DateDetail {
  type: 'date';
  value: string;
  calendar: { year: number; month: number; day: number } | null;
  formatted: string;
}

export interface RangeDetail {
  type: 'range';
  value: string;
  start: { year: number; month: number; day: number } | null;
  end: { year: number; month: number; day: number } | null;
  formatted: string;
}

export interface WeekDetail {
  type: 'week';
  value: string;
  start: { year: number; month: number; day: number } | null;
  end: { year: number; month: number; day: number } | null;
  formatted: string;
}

export interface MultipleDetail {
  type: 'multiple';
  value: string;
  dates: Array<{ year: number; month: number; day: number }>;
  formatted: string;
}

/**
 * Month picker detail.
 *
 * `value` follows `Temporal.PlainYearMonth`: `"2024-07"` for Gregorian, or
 * the ISO date of the month's first day plus a calendar annotation for other
 * calendars, e.g. `"2024-07-22[u-ca=persian]"`.
 */
export interface MonthDetail {
  type: 'month';
  value: string;
  /** Native year/month in the active calendar, e.g. `{ year: 1403, month: 5 }`. */
  calendar: { year: number; month: number } | null;
  /** Gregorian ISO date of the month's first day, e.g. `"2024-07-22"`. */
  start: string | null;
  /** Gregorian ISO date of the month's last day, e.g. `"2024-08-21"`. */
  end: string | null;
  formatted: string;
}

/**
 * Year picker detail. `value` is `"2024"` for Gregorian, otherwise the ISO
 * date of the year's first day plus a calendar annotation, e.g.
 * `"2024-03-20[u-ca=persian]"`.
 */
export interface YearDetail {
  type: 'year';
  value: string;
  /** Native year in the active calendar, e.g. `{ year: 1403 }`. */
  calendar: { year: number } | null;
  /** Gregorian ISO date of the year's first day. */
  start: string | null;
  /** Gregorian ISO date of the year's last day. */
  end: string | null;
  formatted: string;
}

export type SelectDetail =
  | DateDetail
  | RangeDetail
  | WeekDetail
  | MultipleDetail
  | MonthDetail
  | YearDetail;

export interface NavigateDetail {
  year: number;
  month: number;
  direction: 'forward' | 'backward';
}

// ── mapDays callback ──

export interface MapDaysInput {
  date: { year: number; month: number; day: number; dayOfWeek: number };
  isToday: boolean;
  isSelected: boolean;
  isDisabled: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  isCurrentMonth: boolean;
}

export interface MapDaysResult {
  className?: string;
  style?: string;
  content?: string;
  disabled?: boolean;
  hidden?: boolean;
  title?: string;
}

export type MapDaysFn = (info: MapDaysInput) => MapDaysResult | null | undefined;

// ── Presets ──

export interface RangePreset {
  label: string;
  value: string;
}

// ── Disabled dates filter ──

/** `dayOfWeek` is 0 (Sunday) – 6 (Saturday). Date fields are in the active calendar. */
export type DisabledDatesFilterFn = (date: { year: number; month: number; day: number; dayOfWeek: number }) => boolean;

// ── Labels API ──

/**
 * Localized strings used by the picker. All keys are optional in user
 * overrides — missing keys fall through to the locale defaults (English,
 * Persian, Arabic, Hebrew shipped) and finally to English.
 */
export interface IntlDatepickerLabels {
  today?: string;
  clear?: string;
  clearDate?: string;
  datePicker?: string;
  rangePresets?: string;
  calendarNavigation?: string;
  monthSelection?: string;
  yearSelection?: string;
  previousMonth?: string;
  nextMonth?: string;
  previousDecade?: string;
  nextDecade?: string;
  selectMonth?: string;
  selectYear?: string;
  weekNumber?: string;
  /** Appended to a day's accessible name, e.g. "June 15, 2024, selected". */
  selected?: string;
  rangeStart?: string;
  rangeEnd?: string;
  /** Live-region text for a completed range. Placeholders: `{start}`, `{end}`. */
  rangeSelected?: string;
  /** Hint under the input with `allow-input`. Placeholders: `{format}` (e.g. "MM/DD/YYYY"), `{example}`. */
  formatHint?: string;
  /** Error for unparseable typed input. Placeholders: `{format}`, `{example}`. */
  invalidDate?: string;
  /** Error for a typed date that is disabled or out of range. */
  dateUnavailable?: string;
  pleaseSelectDate?: string;
  /** Validation message for values before `min`. Placeholder: `{date}`. */
  dateTooEarly?: string;
  /** Validation message for values after `max`. Placeholder: `{date}`. */
  dateTooLate?: string;
}

/** Override for `parseInput`'s segment-order auto detection. */
export type DateFormat = 'auto' | 'YMD' | 'DMY' | 'MDY';

/** Caption layout mode for the calendar header. */
export type CaptionLayout = 'button' | 'dropdown' | 'dropdown-months' | 'dropdown-years';

// ── Custom element ──

export declare class IntlDatepickerElement extends HTMLElement {
  static formAssociated: true;
  static observedAttributes: string[];

  // --- Public properties (read/write) ---

  value: string;
  /** Picker type; reflects the `type` attribute. */
  type: DatepickerType;
  /** Form field name; reflects the `name` attribute. */
  name: string | null;
  mapDays: MapDaysFn | null;
  /** Range presets. A JSON string is also accepted. */
  presets: RangePreset[] | null;
  disabledDatesFilter: DisabledDatesFilterFn | null;
  /** @deprecated Alias for `disabledDatesFilter`. */
  isDateDisabled: DisabledDatesFilterFn | null;
  /** Localized strings; setting merges with locale defaults per-key. A JSON string is also accepted. */
  labels: IntlDatepickerLabels;
  /** Override the locale's default numbering system (e.g., 'latn' for Latin digits). */
  numerals: string | null;
  /** Caption layout mode: 'button' (default), 'dropdown', 'dropdown-months', 'dropdown-years'. */
  captionLayout: CaptionLayout;
  /** When true, always render 6 rows (42 day cells) per month for consistent height. */
  fixedWeeks: boolean;

  // --- Read-only properties ---

  readonly valueAsDate: Date | null;
  readonly calendarValue: CalendarDate | null;
  readonly displayValue: string;
  readonly rangeStart: string | null;
  readonly rangeEnd: string | null;
  readonly selectedDates: CalendarDate[];

  // --- Form-associated ---

  readonly form: HTMLFormElement | null;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;

  // --- Methods ---

  getValue(): SelectDetail | null;
  /** Same formats as the `value` attribute. Fires `intl-change` only if the value changes. */
  setValue(value: string): void;
  clear(): void;
  open(): void;
  close(): void;
  goToMonth(year: number, month: number): void;
}

// ── Custom events ──

export interface IntlDatepickerEventMap {
  'intl-select': CustomEvent<SelectDetail>;
  'intl-change': CustomEvent<SelectDetail>;
  'intl-navigate': CustomEvent<NavigateDetail>;
  'intl-open': CustomEvent<void>;
  'intl-close': CustomEvent<void>;
}

// ── Global augmentations ──

declare global {
  interface HTMLElementTagNameMap {
    'intl-datepicker': IntlDatepickerElement;
  }

  interface HTMLElementEventMap extends IntlDatepickerEventMap {}
}

export {};
