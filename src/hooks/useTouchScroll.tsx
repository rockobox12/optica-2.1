import { useEffect, useRef } from 'react';
import { isTouchDevice } from '@/lib/device-detection';

/**
 * Hook that enables drag-to-scroll on touch devices.
 * Handles X and Y axes independently, finding the correct scrollable ancestor for each.
 * Skips interactive elements (inputs, buttons, sliders, etc.).
 *
 * Usage:
 *   const touchRef = useTouchScroll<HTMLDivElement>();
 *   <div ref={touchRef}>…</div>
 */
export function useTouchScroll<T extends HTMLElement = HTMLDivElement>() {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!isTouchDevice()) return;

    const root = ref.current;
    if (!root) return;

    const interactiveSelector = [
      'input',
      'textarea',
      'select',
      'button',
      'a',
      'label',
      '[role="button"]',
      '[role="slider"]',
      '[data-radix-slider-thumb]',
      '[data-radix-scroll-area-thumb]',
      '[contenteditable="true"]',
    ].join(',');

    type ScrollAxis = 'x' | 'y';

    const getDocumentScroller = () =>
      (document.scrollingElement as HTMLElement | null) ?? document.documentElement;

    const findScrollableAncestor = (target: EventTarget | null, axis: ScrollAxis): HTMLElement | null => {
      let node = target instanceof Element ? target : null;

      while (node) {
        const style = window.getComputedStyle(node);
        const overflow = axis === 'y' ? style.overflowY : style.overflowX;
        const isScrollable = /(auto|scroll)/.test(overflow);
        const hasSpace = axis === 'y'
          ? node.scrollHeight > node.clientHeight + 1
          : node.scrollWidth > node.clientWidth + 1;

        if (isScrollable && hasSpace) return node as HTMLElement;
        node = node.parentElement;
      }

      const doc = getDocumentScroller();
      const docHasSpace = axis === 'y'
        ? doc.scrollHeight > doc.clientHeight + 1
        : doc.scrollWidth > doc.clientWidth + 1;

      return docHasSpace ? doc : null;
    };

    let isTracking = false;
    let hasMoved = false;
    let activeTouchId: number | null = null;
    let startTarget: EventTarget | null = null;
    let startX = 0;
    let startY = 0;
    let lastX = 0;
    let lastY = 0;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const touch = e.touches[0];
      if (!touch) return;
      activeTouchId = touch.identifier;
      isTracking = true;
      hasMoved = false;
      startTarget = e.target;
      startX = lastX = touch.clientX;
      startY = lastY = touch.clientY;
    };

    const onTouchMove = (e: TouchEvent) => {
      if (!isTracking || activeTouchId === null) return;

      const touch = Array.from(e.touches).find((t) => t.identifier === activeTouchId);
      if (!touch) return;

      const targetElement = startTarget instanceof Element ? startTarget : null;
      if (targetElement?.closest(interactiveSelector)) return;

      if (!hasMoved) {
        const distance = Math.abs(touch.clientX - startX) + Math.abs(touch.clientY - startY);
        if (distance < 4) return;
        hasMoved = true;
      }

      const dx = touch.clientX - lastX;
      const dy = touch.clientY - lastY;
      if (dx === 0 && dy === 0) return;

      const horizontalTarget = Math.abs(dx) > 0 ? findScrollableAncestor(startTarget, 'x') : null;
      const verticalTarget = Math.abs(dy) > 0 ? findScrollableAncestor(startTarget, 'y') : null;

      let didScroll = false;

      if (horizontalTarget && verticalTarget && horizontalTarget === verticalTarget) {
        horizontalTarget.scrollBy({ left: -dx, top: -dy, behavior: 'auto' });
        didScroll = true;
      } else {
        if (horizontalTarget) {
          horizontalTarget.scrollBy({ left: -dx, behavior: 'auto' });
          didScroll = true;
        }
        if (verticalTarget) {
          verticalTarget.scrollBy({ top: -dy, behavior: 'auto' });
          didScroll = true;
        }
      }

      lastX = touch.clientX;
      lastY = touch.clientY;

      if (didScroll && e.cancelable) {
        e.preventDefault();
      }
    };

    const stopTracking = () => {
      isTracking = false;
      hasMoved = false;
      activeTouchId = null;
      startTarget = null;
    };

    root.addEventListener('touchstart', onTouchStart, { passive: true, capture: true });
    root.addEventListener('touchmove', onTouchMove, { passive: false, capture: true });
    root.addEventListener('touchend', stopTracking, { passive: true, capture: true });
    root.addEventListener('touchcancel', stopTracking, { passive: true, capture: true });

    return () => {
      root.removeEventListener('touchstart', onTouchStart, true);
      root.removeEventListener('touchmove', onTouchMove, true);
      root.removeEventListener('touchend', stopTracking, true);
      root.removeEventListener('touchcancel', stopTracking, true);
    };
  }, []);

  return ref;
}
