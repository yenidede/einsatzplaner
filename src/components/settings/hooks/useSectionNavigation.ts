import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const SCROLL_OFFSET = 240;
const SCROLL_RETRY_DELAY_MS = 60;
const SCROLL_MAX_RETRIES = 20;

interface UseSectionNavigationOptions<T extends string> {
  navItems: readonly { id: T }[];
  defaultSection: T;
  basePath: string;
  onSectionChange?: (sectionId: T) => void;
  shouldSetDefault?: boolean; // Only set default if data is loaded
}

export function useSectionNavigation<T extends string>({
  navItems,
  defaultSection,
  basePath,
  onSectionChange,
  shouldSetDefault = true,
}: UseSectionNavigationOptions<T>) {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState<T>(defaultSection);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const hasScrolledRef = useRef(false); // Track if we've done initial scroll
  const isInitialMountRef = useRef(true); // Track initial mount
  const navigationIdRef = useRef(0); // Cancellation token: increment on each new scroll request so stale retries abort
  const prevShouldSetDefaultRef = useRef(shouldSetDefault);

  // Store values in refs to avoid dependency array issues
  const navItemsRef = useRef(navItems);
  const basePathRef = useRef(basePath);
  const defaultSectionRef = useRef(defaultSection);
  const shouldSetDefaultRef = useRef(shouldSetDefault);

  // Update refs when values change
  useEffect(() => {
    navItemsRef.current = navItems;
    basePathRef.current = basePath;
    defaultSectionRef.current = defaultSection;
    shouldSetDefaultRef.current = shouldSetDefault;
  }, [navItems, basePath, defaultSection, shouldSetDefault]);

  // Get current hash from URL
  const getHashSection = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.slice(1); // Remove #
    return hash && navItemsRef.current.some((item) => item.id === hash)
      ? (hash as T)
      : null;
  }, []);

  // Scroll to section with offset; retries when target element is not yet in DOM.
  // requestId gates all timeouts and scroll actions so stale retries from older navigations abort.
  const scrollToSection = useCallback(
    (section: T, skipDelay = false, attempt = 0, requestId?: number) => {
      const myId =
        attempt === 0 ? ++navigationIdRef.current : (requestId ?? 0);

      const element = sectionRefs.current[section];
      if (element) {
        if (myId !== navigationIdRef.current) return;

        const elementPosition = element.getBoundingClientRect().top;
        const offsetPosition =
          elementPosition + window.scrollY - SCROLL_OFFSET;
        const scrollFn = () => {
          if (myId !== navigationIdRef.current) return;
          window.scrollTo({
            top: offsetPosition,
            behavior: 'smooth',
          });
          hasScrolledRef.current = true;
        };

        if (skipDelay) {
          scrollFn();
        } else {
          setTimeout(scrollFn, 100);
        }
      } else if (attempt < SCROLL_MAX_RETRIES) {
        if (myId !== navigationIdRef.current) return;
        setTimeout(
          () => scrollToSection(section, skipDelay, attempt + 1, myId),
          SCROLL_RETRY_DELAY_MS
        );
      }
    },
    []
  );

  // Handle section change
  const handleSectionChange = useCallback(
    (newSection: T) => {
      setActiveSection(newSection);
      router.push(`${basePathRef.current}#${newSection}`, { scroll: false });
      scrollToSection(newSection, true); // Skip delay for manual navigation
      onSectionChange?.(newSection);
    },
    [router, scrollToSection, onSectionChange]
  );

  // Shared: resolve target section from hash or default, update URL/state, return section to scroll to (or null).
  const resolveTargetSectionAndUpdateState = useCallback(
    (setDefaultWhenNoHash: boolean): T | null => {
      if (typeof window === 'undefined') return null;
      const hashSection = getHashSection();
      if (hashSection) {
        setActiveSection(hashSection);
        return hashSection;
      }
      if (setDefaultWhenNoHash) {
        const def = defaultSectionRef.current;
        window.history.replaceState(null, '', `${basePathRef.current}#${def}`);
        setActiveSection(def);
        return def;
      }
      return null;
    },
    [getHashSection]
  );

  // Shared: schedule scroll to section after DOM is ready (double rAF), only if we haven't scrolled yet.
  const scheduleScrollToSection = useCallback(
    (targetSection: T | null) => {
      if (!targetSection || hasScrolledRef.current) return;
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!hasScrolledRef.current && targetSection) {
            scrollToSection(targetSection, false);
          }
        });
      });
    },
    [scrollToSection]
  );

  // Initial mount: Check hash first, then set default if needed - only scroll once
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialMountRef.current) return;

    const currentHash = window.location.hash.slice(1);
    const setDefaultWhenNoHash =
      Boolean(shouldSetDefaultRef.current) && !currentHash;
    const targetSection =
      resolveTargetSectionAndUpdateState(setDefaultWhenNoHash);
    scheduleScrollToSection(targetSection);
    isInitialMountRef.current = false;
  }, [resolveTargetSectionAndUpdateState, scheduleScrollToSection]);

  // When content becomes ready (shouldSetDefault flips false → true), set default and scroll
  useEffect(() => {
    const prev = prevShouldSetDefaultRef.current;
    prevShouldSetDefaultRef.current = shouldSetDefault;

    if (
      prev === false &&
      shouldSetDefault === true &&
      typeof window !== 'undefined'
    ) {
      const targetSection = resolveTargetSectionAndUpdateState(true);
      scheduleScrollToSection(targetSection);
    }
  }, [
    shouldSetDefault,
    resolveTargetSectionAndUpdateState,
    scheduleScrollToSection,
  ]);

  // Handle hash changes (after initial mount)
  useEffect(() => {
    if (isInitialMountRef.current) return; // Skip on initial mount

    const handleHashChange = () => {
      const section = getHashSection();
      if (section && section !== activeSection) {
        setActiveSection(section);
        // Reset scroll flag for new hash changes
        hasScrolledRef.current = false;
        setTimeout(() => {
          scrollToSection(section, true);
        }, 100);
      }
    };

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getHashSection, scrollToSection, activeSection]);

  return {
    activeSection,
    setActiveSection,
    sectionRefs,
    handleSectionChange,
    scrollToSection,
  };
}
