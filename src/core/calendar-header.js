import { CalendarDate, toCalendar, startOfMonth, startOfYear, endOfYear } from '@internationalized/date';
import { chevronLeft, chevronRight, chevronDown } from '../styles.js';
import { formatMonthYear } from '../utils/format.js';
import { escAttr, calendarDateToNative } from '../utils/common.js';
import { getCalendar } from './locale.js';
import { getMonthOptions } from './calendar-grid.js';
import { getNavLimits, firstOfView, toISO } from './state.js';

// Japanese years restart with each era, so its year view and dropdown list
// Gregorian years, labelled in their era. Other calendars use native years.
const isJapanese = (state) => state.calendarId === 'japanese';

function yearOf(state, date) {
  return isJapanese(state) ? toCalendar(date, getCalendar('gregory')).year : date.year;
}

function yearStart(state, year) {
  return isJapanese(state)
    ? toCalendar(new CalendarDate(year, 1, 1), state.calendar)
    : new CalendarDate(state.calendar, year, 1, 1);
}

function yearLabel(state, date) {
  return isJapanese(state)
    ? state._fmt.year.format(calendarDateToNative(date))
    : state._fmt.number.format(date.year);
}

// A year cell starting at `date`. A Japanese year that changes era names
// both, e.g. "31 Heisei – 1 Reiwa".
function yearCellLabel(state, date) {
  return isJapanese(state)
    ? state._fmt.year.formatRange(calendarDateToNative(date), calendarDateToNative(endOfYear(date)))
    : yearLabel(state, date);
}

// Year cells from `low` to `high`: `{year, date, disabled}`, where `date` is
// the year's first day and `disabled` means wholly outside min/max.
function yearCells(state, low, high) {
  const cells = [];
  for (let y = low; y <= high; y++) {
    const date = yearStart(state, y);
    const disabled = !!((state.min && date.compare(startOfYear(state.min)) < 0) || (state.max && date.compare(state.max) > 0));
    cells.push({ year: y, date, disabled });
  }
  return cells;
}

function renderMonthDropdown(state, months) {
  let html = `<select class="idp-dropdown idp-month-dropdown" part="month-dropdown" data-action="dropdown-month" aria-label="${escAttr(state.labels.selectMonth)}">`;
  for (const m of months) {
    html += `<option value="${m.iso}"${m.value === state.viewMonth ? ' selected' : ''}>${escAttr(m.label)}</option>`;
  }
  return html + '</select>';
}

function renderYearDropdown(state) {
  const view = yearOf(state, firstOfView(state));
  const low = Math.min(state.min ? yearOf(state, state.min) : view - 100, view);
  const high = Math.max(state.max ? yearOf(state, state.max) : view + 20, view);
  let html = `<select class="idp-dropdown idp-year-dropdown" part="year-dropdown" data-action="dropdown-year" aria-label="${escAttr(state.labels.selectYear)}">`;
  for (const { year, date } of yearCells(state, low, high)) {
    html += `<option value="${toISO(date)}"${year === view ? ' selected' : ''}>${escAttr(yearCellLabel(state, date))}</option>`;
  }
  return html + '</select>';
}

/**
 * Previous/next month buttons. At the min/max limit they stay focusable but
 * get `aria-disabled`, so keyboard focus isn't lost when the limit is hit.
 */
export function renderNavButton(dir, state, disabled) {
  const isPrev = dir === 'prev';
  const arrow = isPrev === !state._isRTL ? chevronLeft : chevronRight;
  const label = isPrev ? state.labels.previousMonth : state.labels.nextMonth;
  return `<button class="idp-nav-btn" part="nav-${dir}" data-action="${dir}-month" aria-label="${escAttr(label)}" type="button"${disabled ? ' aria-disabled="true"' : ''}>${arrow}</button>`;
}

/**
 * Render the calendar header with month/year navigation.
 * `titleId` is the id the day grid's `aria-labelledby` points at.
 * Returns HTML string.
 */
export function renderHeader(state, view, captionLayout = 'button', titleId = 'idp-title-0') {
  const { viewMonth, labels } = state;
  const isRTL = state._isRTL;
  const prevArrow = isRTL ? chevronRight : chevronLeft;
  const nextArrow = isRTL ? chevronLeft : chevronRight;

  if (view === 'years') {
    return renderYearViewHeader(state, prevArrow, nextArrow);
  }

  if (view === 'months') {
    return renderMonthViewHeader(state);
  }

  // Dropdown caption layouts
  if (captionLayout !== 'button') {
    const months = getMonthOptions(state, state._fmt);
    const limits = getNavLimits(state);
    const title = formatMonthYear(firstOfView(state), state._fmt);
    let titleContent = `<span class="idp-sr-only" id="${titleId}">${title}</span>`;

    if (captionLayout === 'dropdown') {
      titleContent += renderMonthDropdown(state, months) + renderYearDropdown(state);
    } else if (captionLayout === 'dropdown-months') {
      titleContent += renderMonthDropdown(state, months) +
        `<button class="idp-header-btn" data-action="show-years" type="button" aria-label="${escAttr(labels.selectYear)}">${yearLabel(state, firstOfView(state))} ${chevronDown}</button>`;
    } else if (captionLayout === 'dropdown-years') {
      const currentMonthName = months.find(m => m.value === viewMonth)?.label || '';
      titleContent += `<button class="idp-header-btn" data-action="show-months" type="button" aria-label="${escAttr(labels.selectMonth)}">${escAttr(currentMonthName)}</button>` +
        renderYearDropdown(state);
    }

    return `
      <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.calendarNavigation)}">
        ${renderNavButton('prev', state, limits.prev)}
        <div class="idp-header-title idp-header-dropdowns" part="header-title">
          ${titleContent}
        </div>
        ${renderNavButton('next', state, limits.next)}
      </div>
    `;
  }

  const headerTitle = formatMonthYear(firstOfView(state), state._fmt);
  const limits = getNavLimits(state);

  // The button's name keeps the visible month text (WCAG 2.5.3 label-in-name).
  return `
    <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.calendarNavigation)}">
      ${renderNavButton('prev', state, limits.prev)}
      <div class="idp-header-title" part="header-title">
        <button class="idp-header-btn" data-action="show-months" type="button" aria-label="${escAttr(`${headerTitle}, ${labels.selectMonth}`)}">
          <span id="${titleId}">${headerTitle}</span> ${chevronDown}
        </button>
      </div>
      ${renderNavButton('next', state, limits.next)}
    </div>
  `;
}

function renderYearViewHeader(state, prevArrow, nextArrow) {
  const { labels } = state;
  const decadeStart = Math.floor(yearOf(state, firstOfView(state)) / 20) * 20;
  const num = state._fmt.number;

  return `
    <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.yearSelection)}">
      <button class="idp-nav-btn" part="nav-prev" data-action="prev-decade" aria-label="${escAttr(labels.previousDecade)}" type="button">
        ${prevArrow}
      </button>
      <div class="idp-header-title" part="header-title">
        <button class="idp-header-btn" data-action="show-days" type="button">
          ${num.format(decadeStart)} – ${num.format(decadeStart + 19)}
        </button>
      </div>
      <button class="idp-nav-btn" part="nav-next" data-action="next-decade" aria-label="${escAttr(labels.nextDecade)}" type="button">
        ${nextArrow}
      </button>
    </div>
  `;
}

function renderMonthViewHeader(state) {
  const { labels } = state;
  return `
    <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.monthSelection)}">
      <div class="idp-header-title" part="header-title">
        <button class="idp-header-btn" data-action="show-years" type="button" aria-label="${escAttr(labels.selectYear)}">
          ${yearLabel(state, firstOfView(state))} ${chevronDown}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render a grid of years for the year picker view. Each cell carries the ISO
 * date of its year's first day.
 */
export function renderYearGrid(state) {
  const view = yearOf(state, firstOfView(state));
  const decadeStart = Math.floor(view / 20) * 20;
  let html = `<div class="idp-year-grid" role="group" aria-label="${escAttr(state.labels.yearSelection)}">`;

  for (const { year, date, disabled } of yearCells(state, decadeStart, decadeStart + 19)) {
    const isCurrent = year === view;
    html += `<button class="idp-year-cell${isCurrent ? ' selected' : ''}" part="year-cell" data-action="select-year" data-year="${year}" data-iso="${toISO(date)}" type="button"
      ${isCurrent ? 'aria-current="true"' : ''}
      ${disabled ? 'aria-disabled="true" disabled' : ''}>${escAttr(yearCellLabel(state, date))}</button>`;
  }

  return html + '</div>';
}

/**
 * Render a grid of months for the month picker view.
 */
export function renderMonthGrid(state) {
  const { min, max } = state;
  let html = `<div class="idp-month-grid" role="group" aria-label="${escAttr(state.labels.monthSelection)}">`;

  for (const month of getMonthOptions(state, state._fmt)) {
    const isCurrent = month.value === state.viewMonth;
    const isDisabled = (min && month.date.compare(startOfMonth(min)) < 0) || (max && month.date.compare(max) > 0);
    html += `<button class="idp-month-cell${isCurrent ? ' selected' : ''}" part="month-cell" data-action="select-month" data-month="${month.value}" data-iso="${month.iso}" type="button"
      ${isCurrent ? 'aria-current="true"' : ''}
      ${isDisabled ? 'aria-disabled="true" disabled' : ''}>${escAttr(month.label)}</button>`;
  }

  return html + '</div>';
}
