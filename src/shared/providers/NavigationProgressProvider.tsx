'use client';

import { usePathname } from 'next/navigation';
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';

/** Delay before showing the bar so fast navigations don't flash. */
const SHOW_AFTER_MS = 120;
/** Safety: hide bar if route never resolves (e.g. failed request). */
const MAX_SHOW_MS = 30_000;

type NavigationProgressContextValue = {
  isNavigating: boolean;
  /** Call before router.push() when navigating programmatically (e.g. sidebar). */
  startNavigation: () => void;
};

const NavigationProgressContext = createContext<
  NavigationProgressContextValue | undefined
>(undefined);

function isInternalLink(el: EventTarget | null): boolean {
  if (!el || !(el instanceof HTMLElement)) return false;
  const anchor = el.closest?.('a');
  if (!anchor || !anchor.href) return false;
  try {
    const url = new URL(anchor.href);
    if (url.origin !== window.location.origin) return false;
    if (anchor.target === '_blank' || anchor.hasAttribute('download')) return false;
    return url.pathname !== window.location.pathname;
  } catch {
    return false;
  }
}

export function NavigationProgressProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [isNavigating, setIsNavigating] = useState(false);
  const [showBar, setShowBar] = useState(false);
  const showTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const minShowTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const startNavigation = useCallback(() => {
    if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
    if (minShowTimeoutRef.current) clearTimeout(minShowTimeoutRef.current);
    setIsNavigating(true);
    showTimeoutRef.current = setTimeout(() => setShowBar(true), SHOW_AFTER_MS);
    minShowTimeoutRef.current = setTimeout(() => {
      minShowTimeoutRef.current = null;
      setIsNavigating(false);
      setShowBar(false);
    }, MAX_SHOW_MS);
  }, []);

  useEffect(() => {
    setIsNavigating(false);
    setShowBar(false);
    if (showTimeoutRef.current) {
      clearTimeout(showTimeoutRef.current);
      showTimeoutRef.current = null;
    }
    if (minShowTimeoutRef.current) {
      clearTimeout(minShowTimeoutRef.current);
      minShowTimeoutRef.current = null;
    }
  }, [pathname]);

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (!isInternalLink(e.target)) return;
      startNavigation();
    };
    document.addEventListener('click', handleClick, true);
    return () => document.removeEventListener('click', handleClick, true);
  }, [startNavigation]);

  useEffect(() => {
    return () => {
      if (showTimeoutRef.current) clearTimeout(showTimeoutRef.current);
      if (minShowTimeoutRef.current) clearTimeout(minShowTimeoutRef.current);
    };
  }, []);

  return (
    <NavigationProgressContext.Provider
      value={{ isNavigating, startNavigation }}
    >
      {children}
      {showBar && (
        <div
          className="fixed left-0 top-0 z-[99999] h-0.5 w-full overflow-hidden"
          role="progressbar"
          aria-hidden
        >
          <div className="h-full w-1/4 bg-cyan-500/90 dark:bg-cyan-400/90 animate-navigation-progress" />
        </div>
      )}
    </NavigationProgressContext.Provider>
  );
}

export function useNavigationProgress(): NavigationProgressContextValue {
  const ctx = useContext(NavigationProgressContext);
  if (ctx === undefined) {
    throw new Error(
      'useNavigationProgress must be used within NavigationProgressProvider',
    );
  }
  return ctx;
}
