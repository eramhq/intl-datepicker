import { describe, it, expect, vi } from 'vitest';

// Mock CSSStyleSheet before importing modules that use it
vi.mock('../../styles.js', () => ({
  styles: { replaceSync: vi.fn() },
  chevronLeft: '<svg>left</svg>',
  chevronRight: '<svg>right</svg>',
  chevronDown: '<svg>down</svg>',
  calendarIcon: '<svg>cal</svg>',
  clearIcon: '<svg>clear</svg>',
}));

import { renderYearGrid, renderMonthGrid } from '../calendar-header.js';
import { createState } from '../state.js';

describe('renderYearGrid with min/max', () => {
  it('disables years before min', () => {
    const state = createState({ min: '2024-06-01' });
    state.viewYear = 2020;
    const html = renderYearGrid(state);
    // 2020 decade: years 2020-2039. Min year is 2024, so 2020-2023 should be disabled
    expect(html).toContain('data-year="2023" type="button" role="gridcell"');
    expect(html).toMatch(/data-year="2023"[^>]*aria-disabled="true"/);
    expect(html).toMatch(/data-year="2020"[^>]*aria-disabled="true"/);
    // 2024 should NOT be disabled
    expect(html).not.toMatch(/data-year="2024"[^>]*aria-disabled="true"/);
  });

  it('disables years after max', () => {
    const state = createState({ max: '2025-12-31' });
    state.viewYear = 2020;
    const html = renderYearGrid(state);
    expect(html).toMatch(/data-year="2026"[^>]*aria-disabled="true"/);
    expect(html).not.toMatch(/data-year="2025"[^>]*aria-disabled="true"/);
  });

  it('renders no disabled years when no min/max', () => {
    const state = createState();
    state.viewYear = 2020;
    const html = renderYearGrid(state);
    expect(html).not.toContain('aria-disabled');
  });
});

describe('renderMonthGrid with min/max', () => {
  it('disables months before min in same year', () => {
    const state = createState({ min: '2024-06-01' });
    state.viewYear = 2024;
    const html = renderMonthGrid(state);
    // Months 1-5 should be disabled for 2024
    expect(html).toMatch(/data-month="1"[^>]*aria-disabled="true"/);
    expect(html).toMatch(/data-month="5"[^>]*aria-disabled="true"/);
    // Month 6 should NOT be disabled
    expect(html).not.toMatch(/data-month="6"[^>]*aria-disabled="true"/);
  });

  it('disables months after max in same year', () => {
    const state = createState({ max: '2024-09-30' });
    state.viewYear = 2024;
    const html = renderMonthGrid(state);
    expect(html).toMatch(/data-month="10"[^>]*aria-disabled="true"/);
    expect(html).not.toMatch(/data-month="9"[^>]*aria-disabled="true"/);
  });

  it('disables all months for year before min year', () => {
    const state = createState({ min: '2025-01-01' });
    state.viewYear = 2024;
    const html = renderMonthGrid(state);
    // All 12 months should be disabled
    for (let m = 1; m <= 12; m++) {
      expect(html).toMatch(new RegExp(`data-month="${m}"[^>]*aria-disabled="true"`));
    }
  });

  it('renders no disabled months when no min/max', () => {
    const state = createState();
    state.viewYear = 2024;
    const html = renderMonthGrid(state);
    expect(html).not.toContain('aria-disabled');
  });
});
