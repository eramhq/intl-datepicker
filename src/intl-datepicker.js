import { toCalendar, startOfWeek, endOfWeek, endOfMonth, isSameDay } from '@internationalized/date';
import { getStyles, getStylesText, calendarIcon, clearIcon } from './styles.js';
import { resolveLocale, isRTL, getMinimalDays, isCalendarRegistered } from './core/locale.js';
import { calendarDateToNative, resolveRelativeDate, escAttr, parseJSONAttr } from './utils/common.js';
import {
  createState, updateState, selectDate, moveFocus, refreshToday, viewOf, firstOfView,
  goToMonth, toISO, isDateDisabled, isInRange, isRangeEdge, getHoveredWeekBounds, rangeError, hasPendingStart,
  parseTypedValue, parseValueForType, parseISOToCalendar, serializeValueForType, getPeriodBounds, getNavLimits,
} from './core/state.js';
import { generateMonthGrid } from './core/calendar-grid.js';
import { renderHeader, renderNavButton, renderYearGrid, renderMonthGrid as renderMonthPicker } from './core/calendar-header.js';
import { formatDateShort, formatRange, formatMonthYear, getGregorianEquivalent } from './utils/format.js';
import { positionCalendar } from './core/positioning.js';
import { parseInput, getLocaleSegmentOrder } from './core/date-input.js';
import { resolveLabels, fillLabel, fillPlural } from './core/labels.js';

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Track the currently open instance to close others
let openInstance = null;

const VALID_TYPES = ['date', 'range', 'week', 'multiple', 'month', 'year'];
const VALID_CAPTION_LAYOUTS = new Set(['dropdown', 'dropdown-months', 'dropdown-years']);
const CLOSE_DELAY = 150;

function parsePositiveInt(val) {
  const n = parseInt(val);
  return n > 0 ? n : null;
}

function toPlainDate(d) {
  return { year: d.year, month: d.month, day: d.day };
}

// Popover API (top layer) — lifts the panel above transformed ancestors,
// overflow clipping and z-index stacking. Checked lazily for SSR safety.
const supportsPopover = () => typeof HTMLElement !== 'undefined'
  && Object.prototype.hasOwnProperty.call(HTMLElement.prototype, 'popover');

// SSR-safe base: in Node/SSR environments HTMLElement is undefined.
// We never instantiate the class server-side (the register() guard skips
// customElements.define), so a noop base is sufficient to allow `import`.
const HTMLElementBase = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

/**
 * Multi-calendar date picker. Values are time-zone-free ISO strings.
 *
 * @tag intl-datepicker
 * @summary Form-associated date, range, week, multiple, month and year picker for 14 calendar systems.
 *
 * @attr {string} calendar - Calendar system (`gregory`, `persian`, `islamic`, `hebrew`, …). Default `gregory`.
 * @attr {string} locale - BCP 47 locale. Defaults to `<html lang>`, then the browser language.
 * @attr {string} numerals - Numbering system override, e.g. `latn` or `arab`.
 * @attr {'date'|'range'|'week'|'multiple'|'month'|'year'} type - Picker type. Default `date`.
 * @attr {string} value - Initial value (see the README's "Values & time zones").
 * @attr {string} min - Earliest selectable value, same format as `value`.
 * @attr {string} max - Latest selectable value, same format as `value`.
 * @attr {string} name - Form field name.
 * @attr {string} placeholder - Placeholder for the built-in input.
 * @attr {string} for - id of an external `<input>` to bind instead of the built-in one.
 * @attr {boolean} inline - Always show the calendar, without a popup.
 * @attr {boolean} disabled - Disable the picker.
 * @attr {boolean} readonly - Show the value but prevent changes.
 * @attr {boolean} required - Require a value for form submission.
 * @attr {boolean} show-alternate - Show the Gregorian equivalent under the calendar.
 * @attr {string} disabled-dates - JSON array of ISO dates (`"2026-01-01"`) or inclusive ranges (`"2026-01-01/2026-01-10"`) that can't be selected.
 * @attr {boolean} disable-weekends - Disable the locale's weekend days.
 * @attr {string} disabled-days-of-week - Weekdays that can't be selected: `"5,6"` (0 = Sunday) or `"fri,sat"`.
 * @attr {boolean} disable-past - Disable days before today (this week / month / year for those types).
 * @attr {boolean} disable-future - Disable days after today (this week / month / year for those types).
 * @attr {string} first-day-of-week - First day of the week: `0`–`6` (0 = Sunday) or `sun`…`sat`. Defaults to the locale's.
 * @attr {number} min-nights - Minimum range length in nights (end − start) for `type="range"`. `1` forbids a same-day range.
 * @attr {number} max-nights - Maximum range length in nights for `type="range"`.
 * @attr {''|'days'|'nights'} exclude-disabled - Ranges can't contain disabled days. `"nights"` lets the end land on the first disabled day (hotel check-out).
 * @attr {string} date-separator - Display separator for `type="multiple"`. Default `, `.
 * @attr {number} max-dates - Maximum selections for `type="multiple"`.
 * @attr {boolean} sort-dates - Keep `type="multiple"` selections sorted.
 * @attr {number} months - Number of months shown side by side (1–3).
 * @attr {string} presets - JSON array of `{label, value}` range presets.
 * @attr {boolean} no-animation - Disable open/close animation.
 * @attr {boolean} show-week-numbers - Show locale week numbers.
 * @attr {boolean} hide-outside-days - Hide days from adjacent months.
 * @attr {boolean} allow-input - Let users type a date into the input.
 * @attr {string} labels - JSON object overriding UI strings.
 * @attr {'auto'|'YMD'|'DMY'|'MDY'} date-format - Segment order for typed input.
 * @attr {'button'|'dropdown'|'dropdown-months'|'dropdown-years'} caption-layout - Header layout.
 * @attr {boolean} fixed-weeks - Always render six weeks.
 *
 * @fires intl-select - A date was picked by the user. `detail` is a SelectDetail.
 * @fires intl-change - The value changed. `detail` is a SelectDetail.
 * @fires intl-navigate - The visible month changed. `detail` is `{year, month, direction, start, end}`.
 * @fires intl-open - The popup is about to open. Cancelable.
 * @fires intl-close - The popup is about to close. Cancelable.
 *
 * @slot input - Optional custom `<input>` replacing the built-in one.
 *
 * @csspart input-wrapper - Wrapper around the input, clear button and icon.
 * @csspart input - The built-in text input.
 * @csspart hint - Format hint shown with `allow-input`.
 * @csspart error - Error message for unparseable typed input.
 * @csspart calendar - The calendar panel.
 * @csspart header - Month navigation header.
 * @csspart header-title - Month/year title.
 * @csspart nav-prev - Previous-month button.
 * @csspart nav-next - Next-month button.
 * @csspart month-dropdown - Month `<select>` in dropdown caption layouts.
 * @csspart year-dropdown - Year `<select>` in dropdown caption layouts.
 * @csspart weekday - Weekday column header.
 * @csspart day - Day button.
 * @csspart month-cell - Month button in the month view.
 * @csspart year-cell - Year button in the year view.
 * @csspart footer - Footer with Today and Clear.
 * @csspart today-btn - Today button.
 * @csspart clear-btn - Clear button in the footer.
 * @csspart alternate - Gregorian equivalent line (`show-alternate`).
 * @csspart presets - Range presets sidebar.
 * @csspart range-hint - Minimum/maximum length shown while a range start is pending.
 *
 * @cssprop --idp-primary - Accent color.
 * @cssprop --idp-bg - Panel and input background.
 * @cssprop --idp-text - Text color.
 * @cssprop --idp-border - Border color.
 * @cssprop --idp-hover - Hover background.
 * @cssprop --idp-selected-bg - Selected day background.
 * @cssprop --idp-selected-text - Selected day text.
 * @cssprop --idp-today-border - Today ring color.
 * @cssprop --idp-disabled - Disabled day color.
 * @cssprop --idp-range-bg - In-range background.
 * @cssprop --idp-range-text - In-range text.
 * @cssprop --idp-muted - Secondary text.
 * @cssprop --idp-error - Error color for invalid typed input.
 * @cssprop --idp-radius - Corner radius.
 * @cssprop --idp-day-size - Day cell size (minimum 24px).
 * @cssprop --idp-font-family - Font family.
 * @cssprop --idp-font-size - Base font size.
 * @cssprop --idp-z-index - Popup z-index when the Popover API is unavailable.
 * @cssprop --idp-input-min-width - Minimum input width.
 * @cssprop --idp-calendar-min-width - Minimum calendar width.
 */
class IntlDatepicker extends HTMLElementBase {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'calendar', 'locale', 'numerals', 'value', 'type', 'min', 'max',
      'for', 'inline', 'disabled', 'readonly', 'required',
      'placeholder', 'show-alternate', 'name',
      'disabled-dates', 'disable-weekends',
      'date-separator', 'max-dates', 'sort-dates',
      'months', 'presets', 'no-animation',
      'show-week-numbers', 'hide-outside-days', 'allow-input',
      'labels', 'date-format',
      'caption-layout', 'fixed-weeks',
      'first-day-of-week', 'disabled-days-of-week', 'disable-past', 'disable-future',
      'min-nights', 'max-nights', 'exclude-disabled',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });

    const sheet = getStyles();
    if (sheet && 'adoptedStyleSheets' in this.shadowRoot) {
      this.shadowRoot.adoptedStyleSheets = [sheet];
    } else {
      // Older Safari (<16.4) lacks adoptedStyleSheets — fallback to <style>
      const styleEl = document.createElement('style');
      styleEl.textContent = getStylesText();
      this.shadowRoot.appendChild(styleEl);
    }

    try {
      this._internals = this.attachInternals();
    } catch {
      this._internals = null;
    }

    this._state = null;
    this._view = 'days'; // 'days' | 'months' | 'years'
    this._externalInput = null;
    this._slottedInput = null;
    this._positionCleanup = null;
    this._boundClose = this._onOutsideClick.bind(this);
    this._boundKeydown = this._onDocumentKeydown.bind(this);
    this._boundSlottedClick = this._onSlottedClick.bind(this);
    this._boundExternalClick = null;
    this._boundExternalFocus = null;
    this._userLabelsFromAttr = null;
    this._userLabelsFromProp = null;
    this._eventsBound = false;
    this._formDisabled = false;
    this._inputError = '';
    this._pendingValue = undefined;
    this._pickerFrom = null; // month left for the month/year views
  }

  connectedCallback() {
    // Reconnecting (element moved in the DOM) keeps the existing state, so a
    // value set from JS survives the move.
    if (!this._state) {
      this._initState();
      if (this._pendingValue !== undefined) {
        const pending = this._pendingValue;
        this._pendingValue = undefined;
        this._setValue(pending, false);
      }
    }
    this._render();
    this._bindEvents();
    this._setupExternalInput();
    this._updateFormValue();
    this._updateDir();
    this._syncAccessibleName();
    // <label for> elements later in the document aren't parsed yet.
    requestAnimationFrame(() => this._syncAccessibleName());
  }

  disconnectedCallback() {
    this._destroyPositioning();
    this._cleanupExternalInput();
    document.removeEventListener('click', this._boundClose);
    document.removeEventListener('keydown', this._boundKeydown);
    if (openInstance === this) openInstance = null;
    if (this._state?.isOpen && !this._state.inline) {
      this._state = updateState(this._state, { isOpen: false });
      this._hidePanel();
    }
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._state) return;

    switch (name) {
      case 'calendar':
      case 'locale':
      case 'numerals':
      case 'type':
      case 'min':
      case 'max':
      case 'disabled-dates':
      case 'disable-weekends':
      case 'first-day-of-week':
      case 'disabled-days-of-week':
      case 'disable-past':
      case 'disable-future':
      case 'min-nights':
      case 'max-nights':
      case 'exclude-disabled': {
        // Re-derive state but keep the current selection (including a pending
        // range start), the open state and, for the same type, the visible
        // month and view, so an availability update doesn't jump the calendar.
        // Month/year selections carry over as a plain ISO date, which snaps
        // to the right period in whatever calendar is now active.
        const prev = this._state;
        const { type, selectedDate } = prev;
        const keep = (type === 'month' || type === 'year') && selectedDate ? toISO(selectedDate) : this.value;
        const view = this._view;
        this._initState(keep);
        const cal = this._state.calendar;
        this._state = updateState(this._state, { isOpen: prev.isOpen });
        if (this._state.type === type) {
          this._view = view;
          this._state = updateState(this._state, {
            focusedDate: toCalendar(prev.focusedDate, cal),
            ...viewOf(toCalendar(firstOfView(prev), cal)),
          });
        }
        this._updateDir();
        this._render();
        this._updateFormValue();
        this._updateExternalInput();
        break;
      }
      case 'value':
        this._setValue(newVal, false);
        break;
      case 'inline':
        this._setInline(this.hasAttribute('inline'));
        break;
      case 'disabled':
      case 'readonly':
        if (this._isDisabled() || this.hasAttribute('readonly')) this.close();
        this._render();
        break;
      case 'fixed-weeks':
        this._state = updateState(this._state, { fixedWeeks: this.hasAttribute('fixed-weeks') });
        this._render();
        break;
      case 'allow-input':
        this._inputError = '';
        this._render();
        this._updateFormValue();
        break;
      case 'for':
        this._setupExternalInput();
        this._render();
        this._updateFormValue();
        break;
      case 'required':
        this._render();
        this._updateFormValue();
        break;
      case 'max-dates': {
        this._state = updateState(this._state, { maxDates: parsePositiveInt(newVal) });
        this._render();
        this._updateFormValue();
        break;
      }
      case 'sort-dates': {
        const sorting = this.hasAttribute('sort-dates');
        const changes = { sortDates: sorting };
        if (sorting && this._state.selectedDates.length > 1) {
          changes.selectedDates = [...this._state.selectedDates].sort((a, b) => a.compare(b));
        }
        this._state = updateState(this._state, changes);
        this._render();
        this._updateFormValue();
        break;
      }
      case 'presets':
        this._parsedPresets = parseJSONAttr(newVal, Array.isArray);
        this._render();
        break;
      case 'labels':
        this._userLabelsFromAttr = parseJSONAttr(newVal, isPlainObject);
        this._applyLabels();
        break;
      case 'date-separator':
        this._render();
        this._updateFormValue();
        this._updateExternalInput();
        break;
      case 'placeholder':
      case 'show-alternate':
      case 'show-week-numbers':
      case 'hide-outside-days':
      case 'months':
      case 'no-animation':
      case 'caption-layout':
      case 'date-format':
        this._render();
        break;
    }
  }

  // Property setters take precedence over the attribute on a per-key basis,
  // so attribute-default + property-override merge cleanly.
  _mergedUserLabels() {
    const fromAttr = this._userLabelsFromAttr;
    const fromProp = this._userLabelsFromProp;
    if (!fromAttr && !fromProp) return null;
    return { ...(fromAttr || {}), ...(fromProp || {}) };
  }

  _applyLabels() {
    if (!this._state) return;
    this._state = updateState(this._state, {
      labels: resolveLabels(this._state.locale, this._mergedUserLabels()),
    });
    this._render();
  }

  // --- Public API ---

  get value() {
    if (!this._state) return this._pendingValue ?? this.getAttribute('value') ?? '';
    return serializeValueForType(this._state);
  }

  set value(v) {
    this._setValue(v, true);
  }

  get valueAsDate() {
    const s = this._state;
    if (!s || !this.value) return null;
    if (s.type === 'multiple' || s.type === 'range') return null;
    if (s.type === 'week') return calendarDateToNative(parseTypedValue(this.value, 'week', s.calendar));
    return calendarDateToNative(s.selectedDate);
  }

  get calendarValue() {
    return this._state?.selectedDate || null;
  }

  get displayValue() {
    const s = this._state;
    if (!s) return '';
    const fmt = this._fmt;
    if (s.type === 'range' || s.type === 'week') {
      return formatRange(s.rangeStart, s.rangeEnd, fmt);
    }
    if (s.type === 'multiple') {
      const sep = this.getAttribute('date-separator') || ', ';
      return (s.selectedDates || []).map(d => formatDateShort(d, fmt)).join(sep);
    }
    return s.selectedDate ? this._formatForType(s.selectedDate) : '';
  }

  get rangeStart() {
    return this._state?.rangeStart ? toISO(this._state.rangeStart) : null;
  }

  get rangeEnd() {
    return this._state?.rangeEnd ? toISO(this._state.rangeEnd) : null;
  }

  // Value strings come from serializeValueForType (via the `value` getter) so
  // the two cannot drift. This method adds the structured sub-objects
  // (calendar/start/end/dates) and the `formatted` display string on top.
  _buildDetail() {
    const s = this._state;
    const t = s?.type || 'date';
    const base = { type: t, value: this.value, formatted: this.displayValue };

    if (t === 'multiple') {
      return { ...base, dates: (s?.selectedDates || []).map(toPlainDate) };
    }
    if (t === 'range' || t === 'week') {
      const complete = t === 'range' || s?.rangeEnd;
      return {
        ...base,
        start: complete && s?.rangeStart ? toPlainDate(s.rangeStart) : null,
        end: complete && s?.rangeEnd ? toPlainDate(s.rangeEnd) : null,
      };
    }
    const d = s?.selectedDate;
    if (t === 'month' || t === 'year') {
      if (!d) return { ...base, calendar: null, start: null, end: null };
      // `calendar` carries native numbers (payroll keys); start/end are
      // Gregorian ISO bounds of the period (range queries).
      const { start, end } = getPeriodBounds(d, t);
      return {
        ...base,
        calendar: t === 'month' ? { year: d.year, month: d.month } : { year: d.year },
        start: toISO(start),
        end: toISO(end),
      };
    }
    return { ...base, calendar: d ? toPlainDate(d) : null };
  }

  getValue() {
    const d = this._buildDetail();
    return d.value ? d : null;
  }

  setValue(value) {
    this._setValue(value, true);
  }

  clear() {
    this._setValue('', true);
  }

  open() {
    if (!this._state || this._state.inline || this._isDisabled()) return;
    this._openCalendar({ focus: true });
  }

  close() {
    if (!this._state || this._state.inline) return;
    this._closeCalendar();
  }

  goToMonth(year, month) {
    this._state = goToMonth(this._state, year, month);
    this._view = 'days';
    this._renderCalendarContent();
  }

  get selectedDates() {
    return this._state?.selectedDates || [];
  }

  get mapDays() {
    return this._mapDays || null;
  }

  set mapDays(fn) {
    this._mapDays = typeof fn === 'function' ? fn : null;
    if (this._state) this._renderCalendarContent();
  }

  get presets() {
    return this._presets || null;
  }

  // Strings are parsed as JSON, so frameworks that assign properties
  // (React 19, Vue) can pass the attribute form too.
  set presets(val) {
    this._presets = typeof val === 'string' ? parseJSONAttr(val, Array.isArray) : Array.isArray(val) ? val : null;
    if (this._state) this._render();
  }

  get disabledDatesFilter() {
    return this._disabledDatesFilter || null;
  }

  set disabledDatesFilter(fn) {
    this._disabledDatesFilter = typeof fn === 'function' ? fn : null;
    if (this._state) {
      this._state = updateState(this._state, { disabledDatesFilter: this._disabledDatesFilter });
      this._render();
      this._updateFormValue();
    }
  }

  get labels() {
    return this._state ? this._state.labels : resolveLabels('en', null);
  }

  set labels(val) {
    this._userLabelsFromProp = typeof val === 'string' ? parseJSONAttr(val, isPlainObject) : isPlainObject(val) ? val : null;
    this._applyLabels();
  }

  get numerals() {
    return this.getAttribute('numerals');
  }

  set numerals(val) {
    if (val) this.setAttribute('numerals', val);
    else this.removeAttribute('numerals');
  }

  get captionLayout() {
    return this._getCaptionLayout();
  }

  set captionLayout(val) {
    if (val && val !== 'button') this.setAttribute('caption-layout', val);
    else this.removeAttribute('caption-layout');
  }

  get fixedWeeks() {
    return this.hasAttribute('fixed-weeks');
  }

  set fixedWeeks(val) {
    if (val) this.setAttribute('fixed-weeks', '');
    else this.removeAttribute('fixed-weeks');
  }

  // --- Form callbacks ---

  get form() { return this._internals?.form; }
  get name() { return this.getAttribute('name'); }
  // Setters reflect to attributes so frameworks that assign properties
  // (React 19 does for any key `in` the element) behave like setAttribute.
  set name(v) { this._reflect('name', v); }
  /** The picker type (`date`, `range`, …), like `<input>.type`. */
  get type() {
    const t = this.getAttribute('type');
    return VALID_TYPES.includes(t) ? t : 'date';
  }
  set type(v) { this._reflect('type', v); }
  get validity() { return this._internals?.validity; }
  get validationMessage() { return this._internals?.validationMessage; }
  get willValidate() { return this._internals?.willValidate; }
  checkValidity() { return this._internals?.checkValidity(); }
  reportValidity() { return this._internals?.reportValidity(); }

  formResetCallback() {
    this._inputError = '';
    this._setValue(this.getAttribute('value') || '', false);
  }

  formStateRestoreCallback(state) {
    if (state) this._setValue(state, false);
  }

  formDisabledCallback(disabled) {
    this._formDisabled = disabled;
    if (!this._state) return;
    if (disabled) this.close();
    this._render();
  }

  // --- Private ---

  _reflect(attr, v) {
    if (v == null || v === false || v === '') this.removeAttribute(attr);
    else this.setAttribute(attr, String(v));
  }

  _isDisabled() {
    return this.hasAttribute('disabled') || this._formDisabled;
  }

  _initState(valueOverride) {
    let calendarId = this.getAttribute('calendar') || 'gregory';
    if (!isCalendarRegistered(calendarId)) {
      console.warn(`Calendar "${calendarId}" not registered. Import 'intl-datepicker/calendars/${calendarId}' to enable it.`);
      calendarId = 'gregory';
    }
    const locale = resolveLocale(this.getAttribute('locale'));

    const disabledDates = parseJSONAttr(this.getAttribute('disabled-dates'), Array.isArray);
    const maxDates = parsePositiveInt(this.getAttribute('max-dates'));

    const type = this.getAttribute('type') || 'date';
    const isValidType = VALID_TYPES.includes(type);
    if (!isValidType) {
      console.warn(`[intl-datepicker] Unknown type="${type}". Valid types: ${VALID_TYPES.join(', ')}. Falling back to "date".`);
    }

    const numerals = this.getAttribute('numerals') || null;

    this._userLabelsFromAttr = parseJSONAttr(this.getAttribute('labels'), isPlainObject);
    const userLabels = this._mergedUserLabels();
    this._minimalDays = getMinimalDays(locale);
    const has = (attr) => this.hasAttribute(attr);

    const value = valueOverride ?? this.getAttribute('value');
    this._state = createState({
      calendarId,
      locale,
      numerals,
      value: value || null,
      type: isValidType ? type : 'date',
      min: this.getAttribute('min') || null,
      max: this.getAttribute('max') || null,
      inline: this.hasAttribute('inline'),
      disabledDates,
      disabledDatesFilter: this._disabledDatesFilter || null,
      disableWeekends: has('disable-weekends'),
      disabledDaysOfWeek: this.getAttribute('disabled-days-of-week'),
      disablePast: has('disable-past'),
      disableFuture: has('disable-future'),
      firstDayOfWeek: this.getAttribute('first-day-of-week'),
      minNights: this.getAttribute('min-nights'),
      maxNights: this.getAttribute('max-nights'),
      excludeDisabled: this.getAttribute('exclude-disabled'),
      isRTL: isRTL(locale),
      maxDates,
      sortDates: has('sort-dates'),
      fixedWeeks: has('fixed-weeks'),
      labels: resolveLabels(locale, userLabels),
    });
    // Formatters depend only on locale/calendar/numerals/first day: built
    // once per state instead of per cell / per render.
    this._fmt = this._state._fmt;
    // Inline month/year pickers never go through _openCalendar.
    this._view = this._initialView();
    if (value && !this.value && valueOverride === undefined) this._warnBadValue(value);

    this._parsedPresets = parseJSONAttr(this.getAttribute('presets'), Array.isArray);
  }

  _warnBadValue(value) {
    const { type, calendarId } = this._state;
    const hint = (type === 'month' || type === 'year') && calendarId !== 'gregory'
      ? ` For calendar="${calendarId}", use an ISO date such as "2024-07-22[u-ca=${calendarId}]".`
      : '';
    console.warn(`[intl-datepicker] Ignoring value "${value}" for type="${type}".${hint}`);
  }

  _setValue(raw, emitEvent) {
    if (!this._state) {
      this._pendingValue = raw ?? '';
      return;
    }
    const s = this._state;
    const prev = this.value;
    const parsed = parseValueForType(raw || '', s.type, s.calendar, s.locale, s.firstDayOfWeek);
    if (!parsed) {
      this._warnBadValue(raw);
      return;
    }

    // Like a native <input>, a parseable value is kept even on a disabled or
    // out-of-range date: validity reports it instead of the value vanishing.
    let { selectedDate, rangeStart, rangeEnd, selectedDates } = parsed;
    if (s.type === 'multiple') {
      // Keep the first max-dates entries as given, then sort.
      if (s.maxDates) selectedDates = selectedDates.slice(0, s.maxDates);
      if (s.sortDates) selectedDates.sort((a, b) => a.compare(b));
    }

    const changes = { selectedDate, rangeStart, rangeEnd, selectedDates, hoveredDate: null };
    const focus = selectedDate || rangeStart || selectedDates[0];
    if (focus) Object.assign(changes, { focusedDate: focus, ...viewOf(focus) });
    this._state = updateState(s, changes);
    this._inputError = '';

    this._render();
    this._updateFormValue();
    this._updateExternalInput();

    // Like native inputs, re-setting the same value is a no-op (this also
    // keeps controlled React 19 usage from double-firing).
    if (emitEvent && this.value !== prev) {
      this._emit('intl-change', this._buildDetail());
    }
  }

  _updateFormValue() {
    if (!this._internals || !this._state) return;
    const val = this.value;
    this._internals.setFormValue(val || null);

    // The validity anchor must live in this element's (shadow-including) tree.
    const anchor = this._slottedInput
      || (this._externalInput || this.hasAttribute('for') ? undefined : this._inputEl);
    const s = this._state;
    const { labels, min, max, type } = s;
    const fail = (flag, message) => this._internals.setValidity({ [flag]: true }, message, anchor);

    if (this._inputError) return fail('badInput', this._inputError);

    if (this.hasAttribute('required')) {
      if (!val) return fail('valueMissing', labels.pleaseSelectDate);
      // A range with only a start isn't a complete value.
      if (type === 'range' && !s.rangeEnd) return fail('valueMissing', labels.rangeIncomplete);
    }

    const dates = this._getValueDates();
    if (min && dates.some(d => d.compare(min) < 0)) {
      return fail('rangeUnderflow', fillLabel(labels.dateTooEarly, { date: this._formatForType(min) }));
    }
    if (max && dates.some(d => d.compare(max) > 0)) {
      return fail('rangeOverflow', fillLabel(labels.dateTooLate, { date: this._formatForType(max) }));
    }

    // Per-day rules apply to dates; week/month/year pick whole periods.
    const error = type === 'range' && s.rangeEnd
      ? rangeError(s, s.rangeStart, s.rangeEnd)
      : (type === 'date' || type === 'multiple' || type === 'range') && dates.some(d => isDateDisabled(s, d)) && 'unavailable';
    if (error) {
      return fail(error === 'short' ? 'tooShort' : error === 'long' ? 'tooLong' : 'customError', this._reason(error));
    }

    this._internals.setValidity({});
  }

  // Message for a rangeError() reason, or a single unavailable date.
  _reason(error) {
    const { labels, minNights, maxNights, type } = this._state;
    if (error === 'short' || error === 'long') {
      return fillLabel(error === 'short' ? labels.rangeTooShort : labels.rangeTooLong, {
        nights: this._formatNights(error === 'short' ? minNights : maxNights),
      });
    }
    return type === 'range' ? labels.rangeUnavailable : labels.dateUnavailable;
  }

  // Why `date` can't be picked now: a message, or '' when it can.
  _refusal(date) {
    const s = this._state;
    if (hasPendingStart(s)) {
      const error = rangeError(s, s.rangeStart, date);
      return error && !isSameDay(date, s.rangeStart) ? this._reason(error) : '';
    }
    return this._isSelectable(date) ? '' : this._state.labels.dateUnavailable;
  }

  _formatNights(n) {
    return fillPlural(this._state.labels.nights, n, this._fmt);
  }

  // "Minimum stay: 2 nights · Maximum: 28 nights" while a range start is
  // pending, or ''.
  _rangeHint() {
    const { minNights, maxNights, labels } = this._state;
    if (!hasPendingStart(this._state)) return '';
    const parts = [];
    if (minNights) parts.push(fillLabel(labels.minNightsHint, { nights: this._formatNights(minNights) }));
    if (maxNights != null) parts.push(fillLabel(labels.maxNightsHint, { nights: this._formatNights(maxNights) }));
    return parts.join(' · ');
  }

  _getValueDates() {
    const s = this._state;
    if (s.type === 'multiple') return s.selectedDates || [];
    if (s.type === 'range' || s.type === 'week') return [s.rangeStart, s.rangeEnd].filter(Boolean);
    return s.selectedDate ? [s.selectedDate] : [];
  }

  // --- Rendering ---
  //
  // The shadow root holds a persistent skeleton (input, hint, error, panel,
  // live region). Renders update those nodes in place and only rebuild the
  // panel's contents, so the live region keeps announcing, the inner input
  // keeps focus and labels, and the popover keeps its top-layer slot.

  _ensureSkeleton() {
    if (this._calendarEl) return;
    const tpl = document.createElement('template');
    tpl.innerHTML = `
      <div class="idp-input-wrapper" part="input-wrapper">
        <slot name="input"><input class="idp-input" part="input" type="text"
          role="combobox" aria-haspopup="dialog" aria-expanded="false" aria-controls="idp-calendar"
          autocomplete="off" /></slot>
        <button class="idp-clear-btn" data-action="clear" type="button" hidden>${clearIcon}</button>
        ${calendarIcon}
      </div>
      <div class="idp-hint" part="hint" id="idp-hint" hidden></div>
      <div class="idp-error" part="error" id="idp-error" hidden></div>
      <div class="idp-calendar" part="calendar" id="idp-calendar" role="dialog" hidden></div>
      <div class="idp-sr-only" id="idp-live" aria-live="polite" aria-atomic="true"></div>
    `;
    this.shadowRoot.appendChild(tpl.content);
    const $ = (sel) => this.shadowRoot.querySelector(sel);
    this._wrapperEl = $('.idp-input-wrapper');
    this._inputEl = $('.idp-input');
    this._clearBtn = $('.idp-clear-btn');
    this._hintEl = $('#idp-hint');
    this._errorEl = $('#idp-error');
    this._calendarEl = $('#idp-calendar');
    this._liveEl = $('#idp-live');
  }

  _render() {
    if (!this._state) return;
    this._refreshToday();
    this._ensureSkeleton();
    this._syncInput();
    this._renderCalendar();
  }

  _syncInput() {
    const s = this._state;
    const input = this._inputEl;
    const hasFor = this.hasAttribute('for');
    const allowInput = this.hasAttribute('allow-input');
    const disabled = this._isDisabled();
    const readonly = this.hasAttribute('readonly');
    const display = this.displayValue;

    this._wrapperEl.hidden = hasFor;
    // Keep the user's unparseable text visible next to its error message.
    if (!this._inputError && input.value !== display) input.value = display;
    input.placeholder = this.getAttribute('placeholder') || '';
    input.readOnly = !allowInput || readonly;
    input.disabled = disabled;
    input.setAttribute('aria-expanded', String(!!s.isOpen && !s.inline));
    this._toggleAttr(input, 'aria-required', this.hasAttribute('required') ? 'true' : null);
    this._toggleAttr(input, 'aria-invalid', this._inputError ? 'true' : null);
    this._toggleAttr(input, 'inputmode', allowInput ? 'numeric' : null);
    this._clearBtn.hidden = !display || disabled || readonly;
    this._clearBtn.setAttribute('aria-label', s.labels.clearDate);

    const showHint = allowInput && !hasFor;
    this._hintEl.hidden = !showHint;
    if (showHint) this._hintEl.textContent = this._formatHint();
    this._errorEl.hidden = !this._inputError;
    this._errorEl.textContent = this._inputError;
    const describedBy = [showHint && 'idp-hint', this._inputError && 'idp-error'].filter(Boolean).join(' ');
    this._toggleAttr(input, 'aria-describedby', describedBy || null);
  }

  // A calendar left open past midnight: move "today" and the bounds that
  // disable-past/-future derive from it. Returns whether anything changed.
  _refreshToday() {
    const prev = this._state;
    this._state = refreshToday(prev);
    if (this._state === prev) return false;
    // The bounds moved, so the current value may have become invalid.
    this._updateFormValue();
    return true;
  }

  _toggleAttr(el, name, value) {
    if (value == null) el.removeAttribute(name);
    else if (el.getAttribute(name) !== value) el.setAttribute(name, value);
  }

  // A `<label for>` pointing at the host doesn't reach the inner input across
  // the shadow boundary, so mirror its text (or the host's aria-label).
  _syncAccessibleName() {
    const input = this._inputEl;
    if (!input) return;
    let name = this.getAttribute('aria-label') || '';
    if (!name) {
      try {
        const labels = this._internals?.labels;
        if (labels) name = Array.from(labels, l => l.textContent.trim()).filter(Boolean).join(' ');
      } catch { /* ElementInternals.labels unsupported */ }
    }
    this._toggleAttr(input, 'aria-label', name || null);
  }

  // Example pattern for typed input, from the locale's own part order and
  // separators, e.g. "MM/DD/YYYY" (en-US) or "YYYY/MM/DD" (fa-IR).
  _formatHint() {
    const { labels } = this._state;
    const { format, example } = this._getInputFormat();
    return fillLabel(labels.formatHint, { format, example });
  }

  _getInputFormat() {
    const s = this._state;
    const sampleDate = s.today.set({ day: Math.min(25, s.calendar.getDaysInMonth(s.today)) });
    const tokens = { year: 'YYYY', month: 'MM', day: 'DD' };
    let format = '';
    const forced = this.getAttribute('date-format');
    try {
      const parts = this._fmt.short.formatToParts(calendarDateToNative(sampleDate));
      const seq = parts.filter(p => p.type in tokens);
      const sep = parts.find(p => p.type === 'literal')?.value.trim() || '/';
      const order = forced && forced !== 'auto' ? forced : getLocaleSegmentOrder(s.locale, s.calendarId);
      format = seq.length === 3
        ? order.split('').map(c => tokens[{ Y: 'year', M: 'month', D: 'day' }[c]]).join(sep)
        : 'YYYY/MM/DD';
    } catch {
      format = 'YYYY/MM/DD';
    }
    return { format, example: formatDateShort(sampleDate, this._fmt) };
  }

  _renderCalendar() {
    const s = this._state;
    const cal = this._calendarEl;
    const isInline = s.inline;
    const presetsHTML = this._renderPresets();

    this._applyPopoverMode();
    cal.classList.toggle('idp-has-presets', presetsHTML !== '');
    // An inline calendar is part of the page, not a dialog.
    cal.setAttribute('role', isInline ? 'group' : 'dialog');
    this._toggleAttr(cal, 'aria-modal', isInline ? null : 'true');
    cal.setAttribute('aria-label', s.labels.datePicker);
    if (isInline || s.isOpen) cal.hidden = false;
    else if (!this._animatingClose) cal.hidden = true;

    cal.innerHTML = `${presetsHTML}<div class="idp-calendar-main">${this._renderCalendarInner()}</div>`;
  }

  _applyPopoverMode() {
    if (!supportsPopover()) return;
    const cal = this._calendarEl;
    const want = !this._state.inline;
    if (want && cal.getAttribute('popover') !== 'manual') cal.setAttribute('popover', 'manual');
    else if (!want && cal.hasAttribute('popover')) cal.removeAttribute('popover');
  }

  _showPanel() {
    const cal = this._calendarEl;
    cal.hidden = false;
    if (cal.hasAttribute('popover')) {
      try { if (!cal.matches(':popover-open')) cal.showPopover(); } catch { /* not connected */ }
    }
  }

  _hidePanel() {
    const cal = this._calendarEl;
    if (!cal) return;
    if (cal.hasAttribute('popover')) {
      try { if (cal.matches(':popover-open')) cal.hidePopover(); } catch { /* already hidden */ }
    }
    cal.hidden = true;
  }

  _getCaptionLayout() {
    const val = this.getAttribute('caption-layout');
    return VALID_CAPTION_LAYOUTS.has(val) ? val : 'button';
  }

  _renderCalendarInner() {
    const monthCount = this._getMonthCount();
    const captionLayout = this._getCaptionLayout();
    const footer = this._renderFooter();

    if (this._view === 'years' || this._view === 'months' || monthCount <= 1) {
      let inner = renderHeader(this._state, this._view, captionLayout);
      if (this._view === 'years') inner += renderYearGrid(this._state);
      else if (this._view === 'months') inner += renderMonthPicker(this._state);
      else inner += this._renderDayGrid(this._state, 'idp-title-0');
      return inner + footer;
    }

    // Multi-month view
    const limits = getNavLimits(this._state, monthCount);
    let inner = '<div class="idp-months-container">';
    for (let i = 0; i < monthCount; i++) {
      const panelState = this._getOffsetState(i);
      const title = formatMonthYear(firstOfView(panelState), this._fmt);
      const placeholder = '<span class="idp-nav-btn" style="visibility:hidden"></span>';
      inner += `<div class="idp-month-panel">
        <div class="idp-header" part="header" role="group">
          ${i === 0 ? renderNavButton('prev', this._state, limits.prev) : placeholder}
          <div class="idp-header-title" part="header-title">
            <span class="idp-header-btn" id="idp-title-${i}">${title}</span>
          </div>
          ${i === monthCount - 1 ? renderNavButton('next', this._state, limits.next) : placeholder}
        </div>
        ${this._renderDayGrid(panelState, `idp-title-${i}`)}
      </div>`;
    }
    return inner + '</div>' + footer;
  }

  _renderFooter() {
    const { labels, selectedDate } = this._state;
    const hint = this._rangeHint();
    let html = `${hint ? `<div class="idp-range-hint" part="range-hint">${escAttr(hint)}</div>` : ''}
      <div class="idp-footer" part="footer">
        <button class="idp-footer-btn" part="today-btn" data-action="today" type="button">${escAttr(labels.today)}</button>
        <button class="idp-footer-btn" part="clear-btn" data-action="clear" type="button">${escAttr(labels.clear)}</button>
      </div>
    `;

    if (this.hasAttribute('show-alternate') && selectedDate) {
      const alt = getGregorianEquivalent(selectedDate, this._fmt);
      html += `<div class="idp-alternate" part="alternate">${alt}</div>`;
    }

    return html;
  }

  _renderPresets() {
    if (this._state.type !== 'range') return '';

    const presets = this._presets || this._parsedPresets;
    if (!presets || presets.length === 0) return '';

    const currentStart = toISO(this._state.rangeStart);
    const currentEnd = toISO(this._state.rangeEnd);

    let html = `<div class="idp-presets" part="presets" role="group" aria-label="${escAttr(this._state.labels.rangePresets)}">`;
    for (const preset of presets) {
      if (!preset.label || !preset.value) continue;
      const resolved = this._resolvePreset(preset.value);
      const isActive = !!resolved && toISO(resolved.start) === currentStart && toISO(resolved.end) === currentEnd;

      html += `<button class="idp-preset-btn${isActive ? ' active' : ''}"
        data-action="apply-preset"
        data-preset-value="${escAttr(preset.value)}"
        aria-pressed="${isActive}"${resolved ? '' : ' aria-disabled="true"'}
        type="button">${escAttr(preset.label)}</button>`;
    }
    html += '</div>';
    return html;
  }

  // The preset's range, or null when it doesn't resolve or breaks the range
  // rules (a preset is never clamped to fit max-nights).
  _resolvePreset(presetValue) {
    try {
      const [startExpr, endExpr] = presetValue.split('/');
      const s = this._state;
      const start = resolveRelativeDate(startExpr, s.calendar, s.min, s.max);
      const end = resolveRelativeDate(endExpr, s.calendar, s.min, s.max);
      if (!start || !end) return null;
      const [a, b] = start.compare(end) <= 0 ? [start, end] : [end, start];
      return rangeError(s, a, b) ? null : { start: a, end: b };
    } catch {
      return null;
    }
  }

  _applyPreset(presetValue) {
    const resolved = this._resolvePreset(presetValue);
    if (!resolved) return;
    const { start, end } = resolved;

    this._state = updateState(this._state, {
      rangeStart: start,
      rangeEnd: end,
      hoveredDate: null,
      focusedDate: start,
      ...viewOf(start),
    });

    this._render();
    this._updateFormValue();
    this._updateExternalInput();
    this._announceSelection();

    const detail = this._buildDetail();
    this._emit('intl-select', detail);
    this._emit('intl-change', detail);
  }

  _getMonthCount() {
    const attr = this.getAttribute('months');
    if (!attr) return 1;
    const n = parseInt(attr);
    return isNaN(n) ? 1 : Math.max(1, Math.min(3, n));
  }

  _getOffsetState(offset) {
    if (offset === 0) return this._state;
    return updateState(this._state, viewOf(firstOfView(this._state, offset)));
  }

  _renderDayGrid(state, titleId) {
    const { labels, type } = this._state;
    const fmt = this._fmt;
    const grid = generateMonthGrid(state);
    const showWeekNumbers = this.hasAttribute('show-week-numbers');
    const hideOutsideDays = this.hasAttribute('hide-outside-days');
    const mapDaysFn = this._mapDays;
    const { rangeStart, rangeEnd } = state;
    const isRangeLike = type === 'range' || type === 'week';

    let html = `<table class="idp-grid" role="grid" aria-labelledby="${titleId}"><thead><tr class="idp-weekdays">`;
    if (showWeekNumbers) {
      html += `<th scope="col" class="idp-weekday idp-week-number-header" abbr="${escAttr(labels.weekNumber)}">#</th>`;
    }
    fmt.weekdaysNarrow.forEach((wd, i) => {
      // abbr for header announcements in cells; the hidden full name because
      // browsers compute the header's own name from its content, not abbr.
      const long = escAttr(fmt.weekdaysLong[i]);
      html += `<th scope="col" class="idp-weekday" part="weekday" abbr="${long}"><span aria-hidden="true">${escAttr(wd)}</span><span class="idp-sr-only">${long}</span></th>`;
    });
    html += '</tr></thead><tbody class="idp-days">';

    for (const week of grid) {
      html += '<tr>';
      if (showWeekNumbers) {
        html += `<th scope="row" class="idp-week-number">${this._formatNumber(this._getWeekNumber(week[0].date))}</th>`;
      }
      for (const cell of week) {
        let mapped = null;
        if (mapDaysFn) {
          try {
            mapped = mapDaysFn({
              date: {
                year: cell.date.year,
                month: cell.date.month,
                day: cell.date.day,
                dayOfWeek: calendarDateToNative(cell.date).getDay(),
                iso: toISO(cell.date),
              },
              isToday: cell.isToday,
              isSelected: cell.isSelected,
              isDisabled: cell.disabled,
              isInRange: cell.inRange,
              isRangeStart: cell.isRangeStart,
              isRangeEnd: cell.isRangeEnd,
              isRangeBlocked: cell.isRangeBlocked,
              isCheckoutOnly: cell.isCheckoutOnly,
              isCurrentMonth: cell.isCurrentMonth,
            });
          } catch {
            mapped = null;
          }
        }
        mapped = mapped || {};

        if (mapped.hidden === true || (hideOutsideDays && !cell.isCurrentMonth)) {
          html += '<td></td>';
          continue;
        }

        // A check-out-only day stays selectable, and so does a kept multiple
        // date (to remove it); range-blocked days and mapDays can force-disable.
        const keepClickable = cell.isCheckoutOnly || (type === 'multiple' && cell.isSelected);
        const isDisabled = (cell.disabled && !keepClickable) || cell.isRangeBlocked || mapped.disabled === true;

        // Selection semantics come from the committed selection, never the
        // hover preview.
        const isStart = isRangeLike && rangeStart && isSameDay(cell.date, rangeStart);
        const isEnd = isRangeLike && rangeEnd && isSameDay(cell.date, rangeEnd);
        const inCommitted = isRangeLike && rangeStart && rangeEnd
          && cell.date.compare(rangeStart) >= 0 && cell.date.compare(rangeEnd) <= 0;
        const isSelected = !!(cell.isSelected || isStart || isEnd || inCommitted);

        const classes = ['idp-day'];
        if (!cell.isCurrentMonth) classes.push('outside');
        if (cell.isToday) classes.push('today');
        if (cell.isSelected) classes.push('selected');
        if (isDisabled) classes.push('disabled');
        if (cell.isRangeBlocked) classes.push('range-blocked');
        if (cell.isCheckoutOnly) classes.push('checkout-only');
        if (cell.inRange) classes.push('in-range');
        if (cell.isRangeStart) classes.push('range-start');
        if (cell.isRangeEnd) classes.push('range-end');
        if (mapped.className) classes.push(mapped.className);

        let label = this._formatDayLabel(cell.date);
        if (isStart) label += `, ${labels.rangeStart}`;
        if (isEnd) label += `, ${labels.rangeEnd}`;
        if (isSelected && !isStart && !isEnd) label += `, ${labels.selected}`;

        html += `<td aria-selected="${isSelected}"><button class="${escAttr(classes.join(' '))}" part="day"
          tabindex="${cell.isFocused ? '0' : '-1'}"
          ${isDisabled ? 'aria-disabled="true"' : ''}
          ${cell.isToday ? 'aria-current="date"' : ''}
          aria-label="${escAttr(label)}"
          data-action="select-day"
          data-month="${cell.date.month}"
          data-day="${cell.date.day}"
          data-iso="${toISO(cell.date)}"
          type="button"${mapped.style ? ` style="${escAttr(mapped.style)}"` : ''}${mapped.title ? ` title="${escAttr(mapped.title)}"` : ''}
        >${this._formatNumber(cell.day)}${mapped.content || ''}</button></td>`;
      }
      html += '</tr>';
    }

    return html + '</tbody></table>';
  }

  // Re-render the month(s) without touching the presets sidebar.
  _renderCalendarContent() {
    const main = this._calendarEl?.querySelector('.idp-calendar-main');
    if (!main) {
      this._render();
      return;
    }
    main.innerHTML = this._renderCalendarInner();
  }

  // Range/week hover preview: toggle classes on the existing cells instead of
  // re-rendering the grid, which would drop keyboard focus.
  _updateHoverHighlight() {
    const state = this._state;
    const weekBounds = getHoveredWeekBounds(state);
    for (const btn of this._calendarEl.querySelectorAll('.idp-day[data-day]')) {
      const date = this._dateFromBtn(btn);
      if (!date) continue;
      const { isStart, isEnd } = isRangeEdge(state, date, weekBounds);
      btn.classList.toggle('in-range', isInRange(state, date, weekBounds));
      btn.classList.toggle('range-start', !!isStart);
      btn.classList.toggle('range-end', !!isEnd);
    }
  }

  _bindEvents() {
    if (this._eventsBound) return;
    this._eventsBound = true;
    const shadow = this.shadowRoot;

    shadow.addEventListener('click', (e) => {
      // Past midnight, re-render first so the click acts on today's rules.
      if (this._refreshToday()) this._renderCalendarContent();
      const btn = e.target.closest('[data-action]');
      if (!btn) {
        if (e.target.closest('.idp-input-wrapper')) this._toggleFromTrigger();
        return;
      }
      this._handleAction(btn.dataset.action, btn);
    });

    // Handle caption-layout dropdown changes
    shadow.addEventListener('change', (e) => {
      const select = e.target.closest('select.idp-dropdown[data-action]');
      if (!select) return;
      const { calendar, viewMonth } = this._state;
      const before = firstOfView(this._state);
      // Options carry the ISO date of their month's / year's first day.
      let date = parseISOToCalendar(select.value, calendar);
      if (!date) return;
      if (select.dataset.action === 'dropdown-year') {
        // Keep the visible month, clamped when leaving a 13-month year.
        date = date.add({ months: Math.min(viewMonth, calendar.getMonthsInYear(date)) - 1 });
      }
      this._showMonth(date);
      this._renderCalendarContent();
      this._announceMonth();
      this._navigated(before);
    });

    // Commit typed text on blur (allow-input mode)
    shadow.addEventListener('focusout', (e) => {
      if (!this._isTypingInput(e.target)) return;
      // Focus moving into the calendar: let the click handler do its job
      if (e.relatedTarget && shadow.contains(e.relatedTarget)) return;
      this._commitTypedInput(e.target);
    });

    shadow.addEventListener('focusin', (e) => {
      if (e.target === this._inputEl) this._syncAccessibleName();
    });

    shadow.addEventListener('keydown', (e) => {
      this._refreshToday();
      if (e.key === 'Tab' && this._state.isOpen && !this._state.inline) {
        this._handleTabTrap(e);
        return;
      }

      if (e.target === this._inputEl || e.target === this._slottedInput) {
        this._handleInputKeydown(e);
        return;
      }

      if (this._view === 'months') {
        if (e.target.closest('.idp-month-cell')) this._handleMonthYearKeydown(e, '.idp-month-cell', 'select-month');
        return;
      }
      if (this._view === 'years') {
        if (e.target.closest('.idp-year-cell')) this._handleMonthYearKeydown(e, '.idp-year-cell', 'select-year');
        return;
      }

      if (e.target.closest('.idp-day')) this._handleGridKeydown(e);
    });

    // Hover preview — always attached, checks type at event time for dynamic type changes
    shadow.addEventListener('mouseover', (e) => {
      const type = this._state.type;
      const shouldTrackHover = type === 'week' ||
        (type === 'range' && this._state.rangeStart && !this._state.rangeEnd);
      if (!shouldTrackHover) return;

      const dayBtn = e.target.closest('.idp-day');
      if (dayBtn && dayBtn.getAttribute('aria-disabled') !== 'true') {
        const date = this._dateFromBtn(dayBtn);
        if (!date) return;
        const prev = this._state.hoveredDate;
        // For week mode, skip if still in the same week
        const { locale, firstDayOfWeek } = this._state;
        if (type === 'week' && prev && isSameDay(startOfWeek(date, locale, firstDayOfWeek), startOfWeek(prev, locale, firstDayOfWeek))) return;
        if (type === 'range' && prev && isSameDay(date, prev)) return;
        this._state = updateState(this._state, { hoveredDate: date });
        this._updateHoverHighlight();
      } else if (this._state.hoveredDate) {
        this._state = updateState(this._state, { hoveredDate: null });
        this._updateHoverHighlight();
      }
    });

    // Slotted custom input. slotchange bubbles, so one listener on the root
    // survives re-renders.
    shadow.addEventListener('slotchange', (e) => {
      if (e.target.name !== 'input') return;
      const next = e.target.assignedElements()[0] || null;
      if (next === this._slottedInput) return;
      this._slottedInput?.removeEventListener('click', this._boundSlottedClick);
      this._slottedInput = next;
      next?.addEventListener('click', this._boundSlottedClick);
      this._updateExternalInput();
      this._updateFormValue();
    });
  }

  _onSlottedClick() {
    this._toggleFromTrigger();
  }

  _toggleFromTrigger() {
    if (this._isDisabled() || this.hasAttribute('readonly')) return;
    if (this._state.isOpen) {
      this._closeCalendar();
    } else {
      // When typing is allowed, a click places the caret: keep focus in the
      // input. Otherwise move focus into the grid.
      this._openCalendar({ focus: !this.hasAttribute('allow-input') });
    }
  }

  _isTypingInput(el) {
    return this.hasAttribute('allow-input') && (el === this._inputEl || el === this._slottedInput);
  }

  _handleInputKeydown(e) {
    // Down / Alt+Down opens the calendar and moves focus into it (APG combobox).
    if (e.key === 'ArrowDown' && !this._state.inline) {
      if (this._isDisabled() || this.hasAttribute('readonly')) return;
      e.preventDefault();
      if (this._state.isOpen) this._focusCurrentCell();
      else this._openCalendar({ focus: true });
      return;
    }
    if (e.key === 'Enter' && this._isTypingInput(e.target)) {
      e.preventDefault();
      this._commitTypedInput(e.target);
    }
  }

  _commitTypedInput(input) {
    const text = input.value.trim();
    if (text === this.displayValue && !this._inputError) return;
    if (!text) {
      this._inputError = '';
      if (this.value) this.clear();
      else this._render();
      this._updateFormValue();
      return;
    }
    const s = this._state;
    const parsed = parseInput(text, s.calendarId, s.locale, this.getAttribute('date-format'));
    const refusal = parsed && this._refusal(parsed);
    if (parsed && !refusal) {
      this._inputError = '';
      this._selectDate(parsed);
    } else {
      // Persistent error until the next successful entry (no timed flash).
      this._inputError = refusal || fillLabel(s.labels.invalidDate, this._getInputFormat());
      this._syncInput();
      this._updateFormValue();
    }
  }

  _handleAction(action, btn) {
    // aria-disabled controls stay focusable but must not act.
    if (btn.getAttribute('aria-disabled') === 'true') return;

    switch (action) {
      case 'prev-month':
        this._navigateMonth(-1);
        break;
      case 'next-month':
        this._navigateMonth(1);
        break;
      case 'prev-decade':
      case 'next-decade':
        this._state = updateState(this._state, viewOf(firstOfView(this._state).add({ years: action === 'prev-decade' ? -20 : 20 })));
        this._renderCalendarContent();
        break;
      case 'show-months':
      case 'show-years':
        // Remember the month left, to report navigation on the way back.
        if (this._view === 'days') this._pickerFrom = firstOfView(this._state);
        this._view = action === 'show-months' ? 'months' : 'years';
        this._renderCalendarContent();
        this._focusCurrentCell();
        break;
      case 'show-days':
        this._showDays();
        break;
      case 'select-year':
      case 'select-month': {
        // Cells carry the ISO date of their period's first day, which keeps
        // the era (Japanese) that a bare year number would lose.
        const isYear = action === 'select-year';
        const date = parseISOToCalendar(btn.dataset.iso, this._state.calendar);
        if (!date) break;
        if (this._state.type === (isYear ? 'year' : 'month')) {
          this._selectDate(date);
          break;
        }
        if (isYear) {
          // Keep the visible month, clamped when leaving a 13-month year.
          const month = Math.min(this._state.viewMonth, this._state.calendar.getMonthsInYear(date));
          this._state = updateState(this._state, viewOf(date.add({ months: month - 1 })));
          this._view = 'months';
          this._renderCalendarContent();
        } else {
          this._showMonth(date);
          this._showDays();
        }
        this._focusCurrentCell();
        break;
      }
      case 'select-day':
        this._selectDate(this._dateFromBtn(btn));
        break;
      case 'today':
        this._selectToday();
        break;
      case 'apply-preset':
        this._applyPreset(btn.dataset.presetValue);
        break;
      case 'clear':
        this.clear();
        if (!this._state.inline) this._closeCalendar();
        break;
    }
  }

  // Show the month starting at `date` and focus its first day.
  _showMonth(date) {
    this._state = updateState(this._state, { focusedDate: date, ...viewOf(date) });
  }

  _navigateMonth(delta) {
    const before = firstOfView(this._state);
    this._state = updateState(this._state, viewOf(firstOfView(this._state, delta)));
    this._view = 'days';
    this._renderCalendarContent();
    this._announceMonth();
    this._navigated(before);
  }

  // Back to the day grid from the month/year views.
  _showDays() {
    this._view = 'days';
    this._renderCalendarContent();
    if (this._pickerFrom) this._navigated(this._pickerFrom);
    this._pickerFrom = null;
  }

  // Fire intl-navigate when the visible month is no longer `before`, with the
  // Gregorian bounds of everything visible (all `months` panels), so a page in
  // any calendar can load data for that window.
  _navigated(before) {
    const first = firstOfView(this._state);
    const delta = first.compare(before);
    if (!delta) return;
    this._emit('intl-navigate', {
      year: first.year,
      month: first.month,
      direction: delta > 0 ? 'forward' : 'backward',
      start: toISO(first),
      end: toISO(endOfMonth(firstOfView(this._state, this._getMonthCount() - 1))),
    });
  }

  // Month/year pickers select whole periods: only min/max apply, not the
  // per-day disabled rules.
  _isSelectable(date) {
    const { type, min, max } = this._state;
    if (type === 'month' || type === 'year') {
      return !(min && date.compare(min) < 0) && !(max && date.compare(max) > 0);
    }
    return !isDateDisabled(this._state, date);
  }

  _selectDate(date) {
    if (!date) return;
    const prev = this._state;
    const type = prev.type;
    const isPeriod = type === 'month' || type === 'year';
    if (isPeriod) date = getPeriodBounds(date, type).start;

    const next = !isPeriod ? selectDate(prev, date)
      : this._isSelectable(date) ? updateState(prev, { selectedDate: date, focusedDate: date, ...viewOf(date) })
      : prev;
    if (next === prev) {
      // Say why, e.g. "Choose at least 2 nights" (silent at the max-dates limit).
      this._announce(this._refusal(date));
      return;
    }

    const prevCount = prev.selectedDates?.length || 0;
    this._state = next;
    this._inputError = '';
    this._render();
    this._updateFormValue();
    this._updateExternalInput();
    this._announceSelection(date, type === 'multiple' && this._state.selectedDates.length < prevCount);

    const detail = this._buildDetail();
    this._emit('intl-select', detail);
    this._emit('intl-change', detail);

    // Close once the selection is complete: not for multiple, nor after a
    // range's first click (or its cancel). Small delay for visual feedback.
    const complete = type !== 'multiple' && (type !== 'range' || this._state.rangeEnd);
    if (complete && !this._state.inline) {
      setTimeout(() => this._closeCalendar(), CLOSE_DELAY);
    }
  }

  _selectToday() {
    const { type, today } = this._state;
    const todayDate = type === 'month' || type === 'year' ? getPeriodBounds(today, type).start : today;
    if (!this._isSelectable(todayDate)) return;
    const prev = this._state;
    const shown = updateState(prev, viewOf(todayDate));
    this._state = shown;
    this._selectDate(todayDate);
    // Refused (e.g. by a range rule): stay on the month the user was viewing.
    if (this._state === shown) this._state = prev;
    else if (this._view === 'days') this._navigated(firstOfView(prev));
  }

  _dateFromBtn(btn) {
    return parseISOToCalendar(btn.dataset.iso, this._state.calendar);
  }

  _handleGridKeydown(e) {
    const keyMap = {
      ArrowLeft: { days: this._state._isRTL ? 1 : -1 },
      ArrowRight: { days: this._state._isRTL ? -1 : 1 },
      ArrowUp: { days: -7 },
      ArrowDown: { days: 7 },
      PageUp: e.shiftKey ? { years: -1 } : { months: -1 },
      PageDown: e.shiftKey ? { years: 1 } : { months: 1 },
      Home: 'startOfWeek',
      End: 'endOfWeek',
      Enter: 'select',
      ' ': 'select',
      Escape: 'close',
    };

    const action = keyMap[e.key];
    if (!action) return;

    e.preventDefault();

    if (action === 'select') {
      const date = this._state.focusedDate;
      // Disabled and range-blocked days stay focusable: say why instead.
      // Days force-disabled by mapDays carry only aria-disabled.
      if (e.target.closest('.idp-day')?.getAttribute('aria-disabled') === 'true') {
        this._announce(this._refusal(date) || this._state.labels.dateUnavailable);
      } else {
        this._selectDate(date);
      }
      return;
    }

    if (action === 'close') {
      this._closeCalendar();
      return;
    }

    const oldView = firstOfView(this._state);

    if (action === 'startOfWeek' || action === 'endOfWeek') {
      const { focusedDate, locale, firstDayOfWeek } = this._state;
      const target = (action === 'startOfWeek' ? startOfWeek : endOfWeek)(focusedDate, locale, firstDayOfWeek);
      this._state = moveFocus(this._state, { days: target.compare(focusedDate) });
    } else {
      this._state = moveFocus(this._state, action);
    }
    if (e.key !== 'PageUp' && e.key !== 'PageDown') {
      this._stabilizeMultiMonthView(oldView);
    }
    this._renderCalendarContent();
    this._focusCurrentCell();
    this._navigated(oldView);
  }

  _handleMonthYearKeydown(e, cellSelector, actionName) {
    const cells = Array.from(this.shadowRoot.querySelectorAll(cellSelector));
    const current = e.target.closest(cellSelector);
    const idx = cells.indexOf(current);
    if (idx === -1) return;

    const cols = this._view === 'months' ? 3 : 4;
    let next = -1;

    switch (e.key) {
      case 'ArrowRight':
        next = this._state._isRTL ? idx - 1 : idx + 1;
        break;
      case 'ArrowLeft':
        next = this._state._isRTL ? idx + 1 : idx - 1;
        break;
      case 'ArrowDown':
        next = idx + cols;
        break;
      case 'ArrowUp':
        next = idx - cols;
        break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        this._handleAction(actionName, current);
        return;
      case 'Escape':
        e.preventDefault();
        if (this._state.type === 'month' || this._state.type === 'year') {
          this._closeCalendar();
        } else {
          this._showDays();
          this._focusCurrentCell();
        }
        return;
      default:
        return;
    }

    e.preventDefault();
    if (next >= 0 && next < cells.length) {
      cells[next].focus();
    }
  }

  _handleTabTrap(e) {
    const focusable = Array.from(
      this._calendarEl.querySelectorAll('button:not([disabled]):not([hidden]), select:not([disabled]), [tabindex="0"]'),
    ).filter(el => el.tabIndex !== -1);
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const inside = this._calendarEl.contains(e.target);

    if (e.shiftKey ? (e.target === first || !inside) : (e.target === last || !inside)) {
      e.preventDefault();
      (e.shiftKey ? last : first).focus();
    }
  }

  // Synchronous on purpose: the re-render just removed the focused cell, and
  // waiting a frame would leave focus on <body> (announced by screen readers).
  _focusCurrentCell() {
    this._calendarEl?.querySelector(
      '.idp-day[tabindex="0"], .idp-month-cell.selected, .idp-year-cell.selected, .idp-month-cell:not([disabled]), .idp-year-cell:not([disabled])',
    )?.focus();
  }

  _stabilizeMultiMonthView(oldView) {
    const monthCount = this._getMonthCount();
    if (monthCount <= 1) return;
    // Still within the visible panels: restore the old view.
    const focused = this._state.focusedDate;
    if (focused.compare(oldView) >= 0 && focused.compare(oldView.add({ months: monthCount })) < 0) {
      this._state = updateState(this._state, viewOf(oldView));
    }
  }

  _shouldAnimate() {
    return !this.hasAttribute('no-animation') && !this._state.inline;
  }

  _setInline(inline) {
    if (inline && this._calendarEl) {
      // Drop the popup's inline fixed-position styles.
      this._calendarEl.removeAttribute('style');
    }
    if (inline && this._state.isOpen) {
      // Tear down the popup machinery without firing intl-close.
      this._destroyPositioning();
      this._hidePanel();
      document.removeEventListener('click', this._boundClose);
      document.removeEventListener('keydown', this._boundKeydown);
      if (openInstance === this) openInstance = null;
    }
    this._state = updateState(this._state, { inline, isOpen: inline });
    this._view = this._initialView();
    this._render();
  }

  _initialView() {
    const type = this._state.type;
    return type === 'month' ? 'months' : type === 'year' ? 'years' : 'days';
  }

  // The host, not just the input box, so the popup never covers the
  // allow-input hint or error below the input.
  _getTrigger() {
    if (this.hasAttribute('for')) return this._externalInput || this;
    return this;
  }

  _openCalendar({ focus = true } = {}) {
    if (this._state.isOpen) return;

    // Dispatch cancelable intl-open event
    const openEvent = new CustomEvent('intl-open', { bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(openEvent)) return;

    // Cancel any in-progress close animation
    if (this._animatingClose) this._finishClose();

    // Close other open instances
    if (openInstance && openInstance !== this) openInstance.close();
    openInstance = this;

    // Capture the element that had focus when the picker opened, so we can
    // return focus to it on close. Prefer the slotted/external input when set,
    // since that's the user-visible trigger.
    // When focus is inside our shadow root, activeElement is the host, and
    // host.focus() is a no-op while focus is still inside; use the inner input.
    const active = document.activeElement;
    this._lastTrigger = this._externalInput
      || this._slottedInput
      || (active && active !== this && active !== document.body ? active : this._inputEl);

    this._state = updateState(this._state, { isOpen: true, hoveredDate: null });
    this._view = this._initialView();
    this._pickerFrom = null;
    this._render();
    this._showPanel();

    const calendar = this._calendarEl;
    this._destroyPositioning();
    this._positionCleanup = positionCalendar(this._getTrigger(), calendar, { isRTL: !!this._state._isRTL });

    if (this._shouldAnimate()) {
      calendar.classList.add('idp-animating-in');
      const onEnd = () => {
        calendar.classList.remove('idp-animating-in');
        calendar.removeEventListener('animationend', onEnd);
      };
      calendar.addEventListener('animationend', onEnd);
    }

    document.addEventListener('keydown', this._boundKeydown);
    requestAnimationFrame(() => {
      if (this._state.isOpen) document.addEventListener('click', this._boundClose);
    });
    if (focus) this._focusCurrentCell();
  }

  _closeCalendar() {
    if (!this._state.isOpen || this._state.inline) return;

    // Dispatch cancelable intl-close event
    const closeEvent = new CustomEvent('intl-close', { bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(closeEvent)) return;

    this._state = updateState(this._state, { isOpen: false, hoveredDate: null });

    const calendar = this._calendarEl;
    if (this._shouldAnimate() && calendar && !calendar.hidden) {
      this._animatingClose = true;
      calendar.classList.add('idp-animating-out');
      const onEnd = () => this._finishClose();
      calendar.addEventListener('animationend', onEnd, { once: true });
      // animationend never fires if the animation is cancelled or styles are
      // overridden; don't leave the panel stuck open.
      this._closeTimer = setTimeout(onEnd, 400);
    } else {
      this._finishClose();
    }

    this._inputEl?.setAttribute('aria-expanded', 'false');

    document.removeEventListener('click', this._boundClose);
    document.removeEventListener('keydown', this._boundKeydown);

    if (openInstance === this) openInstance = null;

    // Only restore focus if it's still inside our shadow root — otherwise the
    // user has already moved focus elsewhere and we shouldn't steal it.
    const focusInsidePicker = this.shadowRoot.activeElement
      || (typeof document !== 'undefined' && document.activeElement === this);

    if (focusInsidePicker) {
      this._closingCalendar = true;
      const trigger = this._lastTrigger || this._inputEl || this._externalInput;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
      this._closingCalendar = false;
    }
    this._lastTrigger = null;
  }

  _finishClose() {
    clearTimeout(this._closeTimer);
    this._animatingClose = false;
    const calendar = this._calendarEl;
    if (!calendar) return;
    calendar.classList.remove('idp-animating-out', 'idp-animating-in');
    if (!this._state.isOpen) {
      this._hidePanel();
      this._destroyPositioning();
    }
  }

  _onOutsideClick(e) {
    if (!this._state.isOpen) return;
    const path = e.composedPath();
    if (path.includes(this) || path.includes(this.shadowRoot)) return;
    if (this._externalInput && path.includes(this._externalInput)) return;
    this._closeCalendar();
  }

  _onDocumentKeydown(e) {
    if (e.key === 'Escape' && this._state.isOpen) {
      this._closeCalendar();
    }
  }

  _cleanupExternalInput() {
    if (this._externalInput) {
      if (this._boundExternalClick) this._externalInput.removeEventListener('click', this._boundExternalClick);
      if (this._boundExternalFocus) this._externalInput.removeEventListener('focus', this._boundExternalFocus);
      if (this._boundExternalMousedown) this._externalInput.removeEventListener('mousedown', this._boundExternalMousedown);
    }
    this._boundExternalClick = null;
    this._boundExternalFocus = null;
    this._boundExternalMousedown = null;
  }

  _setupExternalInput() {
    this._cleanupExternalInput();

    const forId = this.getAttribute('for');
    const input = forId ? document.getElementById(forId) : null;
    this._externalInput = input;
    if (!input) return;

    this._boundExternalMousedown = () => {
      this._mouseActivated = true;
    };
    this._boundExternalFocus = () => {
      // Only open on keyboard/programmatic focus — mouse clicks handled via click handler
      const byMouse = this._mouseActivated;
      this._mouseActivated = false;
      if (byMouse || this._isDisabled() || this._state.isOpen || this._closingCalendar) return;
      this._openCalendar();
    };
    this._boundExternalClick = () => {
      this._mouseActivated = false;
      if (this._isDisabled()) return;
      this._state.isOpen ? this._closeCalendar() : this._openCalendar();
    };
    input.addEventListener('mousedown', this._boundExternalMousedown);
    input.addEventListener('click', this._boundExternalClick);
    input.addEventListener('focus', this._boundExternalFocus);

    // If the external input has a value, try to parse it
    if (input.value && !this.value) {
      const parsed = parseInput(input.value, this._state.calendarId, this._state.locale, this.getAttribute('date-format'));
      if (parsed) {
        this._state = updateState(selectDate(this._state, parsed), viewOf(parsed));
        this._render();
        this._updateFormValue();
        this._updateExternalInput();
      }
    }
  }

  _updateExternalInput() {
    const display = this.displayValue;
    if (this._externalInput) this._externalInput.value = display;
    if (this._slottedInput) this._slottedInput.value = display;
  }

  // --- Live region ---

  _announce(text) {
    const live = this._liveEl;
    if (!live || !text) return;
    // Same text twice isn't re-announced; nudge it with a no-break space.
    live.textContent = live.textContent === text ? `${text} ` : text;
  }

  _announceMonth() {
    const count = this._view === 'days' ? this._getMonthCount() : 1;
    const titles = [];
    for (let i = 0; i < count; i++) {
      titles.push(formatMonthYear(firstOfView(this._state, i), this._fmt));
    }
    this._announce(titles.join(' – '));
  }

  _announceSelection(date, removed = false) {
    const s = this._state;
    const { labels } = s;
    if (s.type === 'range' || s.type === 'week') {
      if (s.rangeStart && s.rangeEnd) {
        this._announce(fillLabel(labels.rangeSelected, {
          start: this._formatDayLabel(s.rangeStart),
          end: this._formatDayLabel(s.rangeEnd),
        }));
      } else if (s.rangeStart) {
        const hint = this._rangeHint();
        this._announce(`${this._formatDayLabel(s.rangeStart)}, ${labels.rangeStart}${hint ? `. ${hint}` : ''}`);
      }
      return;
    }
    if (removed || !date) return;
    const text = s.type === 'month' || s.type === 'year' ? this.displayValue : this._formatDayLabel(date);
    this._announce(`${text}, ${labels.selected}`);
  }

  // --- Formatting ---

  _formatDayLabel(date) {
    try {
      return this._fmt.dayLabel.format(calendarDateToNative(date));
    } catch {
      return `${date.day}`;
    }
  }

  _formatForType(date) {
    const { type } = this._state;
    if (type === 'month') return formatMonthYear(date, this._fmt);
    if (type === 'year') return this._fmt.year.format(calendarDateToNative(getPeriodBounds(date, 'year').start));
    return formatDateShort(date, this._fmt);
  }

  _formatNumber(n) {
    return this._fmt.number.format(n);
  }

  _updateDir() {
    if (this._state?._isRTL) {
      this.setAttribute('dir', 'rtl');
    } else {
      this.removeAttribute('dir');
    }
  }

  // Locale week number: weeks start on the picker's first day; week 1 is the
  // first with at least the locale's minimalDays in the new year (as ICU).
  _getWeekNumber(date) {
    try {
      const { locale, firstDayOfWeek } = this._state;
      // A week has at least minimalDays days in the year of its
      // (7 − minimalDays)th day (the Thursday for ISO's 4).
      const pivot = 7 - this._minimalDays;
      const weekStart = startOfWeek(date, locale, firstDayOfWeek);
      // `set` keeps the era, so this is the right year in Japanese too.
      const yearStart = weekStart.add({ days: pivot }).set({ month: 1, day: 1 });
      let week1Start = startOfWeek(yearStart, locale, firstDayOfWeek);
      if (week1Start.add({ days: pivot }).compare(yearStart) < 0) week1Start = week1Start.add({ days: 7 });
      return Math.floor(weekStart.compare(week1Start) / 7) + 1;
    } catch {
      return 0;
    }
  }

  _destroyPositioning() {
    if (this._positionCleanup) {
      this._positionCleanup();
      this._positionCleanup = null;
    }
  }

  _emit(name, detail) {
    this.dispatchEvent(new CustomEvent(name, {
      detail,
      bubbles: true,
      composed: true,
    }));
  }
}

/**
 * Register the custom element. Safe to call from any environment:
 * skips silently in SSR (no `customElements`) and on HMR / multi-bundle
 * (already registered).
 */
export function register() {
  if (typeof customElements === 'undefined') return;
  if (customElements.get('intl-datepicker')) return;
  customElements.define('intl-datepicker', IntlDatepicker);
}

register();

export { IntlDatepicker };
