const GAP = 4;
const VIEWPORT_PAD = 8;
const MIN_WIDTH = 300;

/**
 * Position the calendar panel relative to the trigger element.
 * Returns a cleanup function for the caller to store per-instance.
 *
 * Limitation: ancestors with `transform`/`filter`/`backdrop-filter`/
 * `perspective`/`contain: strict|paint` create a new containing block for
 * `position: fixed`, which makes our viewport-relative coordinates incorrect.
 */
export function positionCalendar(triggerEl, calendarEl, { isRTL = false } = {}) {
  calendarEl.style.position = 'fixed';
  calendarEl.style.margin = '0';

  const measureAndPlace = () => {
    const t = triggerEl.getBoundingClientRect();
    const vv = typeof window !== 'undefined' ? window.visualViewport : null;
    const vw = vv?.width ?? window.innerWidth;
    const vh = vv?.height ?? window.innerHeight;
    const vx = vv?.offsetLeft ?? 0;
    const vy = vv?.offsetTop ?? 0;

    calendarEl.style.maxWidth = '';
    calendarEl.style.maxHeight = '';
    const ph = calendarEl.offsetHeight;
    const pw = calendarEl.offsetWidth;

    const spaceBelow = vh - (t.bottom - vy) - VIEWPORT_PAD;
    const spaceAbove = (t.top - vy) - VIEWPORT_PAD;
    const placeBelow = ph + GAP <= spaceBelow || spaceBelow >= spaceAbove;
    const top = placeBelow
      ? t.bottom + GAP
      : Math.max(VIEWPORT_PAD + vy, t.top - ph - GAP);
    calendarEl.style.maxHeight = `${Math.max(0, placeBelow ? spaceBelow : spaceAbove)}px`;
    calendarEl.dataset.placement = placeBelow ? 'bottom' : 'top';

    const desired = isRTL ? t.right - pw : t.left;
    const allowedW = Math.max(MIN_WIDTH, Math.min(pw, vw - 2 * VIEWPORT_PAD));
    const minLeft = vx + VIEWPORT_PAD;
    const maxLeft = vx + vw - allowedW - VIEWPORT_PAD;
    calendarEl.style.maxWidth = `${vw - 2 * VIEWPORT_PAD}px`;
    calendarEl.style.left = `${Math.max(minLeft, Math.min(desired, maxLeft))}px`;
    calendarEl.style.top = `${top}px`;
  };

  let raf = 0;
  const reposition = () => {
    cancelAnimationFrame(raf);
    raf = requestAnimationFrame(measureAndPlace);
  };

  // First placement is synchronous so the popup never paints at the viewport
  // origin between `position: fixed` taking effect and the RAF resolving.
  measureAndPlace();

  const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(reposition) : null;
  ro?.observe(triggerEl);
  ro?.observe(calendarEl);

  // Capture phase: scroll events don't bubble, but they're delivered during
  // capture, so we catch ancestor scroll-container scrolls too.
  window.addEventListener('scroll', reposition, { capture: true, passive: true });
  window.addEventListener('resize', reposition, { passive: true });
  window.visualViewport?.addEventListener('resize', reposition);
  window.visualViewport?.addEventListener('scroll', reposition);

  return () => {
    cancelAnimationFrame(raf);
    ro?.disconnect();
    window.removeEventListener('scroll', reposition, { capture: true });
    window.removeEventListener('resize', reposition);
    window.visualViewport?.removeEventListener('resize', reposition);
    window.visualViewport?.removeEventListener('scroll', reposition);
  };
}
