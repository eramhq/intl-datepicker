export const styles = new CSSStyleSheet();
styles.replaceSync(/* css */`
  :host {
    --idp-font-family: system-ui, -apple-system, sans-serif;
    --idp-primary: #2563eb;
    --idp-bg: #ffffff;
    --idp-text: #1f2937;
    --idp-border: #d1d5db;
    --idp-hover: #f3f4f6;
    --idp-selected-bg: var(--idp-primary);
    --idp-selected-text: #ffffff;
    --idp-today-border: var(--idp-primary);
    --idp-disabled: #9ca3af;
    --idp-radius: 8px;
    --idp-day-size: 40px;
    --idp-font-size: 14px;
    --idp-range-bg: #dbeafe;
    --idp-range-text: var(--idp-text);
    --idp-muted: #6b7280;

    display: inline-block;
    font-family: var(--idp-font-family);
    font-size: var(--idp-font-size);
    color: var(--idp-text);
    position: relative;
  }

  @media (prefers-color-scheme: dark) {
    :host {
      --idp-bg: #1f2937;
      --idp-text: #f9fafb;
      --idp-border: #4b5563;
      --idp-hover: #374151;
      --idp-range-bg: #1e3a5f;
      --idp-muted: #9ca3af;
    }
  }

  /* --- Input --- */
  .idp-input-wrapper {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    border: 1px solid var(--idp-border);
    border-radius: var(--idp-radius);
    padding: 8px 12px;
    background: var(--idp-bg);
    cursor: pointer;
    min-width: 200px;
    transition: border-color 0.15s;
  }

  .idp-input-wrapper:focus-within {
    border-color: var(--idp-primary);
    outline: 2px solid color-mix(in srgb, var(--idp-primary) 25%, transparent);
    outline-offset: -1px;
  }

  :host([disabled]) .idp-input-wrapper {
    opacity: 0.5;
    cursor: not-allowed;
    pointer-events: none;
  }

  .idp-input {
    border: none;
    background: transparent;
    color: var(--idp-text);
    font: inherit;
    outline: none;
    flex: 1;
    min-width: 0;
    cursor: pointer;
  }

  .idp-input::placeholder {
    color: var(--idp-muted);
  }

  .idp-input:read-only {
    cursor: pointer;
  }

  .idp-calendar-icon {
    flex-shrink: 0;
    width: 20px;
    height: 20px;
    color: var(--idp-muted);
  }

  .idp-clear-btn {
    flex-shrink: 0;
    background: none;
    border: none;
    cursor: pointer;
    padding: 2px;
    color: var(--idp-muted);
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }

  .idp-clear-btn:hover {
    color: var(--idp-text);
    background: var(--idp-hover);
  }

  /* --- Calendar Panel --- */
  .idp-calendar {
    background: var(--idp-bg);
    border: 1px solid var(--idp-border);
    border-radius: var(--idp-radius);
    box-shadow: 0 10px 25px rgba(0,0,0,0.1), 0 4px 10px rgba(0,0,0,0.05);
    padding: 16px;
    width: max-content;
    min-width: 300px;
    z-index: 1000;
  }

  :host([inline]) .idp-calendar {
    box-shadow: none;
    border: 1px solid var(--idp-border);
    position: static;
  }

  .idp-calendar[hidden] {
    display: none;
  }

  /* --- Header --- */
  .idp-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-bottom: 12px;
    gap: 4px;
  }

  .idp-nav-btn {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--idp-radius);
    cursor: pointer;
    padding: 6px;
    color: var(--idp-text);
    display: flex;
    align-items: center;
    justify-content: center;
    min-width: 36px;
    min-height: 36px;
    transition: background 0.15s;
  }

  .idp-nav-btn:hover {
    background: var(--idp-hover);
  }

  .idp-nav-btn:focus-visible {
    outline: 2px solid var(--idp-primary);
    outline-offset: 2px;
  }

  .idp-header-title {
    font-weight: 600;
    font-size: 15px;
    text-align: center;
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 4px;
  }

  .idp-header-btn {
    background: none;
    border: none;
    cursor: pointer;
    font: inherit;
    font-weight: 600;
    font-size: 15px;
    color: var(--idp-text);
    padding: 4px 8px;
    border-radius: 4px;
    transition: background 0.15s;
  }

  .idp-header-btn:hover {
    background: var(--idp-hover);
  }

  /* --- Year dropdown --- */
  .idp-year-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 4px;
    padding: 8px 0;
  }

  .idp-year-cell {
    padding: 8px 4px;
    text-align: center;
    border: none;
    background: none;
    border-radius: var(--idp-radius);
    cursor: pointer;
    color: var(--idp-text);
    font: inherit;
    transition: background 0.15s;
  }

  .idp-year-cell:hover {
    background: var(--idp-hover);
  }

  .idp-year-cell.current {
    border: 1px solid var(--idp-today-border);
  }

  .idp-year-cell.selected {
    background: var(--idp-selected-bg);
    color: var(--idp-selected-text);
  }

  /* --- Month grid --- */
  .idp-month-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 4px;
    padding: 8px 0;
  }

  .idp-month-cell {
    padding: 10px 4px;
    text-align: center;
    border: none;
    background: none;
    border-radius: var(--idp-radius);
    cursor: pointer;
    color: var(--idp-text);
    font: inherit;
    transition: background 0.15s;
  }

  .idp-month-cell:hover {
    background: var(--idp-hover);
  }

  .idp-month-cell.current {
    border: 1px solid var(--idp-today-border);
  }

  .idp-month-cell.selected {
    background: var(--idp-selected-bg);
    color: var(--idp-selected-text);
  }

  /* --- Weekday Header --- */
  .idp-weekdays {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    margin-bottom: 4px;
  }

  .idp-weekday {
    text-align: center;
    font-size: 12px;
    font-weight: 500;
    color: var(--idp-muted);
    padding: 4px 0;
    user-select: none;
  }

  /* --- Day Grid --- */
  .idp-days {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 1px;
  }

  .idp-day {
    display: flex;
    align-items: center;
    justify-content: center;
    width: var(--idp-day-size);
    height: var(--idp-day-size);
    border: none;
    background: none;
    border-radius: 50%;
    cursor: pointer;
    color: var(--idp-text);
    font: inherit;
    position: relative;
    transition: background 0.15s, color 0.15s;
    user-select: none;
    margin: 0 auto;
  }

  .idp-day:hover:not([aria-disabled="true"]) {
    background: var(--idp-hover);
  }

  .idp-day:focus-visible {
    outline: 2px solid var(--idp-primary);
    outline-offset: 2px;
    z-index: 1;
  }

  .idp-day.outside {
    color: var(--idp-muted);
    opacity: 0.4;
  }

  .idp-day.today {
    border: 2px solid var(--idp-today-border);
  }

  .idp-day.selected {
    background: var(--idp-selected-bg);
    color: var(--idp-selected-text);
    font-weight: 600;
  }

  .idp-day.selected.today {
    border-color: var(--idp-selected-text);
  }

  .idp-day[aria-disabled="true"] {
    color: var(--idp-disabled);
    cursor: not-allowed;
    opacity: 0.4;
  }

  /* Range styles */
  .idp-day.in-range {
    background: var(--idp-range-bg);
    color: var(--idp-range-text);
    border-radius: 0;
  }

  .idp-day.range-start {
    background: var(--idp-selected-bg);
    color: var(--idp-selected-text);
    border-radius: 50% 0 0 50%;
  }

  .idp-day.range-end {
    background: var(--idp-selected-bg);
    color: var(--idp-selected-text);
    border-radius: 0 50% 50% 0;
  }

  :host([dir="rtl"]) .idp-day.range-start {
    border-radius: 0 50% 50% 0;
  }

  :host([dir="rtl"]) .idp-day.range-end {
    border-radius: 50% 0 0 50%;
  }

  .idp-day.range-start.range-end {
    border-radius: 50%;
  }

  /* --- Footer --- */
  .idp-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    margin-top: 12px;
    padding-top: 12px;
    border-top: 1px solid var(--idp-border);
    gap: 8px;
  }

  .idp-footer-btn {
    background: none;
    border: 1px solid var(--idp-border);
    border-radius: var(--idp-radius);
    cursor: pointer;
    padding: 6px 12px;
    color: var(--idp-text);
    font: inherit;
    font-size: 13px;
    transition: background 0.15s;
  }

  .idp-footer-btn:hover {
    background: var(--idp-hover);
  }

  .idp-footer-btn.primary {
    background: var(--idp-primary);
    color: var(--idp-selected-text);
    border-color: var(--idp-primary);
  }

  .idp-footer-btn.primary:hover {
    opacity: 0.9;
  }

  .idp-alternate {
    font-size: 12px;
    color: var(--idp-muted);
    text-align: center;
  }

  /* --- Live region --- */
  .idp-sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  /* --- RTL --- */
  :host([dir="rtl"]) {
    direction: rtl;
  }

  /* --- Presets sidebar --- */
  .idp-has-presets {
    display: flex;
    gap: 0;
  }

  .idp-presets {
    display: flex;
    flex-direction: column;
    gap: 2px;
    padding: 8px;
    border-right: 1px solid var(--idp-border);
    min-width: 120px;
    max-width: 160px;
  }

  :host([dir="rtl"]) .idp-presets {
    border-right: none;
    border-left: 1px solid var(--idp-border);
  }

  .idp-calendar-main {
    flex: 1;
    min-width: 0;
  }

  .idp-preset-btn {
    background: none;
    border: 1px solid transparent;
    border-radius: var(--idp-radius);
    cursor: pointer;
    padding: 6px 10px;
    color: var(--idp-text);
    font: inherit;
    font-size: 13px;
    text-align: start;
    white-space: nowrap;
    transition: background 0.15s;
  }

  .idp-preset-btn:hover {
    background: var(--idp-hover);
  }

  .idp-preset-btn.active {
    background: var(--idp-primary);
    color: var(--idp-selected-text);
  }

  @media (max-width: 500px) {
    .idp-has-presets {
      flex-direction: column;
    }

    .idp-presets {
      flex-direction: row;
      overflow-x: auto;
      border-right: none;
      border-bottom: 1px solid var(--idp-border);
      max-width: none;
      min-width: 0;
    }

    :host([dir="rtl"]) .idp-presets {
      border-left: none;
      border-bottom: 1px solid var(--idp-border);
    }
  }

  /* --- Week numbers --- */
  .idp-week-number {
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 11px;
    color: var(--idp-muted);
    opacity: 0.6;
    user-select: none;
    width: var(--idp-day-size);
  }

  .idp-week-number-header {
    font-size: 11px;
    opacity: 0.6;
  }

  /* --- Multi-month --- */
  .idp-months-container {
    display: flex;
    gap: 16px;
  }

  .idp-month-panel {
    flex: 1;
    min-width: 280px;
  }

  /* --- Responsive --- */
  @media (max-width: 600px) {
    .idp-months-container {
      flex-direction: column;
    }
  }

  @media (max-width: 400px) {
    .idp-calendar {
      min-width: unset;
      width: 100%;
      padding: 12px;
    }

    .idp-day {
      --idp-day-size: 36px;
    }
  }

  /* --- High contrast --- */
  @media (forced-colors: active) {
    .idp-day.selected {
      border: 2px solid ButtonText;
    }

    .idp-day.today {
      border: 2px solid Highlight;
    }

    .idp-day.in-range {
      border: 1px solid Highlight;
    }

    .idp-calendar {
      border: 2px solid ButtonText;
    }
  }

  /* --- Open/close animations --- */
  @keyframes idp-open {
    from { opacity: 0; transform: scale(0.95) translateY(-4px); }
    to { opacity: 1; transform: scale(1) translateY(0); }
  }

  @keyframes idp-close {
    from { opacity: 1; transform: scale(1) translateY(0); }
    to { opacity: 0; transform: scale(0.95) translateY(-4px); }
  }

  .idp-calendar.idp-animating-in {
    animation: idp-open 150ms ease-out forwards;
  }

  .idp-calendar.idp-animating-out {
    animation: idp-close 150ms ease-out forwards;
  }

  /* --- Reduced motion --- */
  @media (prefers-reduced-motion: reduce) {
    *, *::before, *::after {
      transition-duration: 0s !important;
      animation-duration: 0s !important;
    }
  }

  /* Touch targets */
  @media (pointer: coarse) {
    .idp-day {
      --idp-day-size: 44px;
    }

    .idp-nav-btn {
      min-width: 44px;
      min-height: 44px;
    }
  }
`);

export const calendarIcon = `<svg class="idp-calendar-icon" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="1.5">
  <rect x="2" y="3" width="16" height="15" rx="2"/>
  <path d="M2 7h16M6 1v4M14 1v4"/>
</svg>`;

export const chevronLeft = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M10 4L6 8L10 12"/></svg>`;

export const chevronRight = `<svg width="16" height="16" viewBox="0 0 16 16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M6 4L10 8L6 12"/></svg>`;

export const chevronDown = `<svg width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 4.5L6 7.5L9 4.5"/></svg>`;

export const clearIcon = `<svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M3 3L11 11M11 3L3 11"/></svg>`;
