import { chevronLeft, chevronRight, chevronDown } from '../styles.js';
import { formatMonthYear } from '../utils/format.js';
import { getMonthOptions, getMonthCount } from './calendar-grid.js';

/**
 * Render the calendar header with month/year navigation.
 * Returns HTML string.
 */
export function renderHeader(state, view) {
  const { viewYear, viewMonth, locale, calendarId } = state;
  const isRTL = state._isRTL;
  const prevArrow = isRTL ? chevronRight : chevronLeft;
  const nextArrow = isRTL ? chevronLeft : chevronRight;

  if (view === 'years') {
    return renderYearViewHeader(state, prevArrow, nextArrow);
  }

  if (view === 'months') {
    return renderMonthViewHeader(state);
  }

  const headerTitle = formatMonthYear(viewYear, viewMonth, locale, calendarId);

  return `
    <div class="idp-header" role="group" aria-label="Calendar navigation">
      <button class="idp-nav-btn" data-action="prev-month" aria-label="Previous month" type="button">
        ${prevArrow}
      </button>
      <div class="idp-header-title">
        <button class="idp-header-btn" data-action="show-months" type="button" aria-label="Select month">
          ${headerTitle} ${chevronDown}
        </button>
      </div>
      <button class="idp-nav-btn" data-action="next-month" aria-label="Next month" type="button">
        ${nextArrow}
      </button>
    </div>
  `;
}

function renderYearViewHeader(state, prevArrow, nextArrow) {
  const decadeStart = Math.floor(state.viewYear / 20) * 20;
  const decadeEnd = decadeStart + 19;

  return `
    <div class="idp-header" role="group" aria-label="Year navigation">
      <button class="idp-nav-btn" data-action="prev-decade" aria-label="Previous 20 years" type="button">
        ${prevArrow}
      </button>
      <div class="idp-header-title">
        <button class="idp-header-btn" data-action="show-days" type="button">
          ${decadeStart} – ${decadeEnd}
        </button>
      </div>
      <button class="idp-nav-btn" data-action="next-decade" aria-label="Next 20 years" type="button">
        ${nextArrow}
      </button>
    </div>
  `;
}

function renderMonthViewHeader(state) {
  return `
    <div class="idp-header" role="group" aria-label="Month selection">
      <div class="idp-header-title">
        <button class="idp-header-btn" data-action="show-years" type="button" aria-label="Select year">
          ${state.viewYear} ${chevronDown}
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
  let html = '<div class="idp-year-grid" role="grid" aria-label="Year selection">';

  for (let y = decadeStart; y < decadeStart + 20; y++) {
    const isCurrent = y === state.viewYear;
    const isDisabled = (state.min && y < state.min.year) || (state.max && y > state.max.year);
    const classes = ['idp-year-cell'];
    if (isCurrent) classes.push('selected');

    html += `<button class="${classes.join(' ')}" data-action="select-year" data-year="${y}" type="button" role="gridcell"
      ${isCurrent ? 'aria-selected="true"' : ''}
      ${isDisabled ? 'aria-disabled="true" disabled' : ''}>${y}</button>`;
  }

  html += '</div>';
  return html;
}

/**
 * Render a grid of months for the month picker view.
 */
export function renderMonthGrid(state) {
  const months = getMonthOptions(state.calendarId, state.viewYear, state.locale);
  let html = '<div class="idp-month-grid" role="grid" aria-label="Month selection">';

  for (const month of months) {
    const isCurrent = month.value === state.viewMonth;
    const isDisabled =
      (state.min && (state.viewYear < state.min.year || (state.viewYear === state.min.year && month.value < state.min.month))) ||
      (state.max && (state.viewYear > state.max.year || (state.viewYear === state.max.year && month.value > state.max.month)));
    const classes = ['idp-month-cell'];
    if (isCurrent) classes.push('selected');

    html += `<button class="${classes.join(' ')}" data-action="select-month" data-month="${month.value}" type="button" role="gridcell"
      ${isCurrent ? 'aria-selected="true"' : ''}
      ${isDisabled ? 'aria-disabled="true" disabled' : ''}>${month.label}</button>`;
  }

  html += '</div>';
  return html;
}
