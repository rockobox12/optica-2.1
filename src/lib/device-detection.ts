/**
 * Detects if the current device is a touch device (mobile, tablet, or touch monitor).
 * Uses multiple signals: touch capability, pointer type, and user agent.
 */
export function isTouchDevice(): boolean {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;

  // Check touch capability
  const hasTouch =
    'ontouchstart' in window ||
    navigator.maxTouchPoints > 0 ||
    // @ts-ignore – legacy MS property
    (navigator as any).msMaxTouchPoints > 0;

  // Check coarse pointer (touch screens)
  const hasCoarsePointer =
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(pointer: coarse)').matches;

  // Classic mobile/tablet UA check as fallback
  const mobileUA = /Android|iPhone|iPad|iPod|Mobile|Opera Mini|IEMobile|webOS|BlackBerry/i.test(
    navigator.userAgent
  );

  return hasTouch || hasCoarsePointer || mobileUA;
}
