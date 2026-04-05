import { CalendarDate } from '@internationalized/date';
import type {
  DatepickerType,
  SelectDetail,
  NavigateDetail,
  MapDaysFn,
  RangePreset,
  DisabledDatesFilterFn,
  IntlDatepickerElement,
} from '../intl-datepicker.js';

export interface IntlDatepickerProps {
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
  presets?: string;

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
