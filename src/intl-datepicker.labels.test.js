import { describe, it, expect, beforeAll } from 'vitest';
import {
  DEFAULT_LABELS_EN,
  LABELS_FA,
  LABELS_AR,
  LABELS_HE,
  resolveLabels,
} from './core/labels.js';

beforeAll(async () => {
  await import('./intl-datepicker.js');
});

describe('resolveLabels', () => {
  it('returns English defaults when locale is en', () => {
    const labels = resolveLabels('en-US', null);
    expect(labels.today).toBe(DEFAULT_LABELS_EN.today);
    expect(labels.previousMonth).toBe(DEFAULT_LABELS_EN.previousMonth);
  });

  it('returns Persian defaults for fa-IR', () => {
    const labels = resolveLabels('fa-IR', null);
    expect(labels.today).toBe(LABELS_FA.today);
    expect(labels.previousMonth).toBe(LABELS_FA.previousMonth);
  });

  it('returns Arabic defaults for ar-EG', () => {
    const labels = resolveLabels('ar-EG', null);
    expect(labels.today).toBe(LABELS_AR.today);
  });

  it('returns Hebrew defaults for he-IL', () => {
    const labels = resolveLabels('he-IL', null);
    expect(labels.today).toBe(LABELS_HE.today);
  });

  it('falls back to English for unsupported locales', () => {
    const labels = resolveLabels('zu-ZA', null);
    expect(labels.today).toBe(DEFAULT_LABELS_EN.today);
  });

  it('merges user overrides with locale defaults', () => {
    const labels = resolveLabels('fa-IR', { today: 'حالا', clear: 'پاک' });
    expect(labels.today).toBe('حالا');
    expect(labels.clear).toBe('پاک');
    // Other Persian defaults preserved
    expect(labels.previousMonth).toBe(LABELS_FA.previousMonth);
    // English keys present for any not overridden in fa
    expect(labels.calendarNavigation).toBe(LABELS_FA.calendarNavigation);
  });

  it('partial override does not blank out other keys', () => {
    const labels = resolveLabels('en-US', { today: 'NOW' });
    expect(labels.today).toBe('NOW');
    expect(labels.clear).toBe(DEFAULT_LABELS_EN.clear);
    expect(labels.datePicker).toBe(DEFAULT_LABELS_EN.datePicker);
  });
});

describe('custom element labels integration', () => {
  function makePicker(attrs = {}) {
    const el = document.createElement('intl-datepicker');
    for (const [k, v] of Object.entries(attrs)) {
      if (v === true) el.setAttribute(k, '');
      else el.setAttribute(k, v);
    }
    document.body.appendChild(el);
    return el;
  }

  it('uses Persian labels when locale=fa-IR', () => {
    const el = makePicker({ locale: 'fa-IR' });
    expect(el.labels.today).toBe(LABELS_FA.today);
    el.remove();
  });

  it('uses Arabic labels when locale=ar-EG', () => {
    const el = makePicker({ locale: 'ar-EG' });
    expect(el.labels.today).toBe(LABELS_AR.today);
    el.remove();
  });

  it('parses labels JSON attribute', () => {
    const el = makePicker({
      locale: 'en-US',
      labels: JSON.stringify({ today: 'Pick today', clear: 'Reset' }),
    });
    expect(el.labels.today).toBe('Pick today');
    expect(el.labels.clear).toBe('Reset');
    // Defaults preserved
    expect(el.labels.previousMonth).toBe(DEFAULT_LABELS_EN.previousMonth);
    el.remove();
  });

  it('property setter merges with defaults', () => {
    const el = makePicker({ locale: 'fa-IR' });
    el.labels = { clear: 'پاک کن' };
    expect(el.labels.clear).toBe('پاک کن');
    // Persian defaults still apply
    expect(el.labels.today).toBe(LABELS_FA.today);
    el.remove();
  });

  it('locale change re-resolves defaults but preserves user overrides', () => {
    const el = makePicker({ locale: 'en-US' });
    el.labels = { today: 'TODAY!' };
    expect(el.labels.today).toBe('TODAY!');
    el.setAttribute('locale', 'fa-IR');
    // User override wins; non-overridden keys take Persian defaults
    expect(el.labels.today).toBe('TODAY!');
    expect(el.labels.previousMonth).toBe(LABELS_FA.previousMonth);
    el.remove();
  });

  it('renders aria-label="Date picker" in English', () => {
    const el = makePicker();
    const dialog = el.shadowRoot.querySelector('[role="dialog"]');
    expect(dialog).not.toBeNull();
    expect(dialog.getAttribute('aria-label')).toBe(DEFAULT_LABELS_EN.datePicker);
    el.remove();
  });

  it('renders Persian aria-label for fa-IR', () => {
    const el = makePicker({ locale: 'fa-IR' });
    const dialog = el.shadowRoot.querySelector('[role="dialog"]');
    expect(dialog.getAttribute('aria-label')).toBe(LABELS_FA.datePicker);
    el.remove();
  });

  it('uses localized today/clear in footer', () => {
    const el = makePicker({ locale: 'fa-IR' });
    const todayBtn = el.shadowRoot.querySelector('[data-action="today"]');
    const clearBtn = el.shadowRoot.querySelector('.idp-footer [data-action="clear"]');
    expect(todayBtn.textContent.trim()).toBe(LABELS_FA.today);
    expect(clearBtn.textContent.trim()).toBe(LABELS_FA.clear);
    el.remove();
  });
});
