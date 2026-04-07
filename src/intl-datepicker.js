import { toCalendar, today, CalendarDate, startOfWeek, endOfWeek, isSameDay } from '@internationalized/date';
import { getStyles, getStylesText, calendarIcon, clearIcon, chevronLeft, chevronRight } from './styles.js';
import { resolveLocale, isRTL, getWeekdayNames, getMinimalDays, isCalendarRegistered } from './core/locale.js';
import { calendarDateToNative, resolveIntlCalendar, getTimeZone, resolveRelativeDate, escAttr, parseJSONAttr } from './utils/common.js';
import {
  createState, updateState, selectDate, moveFocus,
  goToMonth, toISO, parseISOToCalendar, isDateDisabled,
  isoWeekToCalendarDate, parseTypedValue,
} from './core/state.js';
import { generateMonthGrid } from './core/calendar-grid.js';
import { renderHeader, renderYearGrid, renderMonthGrid as renderMonthPicker } from './core/calendar-header.js';
import { formatDateShort, formatRange, formatMonthYear, getGregorianEquivalent } from './utils/format.js';
import { positionCalendar } from './core/positioning.js';
import { parseInput } from './core/date-input.js';
import { resolveLabels } from './core/labels.js';

const isPlainObject = (v) => v && typeof v === 'object' && !Array.isArray(v);

// Track the currently open instance to close others
let openInstance = null;

const VALID_TYPES = ['date', 'range', 'week', 'multiple', 'month', 'year'];

function parsePositiveInt(val) {
  const n = parseInt(val);
  return n > 0 ? n : null;
}

function toPlainDate(d) {
  return { year: d.year, month: d.month, day: d.day };
}

// SSR-safe base: in Node/SSR environments HTMLElement is undefined.
// We never instantiate the class server-side (the register() guard skips
// customElements.define), so a noop base is sufficient to allow `import`.
const HTMLElementBase = typeof HTMLElement !== 'undefined' ? HTMLElement : class {};

class IntlDatepicker extends HTMLElementBase {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'calendar', 'locale', 'value', 'type', 'min', 'max',
      'for', 'inline', 'disabled', 'readonly', 'required',
      'placeholder', 'show-alternate', 'name',
      'disabled-dates', 'disable-weekends',
      'date-separator', 'max-dates', 'sort-dates',
      'months', 'presets', 'no-animation',
      'show-week-numbers', 'hide-outside-days', 'allow-input',
      'labels', 'date-format',
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
    this._boundExternalClick = null;
    this._boundExternalFocus = null;
    this._userLabelsFromAttr = null;
    this._userLabelsFromProp = null;
  }

  connectedCallback() {
    this._initState();
    this._render();
    this._bindEvents();
    this._setupExternalInput();
    this._updateFormValue();

    this._updateDir();
  }

  disconnectedCallback() {
    this._destroyPositioning();
    this._cleanupExternalInput();
    document.removeEventListener('click', this._boundClose);
    document.removeEventListener('keydown', this._boundKeydown);
    if (openInstance === this) openInstance = null;
  }

  attributeChangedCallback(name, oldVal, newVal) {
    if (oldVal === newVal || !this._state) return;

    switch (name) {
      case 'calendar':
      case 'locale':
      case 'type':
      case 'min':
      case 'max':
      case 'disabled-dates':
      case 'disable-weekends':
        this._initState();
        this._updateDir();
        this._render();
        this._updateFormValue();
        break;
      case 'value':
        this._setValue(newVal, false);
        break;
      case 'inline':
      case 'disabled':
      case 'readonly':
      case 'show-week-numbers':
      case 'hide-outside-days':
      case 'allow-input':
        this._render();
        break;
      case 'for':
        this._setupExternalInput();
        break;
      case 'date-separator':
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
      case 'months':
      case 'presets':
      case 'no-animation':
        this._render();
        break;
      case 'labels':
        this._userLabelsFromAttr = parseJSONAttr(newVal, isPlainObject);
        this._applyLabels();
        break;
      case 'date-format':
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
    if (this._state?.type === 'range') {
      const s = toISO(this._state.rangeStart);
      const e = toISO(this._state.rangeEnd);
      if (s && e) return `${s}/${e}`;
      if (s) return s;
      return '';
    }
    if (this._state?.type === 'multiple') {
      const dates = this._state.selectedDates || [];
      if (dates.length === 0) return '';
      return dates.map(d => toISO(d)).join(',');
    }
    if (this._state?.type === 'week') {
      if (!this._state.rangeStart || !this._state.rangeEnd) return '';
      const { year, week } = this._getISOWeek(this._state.rangeStart);
      return `${year}-W${String(week).padStart(2, '0')}`;
    }
    if (this._state?.type === 'month' && this._state.selectedDate) {
      const d = this._state.selectedDate;
      return `${String(d.year).padStart(4, '0')}-${String(d.month).padStart(2, '0')}`;
    }
    if (this._state?.type === 'year' && this._state.selectedDate) {
      return String(this._state.selectedDate.year);
    }
    return toISO(this._state?.selectedDate);
  }

  set value(v) {
    this._setValue(v, true);
  }

  get valueAsDate() {
    const iso = this.value;
    if (!iso) return null;
    const type = this._state?.type;
    if (type === 'multiple' || iso.includes('/')) return null;
    if (type === 'week' || type === 'month' || type === 'year') {
      const calDate = parseTypedValue(iso, type);
      return calDate ? calendarDateToNative(calDate) : null;
    }
    return new Date(iso + 'T00:00:00');
  }

  get calendarValue() {
    return this._state?.selectedDate || null;
  }

  get displayValue() {
    if (!this._state) return '';
    if (this._state.type === 'range' || this._state.type === 'week') {
      return formatRange(this._state.rangeStart, this._state.rangeEnd, this._state.locale, this._state.calendarId);
    }
    if (this._state.type === 'multiple') {
      const dates = this._state.selectedDates || [];
      if (dates.length === 0) return '';
      const sep = this.getAttribute('date-separator') || ', ';
      return dates.map(d => formatDateShort(d, this._state.locale, this._state.calendarId)).join(sep);
    }
    if (this._state.type === 'month' && this._state.selectedDate) {
      return formatMonthYear(this._state.selectedDate.year, this._state.selectedDate.month, this._state.locale, this._state.calendarId);
    }
    if (this._state.type === 'year' && this._state.selectedDate) {
      return this._formatYearDisplay(this._state.selectedDate.year);
    }
    return formatDateShort(this._state.selectedDate, this._state.locale, this._state.calendarId);
  }

  get rangeStart() {
    return this._state?.rangeStart ? toISO(this._state.rangeStart) : null;
  }

  get rangeEnd() {
    return this._state?.rangeEnd ? toISO(this._state.rangeEnd) : null;
  }

  // Value strings are computed by the `value` getter; _buildDetail delegates to it
  // so the two cannot drift. This method adds the structured sub-objects
  // (calendar/start/end/dates) and the `formatted` display string on top.
  _buildDetail() {
    const t = this._state?.type;
    const empty = (type) => {
      const base = { type, value: '', formatted: '' };
      if (type === 'multiple') return { ...base, dates: [] };
      if (type === 'range' || type === 'week') return { ...base, start: null, end: null };
      return { ...base, calendar: null };
    };

    if (t === 'multiple') {
      const dates = this._state.selectedDates || [];
      if (dates.length === 0) return empty('multiple');
      return {
        type: 'multiple',
        value: this.value,
        dates: dates.map(toPlainDate),
        formatted: this.displayValue,
      };
    }

    if (t === 'week' && this._state.rangeStart && this._state.rangeEnd) {
      return {
        type: 'week',
        value: this.value,
        start: toPlainDate(this._state.rangeStart),
        end: toPlainDate(this._state.rangeEnd),
        formatted: this.displayValue,
      };
    }

    if (t === 'range' && this._state.rangeStart) {
      const e = this._state.rangeEnd;
      return {
        type: 'range',
        value: this.value,
        start: toPlainDate(this._state.rangeStart),
        end: e ? toPlainDate(e) : null,
        formatted: this.displayValue,
      };
    }

    if (t === 'month' && this._state.selectedDate) {
      const d = this._state.selectedDate;
      return {
        type: 'month',
        value: this.value,
        calendar: { year: d.year, month: d.month },
        formatted: this.displayValue,
      };
    }

    if (t === 'year' && this._state.selectedDate) {
      return {
        type: 'year',
        value: this.value,
        calendar: { year: this._state.selectedDate.year },
        formatted: this.displayValue,
      };
    }

    if (this._state?.selectedDate) {
      return {
        type: 'date',
        value: this.value,
        calendar: toPlainDate(this._state.selectedDate),
        formatted: this.displayValue,
      };
    }

    return empty(t || 'date');
  }

  getValue() {
    const d = this._buildDetail();
    return d.value ? d : null;
  }

  setValue(isoDate) {
    this._setValue(isoDate, true);
  }

  clear() {
    this._state = updateState(this._state, {
      selectedDate: null,
      selectedDates: [],
      rangeStart: null,
      rangeEnd: null,
    });
    this._render();
    this._updateFormValue();
    this._updateExternalInput();
    this._emit('intl-change', this._buildDetail());
  }

  open() {
    if (this._state.inline || this.hasAttribute('disabled')) return;
    this._openCalendar();
  }

  close() {
    if (this._state.inline) return;
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

  set presets(val) {
    this._presets = Array.isArray(val) ? val : null;
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
    }
  }

  get isDateDisabled() { return this.disabledDatesFilter; }
  set isDateDisabled(fn) { this.disabledDatesFilter = fn; }

  get labels() {
    return this._state ? this._state.labels : resolveLabels('en', null);
  }

  set labels(val) {
    this._userLabelsFromProp = isPlainObject(val) ? val : null;
    this._applyLabels();
  }

  // --- Form callbacks ---

  get form() { return this._internals?.form; }
  get name() { return this.getAttribute('name'); }
  get type() { return this.localName; }
  get validity() { return this._internals?.validity; }
  get validationMessage() { return this._internals?.validationMessage; }
  get willValidate() { return this._internals?.willValidate; }
  checkValidity() { return this._internals?.checkValidity(); }
  reportValidity() { return this._internals?.reportValidity(); }

  formResetCallback() {
    const initial = this.getAttribute('value') || '';
    this._setValue(initial, false);
  }

  formStateRestoreCallback(state) {
    if (state) this._setValue(state, false);
  }

  // --- Private ---

  _initState() {
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

    this._userLabelsFromAttr = parseJSONAttr(this.getAttribute('labels'), isPlainObject);
    const userLabels = this._mergedUserLabels();

    this._state = createState({
      calendarId,
      locale,
      value: this.getAttribute('value') || null,
      type: isValidType ? type : 'date',
      min: this.getAttribute('min') || null,
      max: this.getAttribute('max') || null,
      inline: this.hasAttribute('inline'),
      disabledDates,
      disabledDatesFilter: this._disabledDatesFilter || null,
      disableWeekends: this.hasAttribute('disable-weekends'),
      isRTL: isRTL(locale),
      maxDates,
      sortDates: this.hasAttribute('sort-dates'),
      labels: resolveLabels(locale, userLabels),
    });

    // Cache formatters that depend on locale/calendar (avoid re-creation per cell)
    const intlCal = resolveIntlCalendar(calendarId);
    this._dayLabelFormatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      calendar: intlCal,
    });
    this._dayNumberFormatter = new Intl.NumberFormat(locale, { useGrouping: false });
    this._minimalDays = getMinimalDays(locale);

    this._parsedPresets = parseJSONAttr(this.getAttribute('presets'), Array.isArray);
  }

  _setValue(isoValue, emitEvent) {
    if (!this._state) return;
    const calendar = this._state.calendar;

    if (!isoValue) {
      this._state = updateState(this._state, {
        selectedDate: null,
        selectedDates: [],
        rangeStart: null,
        rangeEnd: null,
      });
    } else if (this._state.type === 'multiple') {
      const dates = isoValue.split(',')
        .map(s => parseISOToCalendar(s.trim(), calendar))
        .filter(d => d && !isDateDisabled(this._state, d));
      this._state = updateState(this._state, { selectedDates: dates });
    } else if (this._state.type === 'month') {
      // Parse "YYYY-MM" format
      const match = isoValue.match(/^(\d{4})-(\d{2})$/);
      if (match) {
        const year = parseInt(match[1]);
        const month = parseInt(match[2]);
        try {
          const date = new CalendarDate(this._state.calendar, year, month, 1);
          this._state = updateState(this._state, {
            selectedDate: date,
            viewYear: year,
            viewMonth: month,
          });
        } catch { return; }
      }
    } else if (this._state.type === 'year') {
      // Parse "YYYY" format
      const year = parseInt(isoValue);
      if (!isNaN(year)) {
        try {
          const date = new CalendarDate(this._state.calendar, year, 1, 1);
          this._state = updateState(this._state, {
            selectedDate: date,
            viewYear: year,
          });
        } catch { return; }
      }
    } else if (this._state.type === 'week' && /^\d{4}-W\d{2}$/.test(isoValue)) {
      const match = isoValue.match(/^(\d{4})-W(\d{2})$/);
      const calDate = isoWeekToCalendarDate(parseInt(match[1]), parseInt(match[2]), calendar);
      if (!calDate) return;
      this._state = selectDate(this._state, calDate);
    } else if (this._state.type === 'range' && isoValue.includes('/')) {
      const [startIso, endIso] = isoValue.split('/');
      const start = parseISOToCalendar(startIso, calendar);
      const end = parseISOToCalendar(endIso, calendar);
      if (!start || !end) return;
      if (isDateDisabled(this._state, start) || isDateDisabled(this._state, end)) return;
      this._state = updateState(this._state, {
        rangeStart: start,
        rangeEnd: end,
      });
    } else {
      const date = parseISOToCalendar(isoValue, calendar);
      if (!date) return;
      if (isDateDisabled(this._state, date)) return;
      this._state = updateState(this._state, {
        selectedDate: date,
        focusedDate: date,
        viewYear: date.year,
        viewMonth: date.month,
      });
    }

    this._render();
    this._updateFormValue();
    this._updateExternalInput();

    if (emitEvent) {
      this._emit('intl-change', this._buildDetail());
    }
  }

  _updateFormValue() {
    if (!this._internals) return;
    const val = this.value;
    this._internals.setFormValue(val || null);

    const anchor = this.shadowRoot.querySelector('.idp-input');

    if (this.hasAttribute('required') && !val) {
      this._internals.setValidity({ valueMissing: true }, this._state.labels.pleaseSelectDate, anchor);
      return;
    }

    if (val && (this._state.min || this._state.max)) {
      const dates = this._getValueDates();
      if (this._state.min && dates.some(d => d.compare(this._state.min) < 0)) {
        this._internals.setValidity({ rangeUnderflow: true },
          `Date must be ${this.getAttribute('min')} or later`, anchor);
        return;
      }
      if (this._state.max && dates.some(d => d.compare(this._state.max) > 0)) {
        this._internals.setValidity({ rangeOverflow: true },
          `Date must be ${this.getAttribute('max')} or earlier`, anchor);
        return;
      }
    }

    this._internals.setValidity({});
  }

  _getValueDates() {
    const type = this._state.type;
    if (type === 'multiple') {
      return this._state.selectedDates || [];
    }
    if (type === 'range' || type === 'week') {
      const dates = [];
      if (this._state.rangeStart) dates.push(this._state.rangeStart);
      if (this._state.rangeEnd) dates.push(this._state.rangeEnd);
      return dates;
    }
    if (this._state.selectedDate) return [this._state.selectedDate];
    return [];
  }

  _render() {
    const isInline = this.hasAttribute('inline');
    const hasFor = this.hasAttribute('for');
    const isDisabled = this.hasAttribute('disabled');
    const isReadonly = this.hasAttribute('readonly');
    const placeholder = this.getAttribute('placeholder') || '';
    const showAlternate = this.hasAttribute('show-alternate');

    const displayVal = this.displayValue;

    let html = '';

    // Input section (not shown for `for` mode)
    const allowInput = this.hasAttribute('allow-input');
    if (!hasFor) {
      html += `
        <div class="idp-input-wrapper" part="input-wrapper">
          <slot name="input">
            <input class="idp-input" part="input"
              type="text"
              ${!allowInput ? 'readonly' : ''}
              value="${escAttr(displayVal)}"
              placeholder="${escAttr(placeholder)}"
              ${isDisabled ? 'disabled' : ''}
              ${isReadonly ? 'readonly' : ''}
              aria-haspopup="dialog"
              aria-expanded="${this._state.isOpen}"
              role="combobox"
              autocomplete="off"
            />
          </slot>
          ${displayVal ? `<button class="idp-clear-btn" data-action="clear" aria-label="${escAttr(this._state.labels.clearDate)}" type="button">${clearIcon}</button>` : ''}
          ${calendarIcon}
        </div>
      `;
    }

    // Calendar panel
    const presetsHTML = this._renderPresets();
    const hasPresets = presetsHTML !== '';
    html += `
      <div class="idp-calendar${hasPresets ? ' idp-has-presets' : ''}" part="calendar"
        role="dialog"
        aria-modal="${!isInline}"
        aria-label="${escAttr(this._state.labels.datePicker)}"
        ${!isInline && !this._state.isOpen ? 'hidden' : ''}
      >
        ${presetsHTML}
        <div class="idp-calendar-main">
          <div aria-live="polite" class="idp-sr-only" id="idp-live"></div>
          ${this._renderCalendarInner(showAlternate)}
        </div>
      </div>
    `;

    this.shadowRoot.innerHTML = html;
  }

  _renderCalendarInner(showAlternate) {
    const monthCount = this._getMonthCount();

    if (this._view === 'years' || this._view === 'months' || monthCount <= 1) {
      let inner = renderHeader(this._state, this._view);

      if (this._view === 'years') {
        inner += renderYearGrid(this._state);
      } else if (this._view === 'months') {
        inner += renderMonthPicker(this._state);
      } else {
        inner += this._renderDayGrid();
      }

      inner += this._renderFooter(showAlternate);
      return inner;
    }

    // Multi-month view
    let inner = '<div class="idp-months-container">';
    for (let i = 0; i < monthCount; i++) {
      const panelState = this._getOffsetState(i);
      const headerTitle = formatMonthYear(panelState.viewYear, panelState.viewMonth, panelState.locale, panelState.calendarId);
      const isFirst = i === 0;
      const isLast = i === monthCount - 1;
      const isRTL = this._state._isRTL;

      inner += '<div class="idp-month-panel">';
      inner += this._renderMultiMonthHeader(headerTitle, isFirst, isLast, isRTL);
      inner += this._renderDayGrid(panelState, headerTitle);
      inner += '</div>';
    }
    inner += '</div>';
    inner += this._renderFooter(showAlternate);
    return inner;
  }

  _renderFooter(showAlternate) {
    const todayLabel = this._state.labels.today;
    const clearLabel = this._state.labels.clear;
    let html = `
      <div class="idp-footer" part="footer">
        <button class="idp-footer-btn" part="today-btn" data-action="today" type="button">${todayLabel}</button>
        <button class="idp-footer-btn" part="clear-btn" data-action="clear" type="button">${clearLabel}</button>
      </div>
    `;

    if (showAlternate && this._state.selectedDate) {
      const alt = getGregorianEquivalent(this._state.selectedDate, this._state.locale);
      html += `<div class="idp-alternate" part="alternate">${alt}</div>`;
    }

    return html;
  }

  _renderPresets() {
    if (this._state.type !== 'range') return '';

    const presets = this._presets || this._parsedPresets;
    if (!presets || presets.length === 0) return '';

    // Resolve current range for active highlight
    const currentStart = this._state.rangeStart ? toISO(this._state.rangeStart) : '';
    const currentEnd = this._state.rangeEnd ? toISO(this._state.rangeEnd) : '';

    let html = `<div class="idp-presets" part="presets" role="group" aria-label="${escAttr(this._state.labels.rangePresets)}">`;
    for (const preset of presets) {
      if (!preset.label || !preset.value) continue;
      // Check if this preset matches current selection
      let isActive = false;
      try {
        const [startExpr, endExpr] = preset.value.split('/');
        const resolvedStart = resolveRelativeDate(startExpr, this._state.calendar, this._state.min, this._state.max);
        const resolvedEnd = resolveRelativeDate(endExpr, this._state.calendar, this._state.min, this._state.max);
        if (resolvedStart && resolvedEnd) {
          isActive = toISO(resolvedStart) === currentStart && toISO(resolvedEnd) === currentEnd;
        }
      } catch { /* ignore */ }

      html += `<button class="idp-preset-btn${isActive ? ' active' : ''}"
        data-action="apply-preset"
        data-preset-value="${escAttr(preset.value)}"
        type="button">${escAttr(preset.label)}</button>`;
    }
    html += '</div>';
    return html;
  }

  _applyPreset(presetValue) {
    const [startExpr, endExpr] = presetValue.split('/');
    const start = resolveRelativeDate(startExpr, this._state.calendar, this._state.min, this._state.max);
    const end = resolveRelativeDate(endExpr, this._state.calendar, this._state.min, this._state.max);
    if (!start || !end) return;

    this._state = updateState(this._state, {
      rangeStart: start,
      rangeEnd: end,
      hoveredDate: null,
      viewYear: start.year,
      viewMonth: start.month,
    });

    this._renderSafe();
    this._updateFormValue();
    this._updateExternalInput();

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
    const current = new CalendarDate(
      this._state.calendar,
      this._state.viewYear,
      this._state.viewMonth,
      1,
    );
    const next = current.add({ months: offset });
    return updateState(this._state, {
      viewYear: next.year,
      viewMonth: next.month,
    });
  }

  _renderMultiMonthHeader(title, isFirst, isLast, isRTL) {
    const { chevronLeft: chL, chevronRight: chR } = this._getChevrons();
    const labels = this._state.labels;
    const prevBtn = isFirst
      ? `<button class="idp-nav-btn" part="nav-prev" data-action="prev-month" aria-label="${escAttr(labels.previousMonth)}" type="button">${isRTL ? chR : chL}</button>`
      : '<span class="idp-nav-btn" style="visibility:hidden"></span>';
    const nextBtn = isLast
      ? `<button class="idp-nav-btn" part="nav-next" data-action="next-month" aria-label="${escAttr(labels.nextMonth)}" type="button">${isRTL ? chL : chR}</button>`
      : '<span class="idp-nav-btn" style="visibility:hidden"></span>';

    return `
      <div class="idp-header" part="header" role="group">
        ${prevBtn}
        <div class="idp-header-title" part="header-title">
          <span class="idp-header-btn">${title}</span>
        </div>
        ${nextBtn}
      </div>
    `;
  }

  _getChevrons() {
    return { chevronLeft, chevronRight };
  }

  _renderDayGrid(overrideState, precomputedLabel) {
    const state = overrideState || this._state;
    const weekdays = getWeekdayNames(state.locale, 'narrow');
    const grid = generateMonthGrid(state);
    const showWeekNumbers = this.hasAttribute('show-week-numbers');
    const hideOutsideDays = this.hasAttribute('hide-outside-days');
    const cols = showWeekNumbers ? 8 : 7;

    let html = `<div class="idp-weekdays${showWeekNumbers ? ' idp-has-week-numbers' : ''}" role="row" style="grid-template-columns:repeat(${cols},1fr)">`;
    if (showWeekNumbers) {
      html += `<div class="idp-weekday idp-week-number-header" role="columnheader" aria-label="${escAttr(this._state.labels.weekNumber)}">#</div>`;
    }
    for (const wd of weekdays) {
      html += `<div class="idp-weekday" part="weekday" role="columnheader">${wd}</div>`;
    }
    html += '</div>';

    const gridLabel = precomputedLabel || formatMonthYear(state.viewYear, state.viewMonth, state.locale, state.calendarId);
    html += `<div class="idp-days" role="grid" aria-label="${gridLabel}" style="grid-template-columns:repeat(${cols},1fr)">`;

    const mapDaysFn = this._mapDays;

    for (const week of grid) {
      html += '<div role="row" style="display:contents">';
      if (showWeekNumbers) {
        const weekNum = this._getWeekNumber(week[0].date);
        html += `<span class="idp-week-number" aria-hidden="true">${this._formatDayNumber(weekNum)}</span>`;
      }
      for (const cell of week) {
        // Call mapDays if set
        let mapped = null;
        if (mapDaysFn) {
          try {
            mapped = mapDaysFn({
              date: { year: cell.date.year, month: cell.date.month, day: cell.date.day, dayOfWeek: calendarDateToNative(cell.date).getDay() },
              isToday: cell.isToday,
              isSelected: cell.isSelected,
              isDisabled: cell.disabled,
              isInRange: cell.inRange,
              isRangeStart: cell.isRangeStart,
              isRangeEnd: cell.isRangeEnd,
              isCurrentMonth: cell.isCurrentMonth,
            });
          } catch {
            mapped = null;
          }
        }
        if (mapped === undefined || mapped === null) mapped = {};

        // mapDays can force-disable
        const isDisabled = cell.disabled || mapped.disabled === true;
        const isHidden = mapped.hidden === true;

        if (isHidden || (hideOutsideDays && !cell.isCurrentMonth)) {
          html += '<span class="idp-day" style="visibility:hidden"></span>';
          continue;
        }

        const classes = ['idp-day'];
        if (!cell.isCurrentMonth) classes.push('outside');
        if (cell.isToday) classes.push('today');
        if (cell.isSelected) classes.push('selected');
        if (isDisabled) classes.push('disabled');
        if (cell.inRange) classes.push('in-range');
        if (cell.isRangeStart) classes.push('range-start');
        if (cell.isRangeEnd) classes.push('range-end');
        if (mapped.className) classes.push(mapped.className);

        const tabIdx = cell.isFocused ? '0' : '-1';
        const ariaSelected = cell.isSelected || cell.isRangeStart || cell.isRangeEnd ? 'true' : 'false';

        // Format the accessible label
        const label = this._formatDayLabel(cell.date);
        const styleAttr = mapped.style ? ` style="${mapped.style}"` : '';
        const titleAttr = mapped.title ? ` title="${escAttr(mapped.title)}"` : '';
        const content = mapped.content || '';

        html += `<button class="${classes.join(' ')}" part="day"
          role="gridcell"
          tabindex="${tabIdx}"
          aria-selected="${ariaSelected}"
          ${isDisabled ? 'aria-disabled="true"' : ''}
          aria-label="${label}"
          data-action="select-day"
          data-year="${cell.date.year}"
          data-month="${cell.date.month}"
          data-day="${cell.date.day}"
          type="button"${styleAttr}${titleAttr}
        >${this._formatDayNumber(cell.day)}${content}</button>`;
      }
      html += '</div>';
    }

    html += '</div>';
    return html;
  }

  _renderCalendarContent() {
    const calendarEl = this.shadowRoot.querySelector('.idp-calendar');
    if (!calendarEl) return;

    const showAlternate = this.hasAttribute('show-alternate');
    const inner = this._renderCalendarInner(showAlternate);
    // Target .idp-calendar-main when presets exist to preserve the sidebar
    const target = this.hasAttribute('presets')
      ? (calendarEl.querySelector('.idp-calendar-main') || calendarEl)
      : calendarEl;
    const hidden = calendarEl.hasAttribute('hidden');
    target.innerHTML = `<div aria-live="polite" class="idp-sr-only" id="idp-live"></div>${inner}`;
    if (hidden) calendarEl.setAttribute('hidden', '');

    this._announceMonth();
  }

  _bindEvents() {
    const shadow = this.shadowRoot;

    shadow.addEventListener('click', (e) => {
      const btn = e.target.closest('[data-action]');
      if (!btn) {
        // Click on input wrapper to toggle
        if (e.target.closest('.idp-input-wrapper') || e.target.closest('.idp-input')) {
          if (!this.hasAttribute('disabled') && !this.hasAttribute('readonly')) {
            this._state.isOpen ? this._closeCalendar() : this._openCalendar();
          }
        }
        return;
      }

      const action = btn.dataset.action;
      this._handleAction(action, btn);
    });

    // Handle direct input blur (allow-input mode)
    shadow.addEventListener('blur', (e) => {
      if (!this.hasAttribute('allow-input')) return;
      const input = e.target.closest('.idp-input');
      if (!input) return;
      // If focus is moving to a calendar button, skip — let the click handler do its job
      if (e.relatedTarget && shadow.contains(e.relatedTarget)) return;
      const text = input.value.trim();
      if (!text) return;
      const parsed = parseInput(text, this._state.calendarId, this._state.locale, this.getAttribute('date-format'));
      if (parsed && !isDateDisabled(this._state, parsed)) {
        input.removeAttribute('aria-invalid');
        this._selectDate(parsed);
      } else {
        input.setAttribute('aria-invalid', 'true');
        setTimeout(() => {
          input.removeAttribute('aria-invalid');
          input.value = this.displayValue;
        }, 1500);
      }
    });

    // Keyboard on grid / month / year views
    shadow.addEventListener('keydown', (e) => {
      if (e.key === 'Tab' && this._state.isOpen && !this._state.inline) {
        this._handleTabTrap(e);
        return;
      }

      if (this._view === 'months') {
        const monthBtn = e.target.closest('.idp-month-cell');
        if (monthBtn) this._handleMonthYearKeydown(e, '.idp-month-cell', 'select-month');
        return;
      }
      if (this._view === 'years') {
        const yearBtn = e.target.closest('.idp-year-cell');
        if (yearBtn) this._handleMonthYearKeydown(e, '.idp-year-cell', 'select-year');
        return;
      }

      const dayBtn = e.target.closest('.idp-day');
      if (!dayBtn) return;
      this._handleGridKeydown(e);
    });

    // Hover preview — always attached, checks type at event time for dynamic type changes
    shadow.addEventListener('mouseover', (e) => {
      const type = this._state.type;
      const shouldTrackHover = type === 'week' ||
        (type === 'range' && this._state.rangeStart && !this._state.rangeEnd);
      if (!shouldTrackHover) return;

      const dayBtn = e.target.closest('.idp-day');
      if (dayBtn && !dayBtn.hasAttribute('aria-disabled')) {
        const date = this._dateFromBtn(dayBtn);
        // For week mode, skip re-render if still in the same week
        if (type === 'week' && this._state.hoveredDate) {
          const ws = startOfWeek(date, this._state.locale);
          const prevWs = startOfWeek(this._state.hoveredDate, this._state.locale);
          if (isSameDay(ws, prevWs)) return;
        }
        if (type === 'range' && this._state.hoveredDate && isSameDay(date, this._state.hoveredDate)) return;
        this._state = updateState(this._state, { hoveredDate: date });
        this._renderCalendarContent();
      } else if (this._state.hoveredDate) {
        this._state = updateState(this._state, { hoveredDate: null });
        this._renderCalendarContent();
      }
    });

    // Handle slot changes for slotted input
    const slot = shadow.querySelector('slot[name="input"]');
    if (slot) {
      slot.addEventListener('slotchange', () => {
        const slotted = slot.assignedElements();
        if (slotted.length > 0) {
          this._slottedInput = slotted[0];
          this._slottedInput.addEventListener('click', () => {
            if (!this.hasAttribute('disabled')) {
              this._state.isOpen ? this._closeCalendar() : this._openCalendar();
            }
          });
        }
      });
    }
  }

  _handleAction(action, btn) {
    switch (action) {
      case 'prev-month':
        this._navigateMonth(-1);
        break;
      case 'next-month':
        this._navigateMonth(1);
        break;
      case 'prev-decade':
        this._state = updateState(this._state, { viewYear: this._state.viewYear - 20 });
        this._renderCalendarContent();
        break;
      case 'next-decade':
        this._state = updateState(this._state, { viewYear: this._state.viewYear + 20 });
        this._renderCalendarContent();
        break;
      case 'show-months':
        this._view = 'months';
        this._renderCalendarContent();
        break;
      case 'show-years':
        this._view = 'years';
        this._renderCalendarContent();
        break;
      case 'show-days':
        this._view = 'days';
        this._renderCalendarContent();
        break;
      case 'select-year': {
        if (btn.hasAttribute('aria-disabled')) break;
        const year = parseInt(btn.dataset.year);
        if (this._state.type === 'year') {
          // Year-only mode: select and close
          this._state = updateState(this._state, { viewYear: year, selectedDate: new CalendarDate(this._state.calendar, year, 1, 1) });
          this._render();
          this._updateFormValue();
          this._updateExternalInput();
          const detail = this._buildDetail();
          this._emit('intl-select', detail);
          this._emit('intl-change', detail);
          if (!this._state.inline) setTimeout(() => this._closeCalendar(), 150);
        } else {
          this._state = updateState(this._state, { viewYear: year });
          this._view = 'months';
          this._renderCalendarContent();
        }
        break;
      }
      case 'select-month': {
        if (btn.hasAttribute('aria-disabled')) break;
        const month = parseInt(btn.dataset.month);
        if (this._state.type === 'month') {
          // Month-only mode: select and close
          this._state = updateState(this._state, {
            viewMonth: month,
            selectedDate: new CalendarDate(this._state.calendar, this._state.viewYear, month, 1),
          });
          this._render();
          this._updateFormValue();
          this._updateExternalInput();
          const detail = this._buildDetail();
          this._emit('intl-select', detail);
          this._emit('intl-change', detail);
          if (!this._state.inline) setTimeout(() => this._closeCalendar(), 150);
        } else {
          this._state = goToMonth(this._state, this._state.viewYear, month);
          this._view = 'days';
          this._renderCalendarContent();
        }
        break;
      }
      case 'select-day': {
        const date = this._dateFromBtn(btn);
        this._selectDate(date);
        break;
      }
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

  _navigateMonth(delta) {
    const current = new CalendarDate(
      this._state.calendar,
      this._state.viewYear,
      this._state.viewMonth,
      1,
    );
    const next = current.add({ months: delta });
    this._state = updateState(this._state, {
      viewYear: next.year,
      viewMonth: next.month,
    });
    this._view = 'days';
    this._renderCalendarContent();
    this._emit('intl-navigate', {
      year: next.year,
      month: next.month,
      direction: delta > 0 ? 'forward' : 'backward',
    });
  }

  _selectDate(date) {
    if (!date) return;
    this._state = selectDate(this._state, date);
    this._renderSafe();
    this._updateFormValue();
    this._updateExternalInput();

    const detail = this._buildDetail();
    this._emit('intl-select', detail);
    this._emit('intl-change', detail);

    // Close on single date selection (not range start, not multiple mode)
    if (this._state.type === 'multiple') {
      // Stay open for multi-select
    } else if (this._state.type === 'week') {
      // Week mode always completes (rangeStart + rangeEnd set at once)
      if (!this._state.inline) {
        setTimeout(() => this._closeCalendar(), 150);
      }
    } else if (this._state.type !== 'range' || this._state.rangeEnd) {
      if (!this._state.inline) {
        // Small delay for visual feedback
        setTimeout(() => this._closeCalendar(), 150);
      }
    }
  }

  _selectToday() {
    const todayDate = toCalendar(today(getTimeZone()), this._state.calendar);

    if (isDateDisabled(this._state, todayDate)) return;

    this._state = updateState(this._state, {
      viewYear: todayDate.year,
      viewMonth: todayDate.month,
    });
    this._selectDate(todayDate);
  }

  _dateFromBtn(btn) {
    const y = parseInt(btn.dataset.year);
    const m = parseInt(btn.dataset.month);
    const d = parseInt(btn.dataset.day);
    try {
      return new CalendarDate(this._state.calendar, y, m, d);
    } catch {
      return null;
    }
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
      this._selectDate(this._state.focusedDate);
      return;
    }

    if (action === 'close') {
      this._closeCalendar();
      return;
    }

    if (action === 'startOfWeek' || action === 'endOfWeek') {
      const newDate = action === 'startOfWeek'
        ? startOfWeek(this._state.focusedDate, this._state.locale)
        : endOfWeek(this._state.focusedDate, this._state.locale);
      const oldViewYear = this._state.viewYear;
      const oldViewMonth = this._state.viewMonth;
      this._state = updateState(this._state, {
        focusedDate: newDate,
        viewYear: newDate.year,
        viewMonth: newDate.month,
      });
      this._stabilizeMultiMonthView(oldViewYear, oldViewMonth);
      this._renderCalendarContent();
      this._focusCurrentDay();
      return;
    }

    const isPageKey = e.key === 'PageUp' || e.key === 'PageDown';
    const oldViewYear = this._state.viewYear;
    const oldViewMonth = this._state.viewMonth;
    this._state = moveFocus(this._state, action);
    if (!isPageKey) {
      this._stabilizeMultiMonthView(oldViewYear, oldViewMonth);
    }
    this._renderCalendarContent();
    this._focusCurrentDay();
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
          this._view = 'days';
          this._renderCalendarContent();
          this._focusCurrentDay();
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
    const calendar = this.shadowRoot.querySelector('.idp-calendar');
    if (!calendar) return;

    const focusable = Array.from(
      calendar.querySelectorAll('button:not([disabled]):not([hidden]), [tabindex="0"]'),
    );
    if (focusable.length === 0) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey) {
      if (e.target === first || !calendar.contains(e.target)) {
        e.preventDefault();
        last.focus();
      }
    } else {
      if (e.target === last || !calendar.contains(e.target)) {
        e.preventDefault();
        first.focus();
      }
    }
  }

  _focusCurrentDay() {
    requestAnimationFrame(() => {
      const focused = this.shadowRoot.querySelector('.idp-day[tabindex="0"]');
      if (focused) focused.focus();
    });
  }

  _stabilizeMultiMonthView(oldViewYear, oldViewMonth) {
    const monthCount = this._getMonthCount();
    if (monthCount <= 1) return;
    const focused = this._state.focusedDate;
    // Check if focused date falls within any of the visible panels
    for (let i = 0; i < monthCount; i++) {
      const panelDate = new CalendarDate(
        this._state.calendar, oldViewYear, oldViewMonth, 1,
      ).add({ months: i });
      if (focused.year === panelDate.year && focused.month === panelDate.month) {
        // Still within visible panels — restore the old view
        this._state = updateState(this._state, {
          viewYear: oldViewYear,
          viewMonth: oldViewMonth,
        });
        return;
      }
    }
  }

  _shouldAnimate() {
    return !this.hasAttribute('no-animation') && !this.hasAttribute('inline');
  }

  _openCalendar() {
    if (this._state.isOpen) return;

    // Dispatch cancelable intl-open event
    const openEvent = new CustomEvent('intl-open', { bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(openEvent)) return;

    // Cancel any in-progress close animation
    if (this._animatingClose) {
      this._animatingClose = false;
      const cal = this.shadowRoot.querySelector('.idp-calendar');
      if (cal) cal.classList.remove('idp-animating-out');
    }

    // Close other open instances
    if (openInstance && openInstance !== this) {
      openInstance.close();
    }
    openInstance = this;

    // Capture the element that had focus when the picker opened, so we can
    // return focus to it on close. Prefer the slotted/external input when set,
    // since that's the user-visible trigger.
    this._lastTrigger = this._externalInput
      || this._slottedInput
      || (typeof document !== 'undefined' ? document.activeElement : null);

    this._state = updateState(this._state, { isOpen: true });
    // Set initial view based on type
    if (this._state.type === 'month') {
      this._view = 'months';
    } else if (this._state.type === 'year') {
      this._view = 'years';
    } else {
      this._view = 'days';
    }
    this._render();

    const trigger = this.shadowRoot.querySelector('.idp-input-wrapper') || this._externalInput;
    const calendar = this.shadowRoot.querySelector('.idp-calendar');

    if (trigger && calendar) {
      this._destroyPositioning();
      this._positionCleanup = positionCalendar(trigger, calendar);
    }

    // Animate open
    if (this._shouldAnimate() && calendar) {
      calendar.classList.add('idp-animating-in');
      const onEnd = () => {
        calendar.classList.remove('idp-animating-in');
        calendar.removeEventListener('animationend', onEnd);
      };
      calendar.addEventListener('animationend', onEnd);
    }

    document.addEventListener('keydown', this._boundKeydown);
    requestAnimationFrame(() => {
      if (this._state.isOpen) {
        document.addEventListener('click', this._boundClose);
      }
      const focused = this.shadowRoot.querySelector('.idp-day[tabindex="0"]');
      if (focused) focused.focus();
    });
  }

  _closeCalendar() {
    if (!this._state.isOpen) return;

    // Dispatch cancelable intl-close event
    const closeEvent = new CustomEvent('intl-close', { bubbles: true, composed: true, cancelable: true });
    if (!this.dispatchEvent(closeEvent)) return;

    this._state = updateState(this._state, { isOpen: false });

    const calendar = this.shadowRoot.querySelector('.idp-calendar');

    if (this._shouldAnimate() && calendar) {
      this._animatingClose = true;
      calendar.classList.add('idp-animating-out');
      const onEnd = () => {
        calendar.removeEventListener('animationend', onEnd);
        this._animatingClose = false;
        calendar.classList.remove('idp-animating-out');
        calendar.setAttribute('hidden', '');
        this._destroyPositioning();
      };
      calendar.addEventListener('animationend', onEnd);
    } else {
      if (calendar) calendar.setAttribute('hidden', '');
      this._destroyPositioning();
    }

    // Update the input's aria-expanded
    const input = this.shadowRoot.querySelector('.idp-input');
    if (input) input.setAttribute('aria-expanded', 'false');

    document.removeEventListener('click', this._boundClose);
    document.removeEventListener('keydown', this._boundKeydown);

    if (openInstance === this) openInstance = null;

    // Only restore focus if it's still inside our shadow root — otherwise the
    // user has already moved focus elsewhere and we shouldn't steal it.
    const focusInsidePicker = this.shadowRoot.activeElement
      || (typeof document !== 'undefined' && document.activeElement === this);

    if (focusInsidePicker) {
      this._closingCalendar = true;
      const trigger = this._lastTrigger
        || this.shadowRoot.querySelector('.idp-input')
        || this._externalInput;
      if (trigger && typeof trigger.focus === 'function') trigger.focus();
      this._closingCalendar = false;
    }
    this._lastTrigger = null;
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
    if (!forId) {
      this._externalInput = null;
      return;
    }

    const input = document.getElementById(forId);
    if (!input) return;

    this._externalInput = input;
    this._boundExternalMousedown = () => {
      this._mouseActivated = true;
    };
    this._boundExternalFocus = () => {
      // Only open on keyboard/programmatic focus — mouse clicks handled via click handler
      const byMouse = this._mouseActivated;
      this._mouseActivated = false;
      if (byMouse || this.hasAttribute('disabled') || this._state.isOpen || this._closingCalendar) return;
      this._openCalendar();
    };
    this._boundExternalClick = () => {
      this._mouseActivated = false;
      if (this.hasAttribute('disabled')) return;
      this._state.isOpen ? this._closeCalendar() : this._openCalendar();
    };
    input.addEventListener('mousedown', this._boundExternalMousedown);
    input.addEventListener('click', this._boundExternalClick);
    input.addEventListener('focus', this._boundExternalFocus);

    // If the external input has a value, try to parse it
    if (input.value && !this.getAttribute('value')) {
      const parsed = parseInput(input.value, this._state.calendarId, this._state.locale, this.getAttribute('date-format'));
      if (parsed) {
        this._state = selectDate(this._state, parsed);
        this._updateFormValue();
      }
    }
  }

  _updateExternalInput() {
    if (this._externalInput) {
      this._externalInput.value = this.displayValue;
    }
    if (this._slottedInput) {
      this._slottedInput.value = this.displayValue;
    }
  }

  _announceMonth() {
    const live = this.shadowRoot.querySelector('#idp-live');
    if (!live) return;
    const text = formatMonthYear(
      this._state.viewYear,
      this._state.viewMonth,
      this._state.locale,
      this._state.calendarId,
    );
    live.textContent = '';
    requestAnimationFrame(() => { live.textContent = text; });
  }

  _formatDayLabel(date) {
    try {
      return this._dayLabelFormatter.format(calendarDateToNative(date));
    } catch {
      return `${date.day}`;
    }
  }

  _renderSafe() {
    this._render();
    if (this._state.isOpen && !this._state.inline) {
      // Re-establish positioning on the new calendar DOM element
      const trigger = this.shadowRoot.querySelector('.idp-input-wrapper') || this._externalInput;
      const calendar = this.shadowRoot.querySelector('.idp-calendar');
      if (trigger && calendar) {
        this._destroyPositioning();
        this._positionCleanup = positionCalendar(trigger, calendar);
      }
    }
  }

  _updateDir() {
    if (this._state?._isRTL) {
      this.setAttribute('dir', 'rtl');
    } else {
      this.removeAttribute('dir');
    }
  }

  // Returns ISO 8601 week-year and week number (Monday-based, Gregorian).
  // Note: for non-Monday-start locales (e.g. Persian fa-IR uses Saturday-start),
  // the event detail's `start`/`end` reflect the user-selected 7-day window
  // (Saturday–Friday) which may represent a *different* 7-day span than `value:'YYYY-Www'`,
  // which always follows ISO 8601 (the Monday-based week containing the Thursday).
  // `start`/`end` are authoritative for the selection; `value` is the ISO week identifier.
  // Also: late December / early January can shift year (Dec 29 → W01 of next year).
  _getISOWeek(date) {
    try {
      const native = calendarDateToNative(date);
      const d = new Date(Date.UTC(native.getFullYear(), native.getMonth(), native.getDate()));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      return { year: d.getUTCFullYear(), week: Math.ceil(((d - yearStart) / 86400000 + 1) / 7) };
    } catch {
      return { year: 0, week: 0 };
    }
  }

  _getCalendarWeek(date) {
    try {
      const locale = this._state.locale;
      const minDays = this._minimalDays;
      const dateWeekStart = startOfWeek(date, locale);
      const pivotDay = dateWeekStart.add({ days: minDays - 1 });
      const weekYear = pivotDay.year;
      const yearStart = new CalendarDate(date.calendar, weekYear, 1, 1);
      let week1Start = startOfWeek(yearStart, locale);
      const week1Pivot = week1Start.add({ days: minDays - 1 });
      if (week1Pivot.year < weekYear) {
        week1Start = week1Start.add({ days: 7 });
      }
      return { year: weekYear, week: Math.floor(dateWeekStart.compare(week1Start) / 7) + 1 };
    } catch {
      return { year: 0, week: 0 };
    }
  }

  _getWeekNumber(date) {
    return this._getCalendarWeek(date).week;
  }

  _formatYearDisplay(year) {
    try {
      const date = new CalendarDate(this._state.calendar, year, 1, 1);
      const intlCal = resolveIntlCalendar(this._state.calendarId);
      const formatter = new Intl.DateTimeFormat(this._state.locale, {
        year: 'numeric',
        calendar: intlCal,
      });
      return formatter.format(calendarDateToNative(date));
    } catch {
      return String(year);
    }
  }

  _formatDayNumber(day) {
    try {
      return this._dayNumberFormatter.format(day);
    } catch {
      return String(day);
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
