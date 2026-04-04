import { toCalendar, today, CalendarDate, startOfWeek, endOfWeek } from '@internationalized/date';
import { styles, calendarIcon, clearIcon } from './styles.js';
import { resolveLocale, isRTL, getWeekdayNames } from './core/locale.js';
import { calendarDateToNative, resolveIntlCalendar, getTimeZone } from './utils/common.js';
import {
  createState, updateState, selectDate, moveFocus,
  goToMonth, toISO, parseISOToCalendar, isDateDisabled,
} from './core/state.js';
import { generateMonthGrid } from './core/calendar-grid.js';
import { renderHeader, renderYearGrid, renderMonthGrid as renderMonthPicker } from './core/calendar-header.js';
import { formatDateShort, formatRange, formatMonthYear, getGregorianEquivalent } from './utils/format.js';
import { positionCalendar } from './core/positioning.js';
import { parseInput } from './core/date-input.js';

// Track the currently open instance to close others
let openInstance = null;

const FOOTER_LABELS = {
  en: { today: 'Today', clear: 'Clear' },
  fa: { today: 'امروز', clear: 'پاک کردن' },
  ar: { today: 'اليوم', clear: 'مسح' },
  he: { today: 'היום', clear: 'נקה' },
  de: { today: 'Heute', clear: 'Löschen' },
  fr: { today: "Aujourd'hui", clear: 'Effacer' },
  ja: { today: '今日', clear: 'クリア' },
  zh: { today: '今天', clear: '清除' },
  ko: { today: '오늘', clear: '지우기' },
  hi: { today: 'आज', clear: 'साफ़ करें' },
  th: { today: 'วันนี้', clear: 'ล้าง' },
};

class IntlDatepicker extends HTMLElement {
  static formAssociated = true;

  static get observedAttributes() {
    return [
      'calendar', 'locale', 'value', 'type', 'min', 'max',
      'for', 'inline', 'disabled', 'readonly', 'required',
      'placeholder', 'show-alternate', 'name',
    ];
  }

  constructor() {
    super();
    this.attachShadow({ mode: 'open', delegatesFocus: true });
    this.shadowRoot.adoptedStyleSheets = [styles];

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
        this._render();
        break;
      case 'for':
        this._setupExternalInput();
        break;
    }
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
    return toISO(this._state?.selectedDate);
  }

  set value(v) {
    this._setValue(v, true);
  }

  get valueAsDate() {
    const iso = this.value;
    if (!iso || iso.includes('/')) return null;
    return new Date(iso + 'T00:00:00');
  }

  get calendarValue() {
    return this._state?.selectedDate || null;
  }

  get displayValue() {
    if (!this._state) return '';
    if (this._state.type === 'range') {
      return formatRange(this._state.rangeStart, this._state.rangeEnd, this._state.locale, this._state.calendarId);
    }
    return formatDateShort(this._state.selectedDate, this._state.locale, this._state.calendarId);
  }

  get rangeStart() {
    return this._state?.rangeStart ? toISO(this._state.rangeStart) : null;
  }

  get rangeEnd() {
    return this._state?.rangeEnd ? toISO(this._state.rangeEnd) : null;
  }

  getValue() {
    if (!this._state?.selectedDate && !this._state?.rangeStart) return null;

    if (this._state.type === 'range' && this._state.rangeStart) {
      const s = this._state.rangeStart;
      const e = this._state.rangeEnd;
      return {
        iso: e ? `${toISO(s)}/${toISO(e)}` : toISO(s),
        rangeStart: { year: s.year, month: s.month, day: s.day },
        rangeEnd: e ? { year: e.year, month: e.month, day: e.day } : null,
        formatted: this.displayValue,
      };
    }

    const date = this._state.selectedDate;
    return {
      iso: toISO(date),
      calendar: { year: date.year, month: date.month, day: date.day },
      formatted: this.displayValue,
    };
  }

  setValue(isoDate) {
    this._setValue(isoDate, true);
  }

  clear() {
    this._state = updateState(this._state, {
      selectedDate: null,
      rangeStart: null,
      rangeEnd: null,
    });
    this._render();
    this._updateFormValue();
    this._updateExternalInput();
    this._emit('intl-change', { iso: '', calendar: null, formatted: '' });
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
    const calendarId = this.getAttribute('calendar') || 'gregory';
    const locale = resolveLocale(this.getAttribute('locale'));

    this._state = createState({
      calendarId,
      locale,
      value: this.getAttribute('value') || null,
      type: this.getAttribute('type') || 'date',
      min: this.getAttribute('min') || null,
      max: this.getAttribute('max') || null,
      inline: this.hasAttribute('inline'),
    });

    this._state._isRTL = isRTL(locale);

    // Cache formatters that depend on locale/calendar (avoid re-creation per cell)
    const intlCal = resolveIntlCalendar(calendarId);
    this._dayLabelFormatter = new Intl.DateTimeFormat(locale, {
      weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
      calendar: intlCal,
    });
    this._dayNumberFormatter = new Intl.NumberFormat(locale, { useGrouping: false });
  }

  _setValue(isoValue, emitEvent) {
    if (!this._state) return;
    const calendar = this._state.calendar;

    if (!isoValue) {
      this._state = updateState(this._state, {
        selectedDate: null,
        rangeStart: null,
        rangeEnd: null,
      });
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
      this._emit('intl-change', this.getValue() || { iso: '', calendar: null, formatted: '' });
    }
  }

  _updateFormValue() {
    if (!this._internals) return;
    const val = this.value;
    this._internals.setFormValue(val || null);

    const anchor = this.shadowRoot.querySelector('.idp-input');

    if (this.hasAttribute('required') && !val) {
      this._internals.setValidity({ valueMissing: true }, 'Please select a date', anchor);
      return;
    }

    if (val && this.getAttribute('min')) {
      const min = this.getAttribute('min');
      if (val < min) {
        this._internals.setValidity({ rangeUnderflow: true }, `Date must be ${min} or later`, anchor);
        return;
      }
    }

    if (val && this.getAttribute('max')) {
      const max = this.getAttribute('max');
      if (val > max) {
        this._internals.setValidity({ rangeOverflow: true }, `Date must be ${max} or earlier`, anchor);
        return;
      }
    }

    this._internals.setValidity({});
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
    if (!hasFor) {
      html += `
        <div class="idp-input-wrapper" part="input-wrapper">
          <slot name="input">
            <input class="idp-input" part="input"
              type="text"
              readonly
              value="${this._escAttr(displayVal)}"
              placeholder="${this._escAttr(placeholder)}"
              ${isDisabled ? 'disabled' : ''}
              ${isReadonly ? 'readonly' : ''}
              aria-haspopup="dialog"
              aria-expanded="${this._state.isOpen}"
              role="combobox"
              autocomplete="off"
            />
          </slot>
          ${displayVal ? `<button class="idp-clear-btn" data-action="clear" aria-label="Clear date" type="button">${clearIcon}</button>` : ''}
          ${calendarIcon}
        </div>
      `;
    }

    // Calendar panel
    html += `
      <div class="idp-calendar" part="calendar"
        role="dialog"
        aria-modal="${!isInline}"
        aria-label="Date picker"
        ${!isInline && !this._state.isOpen ? 'hidden' : ''}
      >
        <div aria-live="polite" class="idp-sr-only" id="idp-live"></div>
        ${this._renderCalendarInner(showAlternate)}
      </div>
    `;

    this.shadowRoot.innerHTML = html;
  }

  _renderCalendarInner(showAlternate) {
    let inner = renderHeader(this._state, this._view);

    if (this._view === 'years') {
      inner += renderYearGrid(this._state);
    } else if (this._view === 'months') {
      inner += renderMonthPicker(this._state);
    } else {
      inner += this._renderDayGrid();
    }

    // Footer with localized labels
    const todayLabel = this._getLocalizedLabel('today');
    const clearLabel = this._getLocalizedLabel('clear');
    inner += `
      <div class="idp-footer">
        <button class="idp-footer-btn" data-action="today" type="button">${todayLabel}</button>
        <button class="idp-footer-btn" data-action="clear" type="button">${clearLabel}</button>
      </div>
    `;

    if (showAlternate && this._state.selectedDate) {
      const alt = getGregorianEquivalent(this._state.selectedDate, this._state.locale);
      inner += `<div class="idp-alternate" part="alternate">${alt}</div>`;
    }

    return inner;
  }

  _renderDayGrid() {
    const weekdays = getWeekdayNames(this._state.locale, 'narrow');
    const grid = generateMonthGrid(this._state);

    let html = '<div class="idp-weekdays" role="row">';
    for (const wd of weekdays) {
      html += `<div class="idp-weekday" role="columnheader">${wd}</div>`;
    }
    html += '</div>';

    html += '<div class="idp-days" role="grid" aria-label="Calendar">';

    for (const week of grid) {
      html += '<div role="row" style="display:contents">';
      for (const cell of week) {
        const classes = ['idp-day'];
        if (!cell.isCurrentMonth) classes.push('outside');
        if (cell.isToday) classes.push('today');
        if (cell.isSelected) classes.push('selected');
        if (cell.disabled) classes.push('disabled');
        if (cell.inRange) classes.push('in-range');
        if (cell.isRangeStart) classes.push('range-start');
        if (cell.isRangeEnd) classes.push('range-end');

        const tabIdx = cell.isFocused ? '0' : '-1';
        const ariaSelected = cell.isSelected || cell.isRangeStart || cell.isRangeEnd ? 'true' : 'false';

        // Format the accessible label
        const label = this._formatDayLabel(cell.date);

        html += `<button class="${classes.join(' ')}"
          role="gridcell"
          tabindex="${tabIdx}"
          aria-selected="${ariaSelected}"
          ${cell.disabled ? 'aria-disabled="true"' : ''}
          aria-label="${label}"
          data-action="select-day"
          data-year="${cell.date.year}"
          data-month="${cell.date.month}"
          data-day="${cell.date.day}"
          type="button"
        >${this._formatDayNumber(cell.day)}</button>`;
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
    // Keep the calendar element, update its innerHTML
    const hidden = calendarEl.hasAttribute('hidden');
    calendarEl.innerHTML = `<div aria-live="polite" class="idp-sr-only" id="idp-live"></div>${inner}`;
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

    // Range hover preview — use a single mouseover handler for both
    // setting and clearing hoveredDate (mouseleave doesn't fire on ShadowRoot)
    if (this._state.type === 'range') {
      shadow.addEventListener('mouseover', (e) => {
        if (!this._state.rangeStart || this._state.rangeEnd) return;

        const dayBtn = e.target.closest('.idp-day');
        if (dayBtn && !dayBtn.hasAttribute('aria-disabled')) {
          const date = this._dateFromBtn(dayBtn);
          this._state = updateState(this._state, { hoveredDate: date });
          this._renderCalendarContent();
        } else if (this._state.hoveredDate) {
          // Mouse moved off the day grid — clear preview
          this._state = updateState(this._state, { hoveredDate: null });
          this._renderCalendarContent();
        }
      });
    }

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
        const year = parseInt(btn.dataset.year);
        this._state = updateState(this._state, { viewYear: year });
        this._view = 'months';
        this._renderCalendarContent();
        break;
      }
      case 'select-month': {
        const month = parseInt(btn.dataset.month);
        this._state = goToMonth(this._state, this._state.viewYear, month);
        this._view = 'days';
        this._renderCalendarContent();
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

    const detail = {
      iso: toISO(date),
      calendar: { year: date.year, month: date.month, day: date.day },
      formatted: this.displayValue,
    };
    this._emit('intl-select', detail);
    this._emit('intl-change', detail);

    // Close on single date selection (not range start)
    if (this._state.type !== 'range' || this._state.rangeEnd) {
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
      this._state = updateState(this._state, {
        focusedDate: newDate,
        viewYear: newDate.year,
        viewMonth: newDate.month,
      });
      this._renderCalendarContent();
      this._focusCurrentDay();
      return;
    }

    this._state = moveFocus(this._state, action);
    this._renderCalendarContent();
    this._focusCurrentDay();
  }

  _handleMonthYearKeydown(e, cellSelector, actionName) {
    const cells = Array.from(this.shadowRoot.querySelectorAll(cellSelector));
    const current = e.target.closest(cellSelector);
    const idx = cells.indexOf(current);
    if (idx === -1) return;

    const cols = 4;
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
        this._view = 'days';
        this._renderCalendarContent();
        this._focusCurrentDay();
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

  _openCalendar() {
    if (this._state.isOpen) return;

    // Close other open instances
    if (openInstance && openInstance !== this) {
      openInstance.close();
    }
    openInstance = this;

    this._state = updateState(this._state, { isOpen: true });
    this._view = 'days';
    this._render();

    const trigger = this.shadowRoot.querySelector('.idp-input-wrapper') || this._externalInput;
    const calendar = this.shadowRoot.querySelector('.idp-calendar');

    if (trigger && calendar) {
      this._destroyPositioning();
      this._positionCleanup = positionCalendar(trigger, calendar);
    }

    document.addEventListener('click', this._boundClose);
    document.addEventListener('keydown', this._boundKeydown);

    // Focus the selected/today cell
    requestAnimationFrame(() => this._focusCurrentDay());
  }

  _closeCalendar() {
    if (!this._state.isOpen) return;

    this._state = updateState(this._state, { isOpen: false });
    this._destroyPositioning();

    const calendar = this.shadowRoot.querySelector('.idp-calendar');
    if (calendar) {
      calendar.setAttribute('hidden', '');
      try { calendar.hidePopover?.(); } catch {}
    }

    // Update the input's aria-expanded
    const input = this.shadowRoot.querySelector('.idp-input');
    if (input) input.setAttribute('aria-expanded', 'false');

    document.removeEventListener('click', this._boundClose);
    document.removeEventListener('keydown', this._boundKeydown);

    if (openInstance === this) openInstance = null;

    // Return focus to input
    const trigger = this.shadowRoot.querySelector('.idp-input') || this._externalInput;
    if (trigger) trigger.focus();
  }

  _onOutsideClick(e) {
    if (!this._state.isOpen) return;
    if (this.contains(e.target) || this.shadowRoot.contains(e.target)) return;
    if (this._externalInput && this._externalInput.contains(e.target)) return;
    this._closeCalendar();
  }

  _onDocumentKeydown(e) {
    if (e.key === 'Escape' && this._state.isOpen) {
      this._closeCalendar();
    }
  }

  _cleanupExternalInput() {
    if (this._externalInput && this._boundExternalClick) {
      this._externalInput.removeEventListener('click', this._boundExternalClick);
      this._externalInput.removeEventListener('focus', this._boundExternalFocus);
    }
    this._boundExternalClick = null;
    this._boundExternalFocus = null;
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
    this._boundExternalClick = () => {
      if (!this.hasAttribute('disabled')) {
        this._state.isOpen ? this._closeCalendar() : this._openCalendar();
      }
    };
    this._boundExternalFocus = () => {
      if (!this.hasAttribute('disabled') && !this._state.isOpen) {
        this._openCalendar();
      }
    };
    input.addEventListener('click', this._boundExternalClick);
    input.addEventListener('focus', this._boundExternalFocus);

    // If the external input has a value, try to parse it
    if (input.value && !this.getAttribute('value')) {
      const parsed = parseInput(input.value, this._state.calendarId, this._state.locale);
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
    if (this._state.isOpen) {
      // Preserve the calendar DOM element to keep floating-ui positioning alive
      this._renderCalendarContent();
      // Also update the input display
      const input = this.shadowRoot.querySelector('.idp-input');
      if (input) input.value = this.displayValue;
    } else {
      this._render();
    }
  }

  _updateDir() {
    if (this._state?._isRTL) {
      this.setAttribute('dir', 'rtl');
    } else {
      this.removeAttribute('dir');
    }
  }

  _formatDayNumber(day) {
    try {
      return this._dayNumberFormatter.format(day);
    } catch {
      return String(day);
    }
  }

  _getLocalizedLabel(key) {
    const lang = (this._state?.locale || 'en').split('-')[0];
    const set = FOOTER_LABELS[lang] || FOOTER_LABELS.en;
    return set[key] || FOOTER_LABELS.en[key];
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

  _escAttr(str) {
    return (str || '').replace(/"/g, '&quot;').replace(/</g, '&lt;');
  }
}

customElements.define('intl-datepicker', IntlDatepicker);

export { IntlDatepicker };
