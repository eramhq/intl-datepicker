import { computePosition, autoUpdate, offset, flip, shift, size } from '@floating-ui/dom';

/**
 * Position the calendar panel relative to the trigger element.
 * Uses fixed strategy so coordinates are viewport-relative, avoiding
 * issues with Shadow DOM containing blocks and the Popover API.
 * Returns a cleanup function for the caller to store per-instance.
 */
export function positionCalendar(triggerEl, calendarEl, options = {}) {
  const strategy = 'fixed';

  calendarEl.style.position = strategy;
  calendarEl.style.margin = '0';

  const cleanup = autoUpdate(triggerEl, calendarEl, () => {
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

  return cleanup;
}
