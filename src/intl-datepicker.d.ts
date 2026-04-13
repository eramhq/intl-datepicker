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

export interface MonthDetail {
  type: 'month';
  value: string;
  calendar: { year: number; month: number } | null;
  formatted: string;
}

export interface YearDetail {
  type: 'year';
  value: string;
  calendar: { year: number } | null;
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

export type DisabledDatesFilterFn = (date: { year: number; month: number; day: number }) => boolean;

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
  pleaseSelectDate?: string;
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
  mapDays: MapDaysFn | null;
  presets: RangePreset[] | null;
  disabledDatesFilter: DisabledDatesFilterFn | null;
  /** Alias for `disabledDatesFilter`. Will be removed in v0.2 — prefer `disabledDatesFilter`. */
  isDateDisabled: DisabledDatesFilterFn | null;
  /** Localized strings; setting merges with locale defaults per-key. */
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
  readonly name: string | null;
  readonly type: string;
  readonly validity: ValidityState;
  readonly validationMessage: string;
  readonly willValidate: boolean;
  checkValidity(): boolean;
  reportValidity(): boolean;

  // --- Methods ---

  getValue(): SelectDetail | null;
  setValue(isoDate: string): void;
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
