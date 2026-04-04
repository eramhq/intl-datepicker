import { computePosition, autoUpdate, offset, flip, shift, size } from '@floating-ui/dom';

let cleanup = null;

/**
 * Position the calendar panel relative to the trigger element.
 * Uses Popover API if available, otherwise falls back to floating-ui positioning.
 */
export function positionCalendar(triggerEl, calendarEl, options = {}) {
  // Clean up previous positioning
  destroyPositioning();

  const { strategy = 'absolute' } = options;

  // Try Popover API for top-layer rendering
  if (typeof calendarEl.showPopover === 'function' && !options.skipPopover) {
    try {
      calendarEl.setAttribute('popover', 'manual');
      calendarEl.showPopover();
    } catch {
      // Popover not supported or already shown
    }
  }

  calendarEl.style.position = strategy;

  cleanup = autoUpdate(triggerEl, calendarEl, () => {
    computePosition(triggerEl, calendarEl, {
      placement: 'bottom-start',
      strategy,
      middleware: [
        offset(4),
        flip({ padding: 8 }),
        shift({ padding: 8 }),
        size({
          apply({ availableWidth, availableHeight, elements }) {
            Object.assign(elements.floating.style, {
              maxWidth: `${Math.max(300, availableWidth)}px`,
              maxHeight: `${availableHeight}px`,
            });
          },
        }),
      ],
    }).then(({ x, y }) => {
      Object.assign(calendarEl.style, {
        left: `${x}px`,
        top: `${y}px`,
      });
    });
  });
}

export function destroyPositioning() {
  if (cleanup) {
    cleanup();
    cleanup = null;
  }
}
