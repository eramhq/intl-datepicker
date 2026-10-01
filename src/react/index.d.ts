import { CalendarDate } from '@internationalized/date';
import type * as React from 'react';
import type {
  DatepickerType,
  DayOfWeekName,
  ExcludeDisabledMode,
  DateFormat,
  CaptionLayout,
  SelectDetail,
  NavigateDetail,
  MapDaysFn,
  RangePreset,
  DisabledDatesFilterFn,
  IntlDatepickerElement,
  IntlDatepickerLabels,
} from '../intl-datepicker.js';

/**
 * Props for the React wrapper. Extends `HTMLAttributes` so `className`,
 * `style`, `id`, `aria-*`, `data-*`, and `children` all flow through to the
 * underlying custom element automatically. `onChange`/`onSelect` receive the
 * picker's detail instead of a DOM event.
 */
export interface IntlDatepickerProps extends Omit<React.HTMLAttributes<IntlDatepickerElement>, 'onChange' | 'onSelect'> {
  // String attributes
  calendar?: string;
  locale?: string;
  value?: string;
  type?: DatepickerType;
  min?: string;
  max?: string;
  for?: string;
  placeholder?: string;
  name?: string;
  disabledDates?: string;
  dateSeparator?: string;
  maxDates?: string | number;
  months?: string | number;
  /** Override segment-order detection for typed input ('auto' | 'YMD' | 'DMY' | 'MDY'). */
  dateFormat?: DateFormat;
  /** Override the locale's default numbering system (e.g., 'latn' for Latin digits). */
  numerals?: string;
  /** Caption layout: 'button' (default), 'dropdown', 'dropdown-months', 'dropdown-years'. */
  captionLayout?: CaptionLayout;
  /** First day of the week: 0–6 (0 = Sunday) or 'sun'…'sat'. */
  firstDayOfWeek?: DayOfWeekName | number | string;
  /** Weekdays that can't be selected, e.g. "5,6" or "fri,sat". */
  disabledDaysOfWeek?: string;
  /** Minimum range length in nights (end − start). */
  minNights?: string | number;
  /** Maximum range length in nights. */
  maxNights?: string | number;
  /** `true` or 'days': no disabled day in the range; 'nights': the end may be the first disabled day. */
  excludeDisabled?: boolean | ExcludeDisabledMode;

  // Dual-form attributes (string for JSON form, object/array for direct form)
  presets?: string | RangePreset[];
  labels?: string | IntlDatepickerLabels;

  // Boolean attributes
  inline?: boolean;
  disabled?: boolean;
  readonly?: boolean;
  required?: boolean;
  showAlternate?: boolean;
  disableWeekends?: boolean;
  sortDates?: boolean;
  noAnimation?: boolean;
  showWeekNumbers?: boolean;
  hideOutsideDays?: boolean;
  allowInput?: boolean;
  fixedWeeks?: boolean;
  disablePast?: boolean;
  disableFuture?: boolean;

  // JS-only properties (passed via property setter, not attribute)
  mapDays?: MapDaysFn | null;
  disabledDatesFilter?: DisabledDatesFilterFn | null;

  // Event handlers
  onSelect?: (detail: SelectDetail) => void;
  onChange?: (detail: SelectDetail) => void;
  onNavigate?: (detail: NavigateDetail) => void;
  /** Return `false` to prevent opening. */
  onOpen?: (event: CustomEvent<void>) => void | false;
  /** Return `false` to prevent closing. */
  onClose?: (event: CustomEvent<void>) => void | false;
}

export interface IntlDatepickerRef {
  readonly element: IntlDatepickerElement | null;
  readonly value: string | undefined;
  readonly displayValue: string | undefined;
  readonly calendarValue: CalendarDate | null | undefined;
  readonly selectedDates: CalendarDate[] | undefined;
  getValue(): SelectDetail | null | undefined;
  setValue(v: string): void;
  clear(): void;
  open(): void;
  close(): void;
  goToMonth(year: number, month: number): void;
}

declare const IntlDatepicker: React.ForwardRefExoticComponent<
  IntlDatepickerProps & React.RefAttributes<IntlDatepickerRef>
>;

export default IntlDatepicker;
export { IntlDatepicker };

// JSX types for the raw web component, e.g. `<intl-datepicker min-nights="2">`.
type IntlDatepickerIntrinsicProps = React.DetailedHTMLProps<
  React.HTMLAttributes<IntlDatepickerElement> & {
    calendar?: string;
    locale?: string;
    value?: string;
    type?: DatepickerType;
    min?: string;
    max?: string;
    for?: string;
    placeholder?: string;
    name?: string;
    inline?: boolean;
    disabled?: boolean;
    readonly?: boolean;
    required?: boolean;
    'show-alternate'?: boolean;
    'disable-weekends'?: boolean;
    'sort-dates'?: boolean;
    'no-animation'?: boolean;
    'show-week-numbers'?: boolean;
    'hide-outside-days'?: boolean;
    'allow-input'?: boolean;
    'fixed-weeks'?: boolean;
    'disable-past'?: boolean;
    'disable-future'?: boolean;
    'first-day-of-week'?: string;
    'disabled-days-of-week'?: string;
    'min-nights'?: string;
    'max-nights'?: string;
    'exclude-disabled'?: boolean | ExcludeDisabledMode;
    numerals?: string;
    'caption-layout'?: CaptionLayout;
    'disabled-dates'?: string;
    'date-separator'?: string;
    'date-format'?: DateFormat;
    'max-dates'?: string;
    months?: string;
    presets?: string;
    labels?: string;
  },
  IntlDatepickerElement
>;

// React 19 types (and the automatic JSX runtime) read React.JSX.
declare module 'react' {
  namespace JSX {
    interface IntrinsicElements {
      'intl-datepicker': IntlDatepickerIntrinsicProps;
    }
  }
}

// React 17/18 types with the classic runtime read the global JSX namespace.
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'intl-datepicker': IntlDatepickerIntrinsicProps;
    }
  }
}
