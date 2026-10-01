import { CalendarDate } from '@internationalized/date';

// ── Picker types ──

export type DatepickerType = 'date' | 'range' | 'week' | 'multiple' | 'month' | 'year';

/** A day of week for `first-day-of-week` / `disabled-days-of-week`. */
export type DayOfWeekName = 'sun' | 'mon' | 'tue' | 'wed' | 'thu' | 'fri' | 'sat';

/** `exclude-disabled` modes: `''`/`'days'` excludes every day, `'nights'` lets the end land on a disabled day. */
export type ExcludeDisabledMode = '' | 'days' | 'nights';

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
  /** First visible month, in the active calendar. */
  year: number;
  month: number;
  direction: 'forward' | 'backward';
  /** Gregorian ISO date of the first day of the first visible month, e.g. `"2026-03-21"`. */
  start: string;
  /** Gregorian ISO date of the last day of the last visible month (`months` panels). */
  end: string;
}

// ── mapDays callback ──

/**
 * A day as passed to `mapDays` and `disabledDatesFilter`. `year`/`month`/`day`
 * are in the active calendar; `iso` is the Gregorian `YYYY-MM-DD` date for
 * matching backend data; `dayOfWeek` is 0 (Sunday) – 6 (Saturday) whatever
 * `first-day-of-week` is.
 */
export interface DayInfo {
  year: number;
  month: number;
  day: number;
  dayOfWeek: number;
  iso: string;
}

export interface MapDaysInput {
  date: DayInfo;
  isToday: boolean;
  isSelected: boolean;
  /** Disabled by min/max, disabled dates, weekdays or the filter (not by range rules). */
  isDisabled: boolean;
  isInRange: boolean;
  isRangeStart: boolean;
  isRangeEnd: boolean;
  /** Can't end the pending range (too short, too long, or past a disabled day). */
  isRangeBlocked: boolean;
  /** A disabled day the pending `exclude-disabled="nights"` range may end on. */
  isCheckoutOnly: boolean;
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

/** Return `true` to disable a day. See {@link DayInfo}. */
export type DisabledDatesFilterFn = (date: DayInfo) => boolean;

// ── Labels API ──

/**
 * A label with plural forms keyed by `Intl.PluralRules` category, e.g.
 * `{ one: '{n} night', other: '{n} nights' }`. `{n}` is the count in the
 * picker's numerals.
 */
export type PluralLabel = Partial<Record<Intl.LDMLPluralRule, string>> & { other: string };

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
  /** Range shorter than `min-nights`. Placeholder: `{nights}`, a formatted `nights`. */
  rangeTooShort?: string;
  /** Range longer than `max-nights`. Placeholder: `{nights}`. */
  rangeTooLong?: string;
  /** Range on or across unavailable days. */
  rangeUnavailable?: string;
  /** A `required` range with only a start. */
  rangeIncomplete?: string;
  /** Range hint while a start is pending. Placeholder: `{nights}`. */
  minNightsHint?: string;
  /** Range hint while a start is pending. Placeholder: `{nights}`. */
  maxNightsHint?: string;
  /** A night count. Placeholder: `{n}`. */
  nights?: string | PluralLabel;
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
