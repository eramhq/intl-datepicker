/**
 * @vitest-environment node
 *
 * SSR import smoke test. Verifies the package can be imported in a Node
 * environment without crashing — the symptom users hit was a top-level
 * `new CSSStyleSheet()` and `customElements.define` call running on import.
 */
import { describe, it, expect } from 'vitest';

describe('SSR import safety (Node environment)', () => {
  it('imports the main entry without throwing', async () => {
    const mod = await import('./intl-datepicker.js');
    expect(mod.IntlDatepicker).toBeDefined();
    expect(typeof mod.register).toBe('function');
  });

  it('imports the full bundle without throwing', async () => {
    const mod = await import('./full.js');
    expect(mod).toBeDefined();
  });

  it('imports a calendar registration module without throwing', async () => {
    await import('./calendars/persian.js');
  });

  it('register() is a no-op when customElements is undefined', async () => {
    const { register } = await import('./intl-datepicker.js');
    expect(() => register()).not.toThrow();
  });
});
