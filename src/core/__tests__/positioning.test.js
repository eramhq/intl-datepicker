import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { positionCalendar } from '../positioning.js';

function makeRect({ top = 0, left = 0, width = 200, height = 36 } = {}) {
  return { top, left, width, height, right: left + width, bottom: top + height };
}

function makeTrigger(rect) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  el.getBoundingClientRect = () => rect;
  return el;
}

function makeCalendar({ width = 320, height = 360 } = {}) {
  const el = document.createElement('div');
  document.body.appendChild(el);
  Object.defineProperty(el, 'offsetWidth', { configurable: true, get: () => width });
  Object.defineProperty(el, 'offsetHeight', { configurable: true, get: () => height });
  return el;
}

describe('positionCalendar', () => {
  let originalRO;
  let observedTargets;
  let roDisconnects;

  beforeEach(() => {
    observedTargets = [];
    roDisconnects = 0;
    originalRO = global.ResizeObserver;
    global.ResizeObserver = class {
      observe(target) { observedTargets.push(target); }
      unobserve() {}
      disconnect() { roDisconnects++; }
    };
    window.innerWidth = 1024;
    window.innerHeight = 768;
  });

  afterEach(() => {
    global.ResizeObserver = originalRO;
    document.body.innerHTML = '';
  });

  it('places calendar below trigger when room exists', () => {
    const trigger = makeTrigger(makeRect({ top: 100, left: 200 }));
    const calendar = makeCalendar();

    const cleanup = positionCalendar(trigger, calendar);

    expect(calendar.style.position).toBe('fixed');
    expect(calendar.dataset.placement).toBe('bottom');
    expect(parseFloat(calendar.style.top)).toBe(100 + 36 + 4);
    expect(parseFloat(calendar.style.left)).toBe(200);
    cleanup();
  });

  it('flips above when no room below', () => {
    const trigger = makeTrigger(makeRect({ top: 700, left: 200 }));
    const calendar = makeCalendar({ height: 360 });

    const cleanup = positionCalendar(trigger, calendar);

    expect(calendar.dataset.placement).toBe('top');
    expect(parseFloat(calendar.style.top)).toBe(700 - 360 - 4);
    cleanup();
  });

  it('aligns to trigger right edge in RTL', () => {
    const trigger = makeTrigger(makeRect({ top: 100, left: 600, width: 200 }));
    const calendar = makeCalendar({ width: 320 });

    const cleanup = positionCalendar(trigger, calendar, { isRTL: true });

    expect(parseFloat(calendar.style.left)).toBe(480);
    cleanup();
  });

  it('clamps horizontally when popup overflows right edge', () => {
    const trigger = makeTrigger(makeRect({ top: 100, left: 900, width: 100 }));
    const calendar = makeCalendar({ width: 320 });

    const cleanup = positionCalendar(trigger, calendar);

    // viewport 1024 - allowedW 320 - pad 8 = 696
    expect(parseFloat(calendar.style.left)).toBe(696);
    cleanup();
  });

  it('clamps to left padding when desired left is negative', () => {
    const trigger = makeTrigger(makeRect({ top: 100, left: -50 }));
    const calendar = makeCalendar();

    const cleanup = positionCalendar(trigger, calendar);

    expect(parseFloat(calendar.style.left)).toBe(8); // VIEWPORT_PAD
    cleanup();
  });

  it('observes both trigger and calendar with ResizeObserver', () => {
    const trigger = makeTrigger(makeRect({ top: 100, left: 100 }));
    const calendar = makeCalendar();

    const cleanup = positionCalendar(trigger, calendar);

    expect(observedTargets).toContain(trigger);
    expect(observedTargets).toContain(calendar);
    cleanup();
  });

  it('cleanup removes scroll/resize listeners and disconnects ResizeObserver', () => {
    const addSpy = vi.spyOn(window, 'addEventListener');
    const removeSpy = vi.spyOn(window, 'removeEventListener');

    const trigger = makeTrigger(makeRect({ top: 100, left: 100 }));
    const calendar = makeCalendar();

    const cleanup = positionCalendar(trigger, calendar);
    const addedScroll = addSpy.mock.calls.filter(([type]) => type === 'scroll').length;
    const addedResize = addSpy.mock.calls.filter(([type]) => type === 'resize').length;

    cleanup();

    const removedScroll = removeSpy.mock.calls.filter(([type]) => type === 'scroll').length;
    const removedResize = removeSpy.mock.calls.filter(([type]) => type === 'resize').length;

    expect(removedScroll).toBe(addedScroll);
    expect(removedResize).toBe(addedResize);
    expect(roDisconnects).toBe(1);

    addSpy.mockRestore();
    removeSpy.mockRestore();
  });

  it('only attaches visualViewport listeners when the API exists', () => {
    const original = window.visualViewport;
    delete window.visualViewport;
    try {
      const trigger = makeTrigger(makeRect({ top: 100, left: 100 }));
      const calendar = makeCalendar();
      const cleanup = positionCalendar(trigger, calendar);
      expect(parseFloat(calendar.style.top)).toBeGreaterThan(0);
      cleanup();
    } finally {
      if (original) window.visualViewport = original;
    }
  });
});
