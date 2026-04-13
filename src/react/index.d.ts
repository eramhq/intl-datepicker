import { CalendarDate } from '@internationalized/date';
import type * as React from 'react';
import type {
  DatepickerType,
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
 * underlying custom element automatically.
 */
export interface IntlDatepickerProps extends React.HTMLAttributes<IntlDatepickerElement> {
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

  // JS-only properties (passed via property setter, not attribute)
  mapDays?: MapDaysFn | null;
  disabledDatesFilter?: DisabledDatesFilterFn | null;
  /** Alias for `disabledDatesFilter`. Will be removed in v0.2 — prefer `disabledDatesFilter`. */
  isDateDisabled?: DisabledDatesFilterFn | null;

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

// JSX augmentation for React users using the raw web component
declare global {
  namespace JSX {
    interface IntrinsicElements {
      'intl-datepicker': React.DetailedHTMLProps<
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
    }
  }
}
