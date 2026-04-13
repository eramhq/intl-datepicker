import { chevronLeft, chevronRight, chevronDown } from '../styles.js';
import { formatMonthYear } from '../utils/format.js';
import { escAttr } from '../utils/common.js';
import { applyNumerals } from './locale.js';
import { getMonthOptions, getMonthCount } from './calendar-grid.js';

function getYearFormatter(state) {
  try {
    return new Intl.NumberFormat(applyNumerals(state.locale, state.numerals), { useGrouping: false });
  } catch { return null; }
}

function formatYearNum(year, formatter) {
  return formatter ? formatter.format(year) : String(year);
}

function getYearRange(state) {
  const minYear = state.min ? state.min.year : state.viewYear - 100;
  const maxYear = state.max ? state.max.year : state.viewYear + 20;
  const low = Math.min(minYear, state.viewYear);
  const high = Math.max(maxYear, state.viewYear);
  return { low, high };
}

function renderMonthDropdown(state, months) {
  let html = `<select class="idp-dropdown idp-month-dropdown" part="month-dropdown" data-action="dropdown-month" aria-label="${escAttr(state.labels.selectMonth)}">`;
  for (const m of months) {
    html += `<option value="${m.value}"${m.value === state.viewMonth ? ' selected' : ''}>${escAttr(m.label)}</option>`;
  }
  html += '</select>';
  return html;
}

function renderYearDropdown(state, yearFmt) {
  const { low, high } = getYearRange(state);
  let html = `<select class="idp-dropdown idp-year-dropdown" part="year-dropdown" data-action="dropdown-year" aria-label="${escAttr(state.labels.selectYear)}">`;
  for (let y = low; y <= high; y++) {
    html += `<option value="${y}"${y === state.viewYear ? ' selected' : ''}>${formatYearNum(y, yearFmt)}</option>`;
  }
  html += '</select>';
  return html;
}

/**
 * Render the calendar header with month/year navigation.
 * Returns HTML string.
 */
export function renderHeader(state, view, captionLayout = 'button') {
  const { viewYear, viewMonth, locale, calendarId, labels } = state;
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
    const yearFmt = getYearFormatter(state);
    const months = getMonthOptions(state.calendarId, state.viewYear, state.locale, state.numerals);
    let titleContent = '';

    if (captionLayout === 'dropdown') {
      titleContent = renderMonthDropdown(state, months) + renderYearDropdown(state, yearFmt);
    } else if (captionLayout === 'dropdown-months') {
      titleContent = renderMonthDropdown(state, months) +
        `<button class="idp-header-btn" data-action="show-years" type="button" aria-label="${escAttr(labels.selectYear)}">${formatYearNum(viewYear, yearFmt)} ${chevronDown}</button>`;
    } else if (captionLayout === 'dropdown-years') {
      const currentMonthName = months.find(m => m.value === viewMonth)?.label || '';
      titleContent = `<button class="idp-header-btn" data-action="show-months" type="button" aria-label="${escAttr(labels.selectMonth)}">${escAttr(currentMonthName)}</button>` +
        renderYearDropdown(state, yearFmt);
    }

    return `
      <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.calendarNavigation)}">
        <button class="idp-nav-btn" part="nav-prev" data-action="prev-month" aria-label="${escAttr(labels.previousMonth)}" type="button">
          ${prevArrow}
        </button>
        <div class="idp-header-title idp-header-dropdowns" part="header-title">
          ${titleContent}
        </div>
        <button class="idp-nav-btn" part="nav-next" data-action="next-month" aria-label="${escAttr(labels.nextMonth)}" type="button">
          ${nextArrow}
        </button>
      </div>
    `;
  }

  const headerTitle = formatMonthYear(viewYear, viewMonth, locale, calendarId, state.numerals);

  return `
    <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.calendarNavigation)}">
      <button class="idp-nav-btn" part="nav-prev" data-action="prev-month" aria-label="${escAttr(labels.previousMonth)}" type="button">
        ${prevArrow}
      </button>
      <div class="idp-header-title" part="header-title">
        <button class="idp-header-btn" data-action="show-months" type="button" aria-label="${escAttr(labels.selectMonth)}">
          ${headerTitle} ${chevronDown}
        </button>
      </div>
      <button class="idp-nav-btn" part="nav-next" data-action="next-month" aria-label="${escAttr(labels.nextMonth)}" type="button">
        ${nextArrow}
      </button>
    </div>
  `;
}

function renderYearViewHeader(state, prevArrow, nextArrow) {
  const { labels } = state;
  const decadeStart = Math.floor(state.viewYear / 20) * 20;
  const decadeEnd = decadeStart + 19;
  const yearFmt = getYearFormatter(state);

  return `
    <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.yearSelection)}">
      <button class="idp-nav-btn" part="nav-prev" data-action="prev-decade" aria-label="${escAttr(labels.previousDecade)}" type="button">
        ${prevArrow}
      </button>
      <div class="idp-header-title" part="header-title">
        <button class="idp-header-btn" data-action="show-days" type="button">
          ${formatYearNum(decadeStart, yearFmt)} – ${formatYearNum(decadeEnd, yearFmt)}
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
  const yearFmt = getYearFormatter(state);
  return `
    <div class="idp-header" part="header" role="group" aria-label="${escAttr(labels.monthSelection)}">
      <div class="idp-header-title" part="header-title">
        <button class="idp-header-btn" data-action="show-years" type="button" aria-label="${escAttr(labels.selectYear)}">
          ${formatYearNum(state.viewYear, yearFmt)} ${chevronDown}
        </button>
      </div>
    </div>
  `;
}

/**
 * Render a grid of years for the year picker view.
 */
export function renderYearGrid(state) {
  const decadeStart = Math.floor(state.viewYear / 20) * 20;
  const yearFmt = getYearFormatter(state);
  let html = `<div class="idp-year-grid" role="grid" aria-label="${escAttr(state.labels.yearSelection)}">`;

  for (let y = decadeStart; y < decadeStart + 20; y++) {
    const isCurrent = y === state.viewYear;
    const isDisabled = (state.min && y < state.min.year) || (state.max && y > state.max.year);
    const classes = ['idp-year-cell'];
    if (isCurrent) classes.push('selected');

    html += `<button class="${classes.join(' ')}" part="year-cell" data-action="select-year" data-year="${y}" type="button" role="gridcell"
      ${isCurrent ? 'aria-selected="true"' : ''}
      ${isDisabled ? 'aria-disabled="true" disabled' : ''}>${formatYearNum(y, yearFmt)}</button>`;
  }

  html += '</div>';
  return html;
}

/**
 * Render a grid of months for the month picker view.
 */
export function renderMonthGrid(state) {
  const months = getMonthOptions(state.calendarId, state.viewYear, state.locale, state.numerals);
  let html = `<div class="idp-month-grid" role="grid" aria-label="${escAttr(state.labels.monthSelection)}">`;

  for (const month of months) {
    const isCurrent = month.value === state.viewMonth;
    const isDisabled =
      (state.min && (state.viewYear < state.min.year || (state.viewYear === state.min.year && month.value < state.min.month))) ||
      (state.max && (state.viewYear > state.max.year || (state.viewYear === state.max.year && month.value > state.max.month)));
    const classes = ['idp-month-cell'];
    if (isCurrent) classes.push('selected');

    html += `<button class="${classes.join(' ')}" part="month-cell" data-action="select-month" data-month="${month.value}" type="button" role="gridcell"
      ${isCurrent ? 'aria-selected="true"' : ''}
      ${isDisabled ? 'aria-disabled="true" disabled' : ''}>${month.label}</button>`;
  }

  html += '</div>';
  return html;
}
