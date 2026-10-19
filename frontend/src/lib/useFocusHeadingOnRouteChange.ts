import { useEffect, useRef, type RefObject } from 'react';

// Lazy pages and data loads can take a while before their heading renders.
const WAIT_MS = 5000;

/**
 * After client-side navigation, moves keyboard and screen reader focus to the new page's <h1>
 * inside `containerRef`, waiting for it to render if needed. The first render is left alone,
 * and so is a page that has already put focus inside the container (e.g. an autofocused input).
 */
export function useFocusHeadingOnRouteChange(
  containerRef: RefObject<HTMLElement | null>,
  pathname: string,
) {
  const isFirst = useRef(true);

  useEffect(() => {
    if (isFirst.current) {
      isFirst.current = false;
      return;
    }
    const container = containerRef.current;
    if (!container) return;

    const tryFocus = () => {
      if (container.contains(document.activeElement)) return true;
      const heading = container.querySelector<HTMLElement>('h1');
      if (!heading) return false;
      if (!heading.hasAttribute('tabindex')) heading.setAttribute('tabindex', '-1');
      heading.focus();
      return true;
    };

    if (tryFocus()) return;

    const observer = new MutationObserver(() => {
      if (tryFocus()) stop();
    });
    const timer = setTimeout(() => stop(), WAIT_MS);
    function stop() {
      observer.disconnect();
      clearTimeout(timer);
    }
    observer.observe(container, { childList: true, subtree: true });
    return stop;
  }, [containerRef, pathname]);
}
