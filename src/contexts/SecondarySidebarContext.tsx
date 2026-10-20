/**
 * SecondarySidebarContext
 *
 * Lifts the secondary sidebar's `isMinimized` state out of the
 * SecondarySidebar component so the Layout can compute the main
 * content's `marginLeft` based on the sidebar's *actual* rendered width.
 *
 * Previously the sidebar's minimize state was kept inside the component,
 * which meant the main content area always reserved space for the
 * *expanded* sidebar (`13rem`). That defeated the purpose of minimizing
 * the sidebar — the page content kept the same horizontal occupancy
 * instead of expanding to fill the freed space.
 *
 * With this context, the Layout can subtract the difference between the
 * expanded and minimized widths from the main content's left margin
 * whenever the sidebar is minimized.
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from 'react';

/**
 * Pixel / rem width constants. Keep these in sync with the matching
 * Tailwind classes used by SecondarySidebar.tsx so the Layout's
 * `marginLeft` is always in lockstep with the sidebar's rendered width.
 *
 *  - EXPANDED_WIDTH:  w-52  = 13rem  (208px)  — full sidebar with labels
 *  - MINIMIZED_WIDTH_DESKTOP: w-14 = 3.5rem (56px) — minimized, normal mode
 *  - MINIMIZED_WIDTH_PRIMARY: w-16 sm:w-20 = 4rem / 5rem (64-80px)
 *                              — minimized, when acting as primary
 */
export const SECONDARY_SIDEBAR_WIDTHS = {
  EXPANDED: '13rem', // 208px — must match `w-52` on SecondarySidebar
  MINIMIZED_DESKTOP: '3.5rem', // 56px — must match `w-14`
  MINIMIZED_PRIMARY: '5rem', // 80px (sm+) — must match `w-20` when asPrimary
  MINIMIZED_PRIMARY_MOBILE: '4rem', // 64px — must match `w-16` (<sm)
} as const;

export interface SecondarySidebarContextValue {
  /** Whether the secondary sidebar is currently in its minimized (icon-only) state. */
  isSecondaryMinimized: boolean;
  /** Toggle the minimized state. */
  toggleSecondaryMinimized: () => void;
  /** Force a specific value (used for the responsive auto-minimize logic). */
  setSecondaryMinimized: (value: boolean) => void;
  /**
   * The width the secondary sidebar is *currently* occupying, expressed as a
   * CSS length. Useful for inline styles that need to mirror the sidebar
   * exactly (e.g. the main content's `marginLeft`).
   */
  getSecondarySidebarWidth: (isSecondaryAsPrimary: boolean) => string;
}

const SecondarySidebarContext = createContext<SecondarySidebarContextValue | undefined>(
  undefined,
);

export interface SecondarySidebarProviderProps {
  children: React.ReactNode;
}

export const SecondarySidebarProvider: React.FC<SecondarySidebarProviderProps> = ({
  children,
}) => {
  const [isSecondaryMinimized, setIsSecondaryMinimizedState] = useState(false);

  const setSecondaryMinimized = useCallback((value: boolean) => {
    setIsSecondaryMinimizedState(value);
  }, []);

  const toggleSecondaryMinimized = useCallback(() => {
    setIsSecondaryMinimizedState((prev) => !prev);
  }, []);

  const getSecondarySidebarWidth = useCallback(
    (isSecondaryAsPrimary: boolean): string => {
      if (!isSecondaryMinimized) {
        return SECONDARY_SIDEBAR_WIDTHS.EXPANDED;
      }
      // When minimized, the rendered width depends on whether the secondary
      // sidebar is acting as the primary sidebar (fullwidth mode).
      if (isSecondaryAsPrimary) {
        // Tailwind's sm breakpoint is 640px; we don't have the viewport width
        // here, so we return the larger width. The Layout can override the
        // mobile case via media queries if needed.
        return SECONDARY_SIDEBAR_WIDTHS.MINIMIZED_PRIMARY;
      }
      return SECONDARY_SIDEBAR_WIDTHS.MINIMIZED_DESKTOP;
    },
    [isSecondaryMinimized],
  );

  const value = useMemo<SecondarySidebarContextValue>(
    () => ({
      isSecondaryMinimized,
      toggleSecondaryMinimized,
      setSecondaryMinimized,
      getSecondarySidebarWidth,
    }),
    [isSecondaryMinimized, toggleSecondaryMinimized, setSecondaryMinimized, getSecondarySidebarWidth],
  );

  return (
    <SecondarySidebarContext.Provider value={value}>
      {children}
    </SecondarySidebarContext.Provider>
  );
};

export const useSecondarySidebar = (): SecondarySidebarContextValue => {
  const context = useContext(SecondarySidebarContext);
  if (context === undefined) {
    throw new Error('useSecondarySidebar must be used within a SecondarySidebarProvider');
  }
  return context;
};

export default SecondarySidebarContext;
