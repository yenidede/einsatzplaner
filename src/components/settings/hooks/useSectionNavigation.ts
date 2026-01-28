import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const SCROLL_OFFSET = 240;

interface UseSectionNavigationOptions<T extends string> {
  sectionId: T;
  navItems: readonly { id: T }[];
  defaultSection: T;
  basePath: string;
  onSectionChange?: (sectionId: T) => void;
  shouldSetDefault?: boolean; // Only set default if data is loaded
}

export function useSectionNavigation<T extends string>({
  sectionId,
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

  // Get current hash from URL
  const getHashSection = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.slice(1); // Remove #
    return (hash && navItems.some((item) => item.id === hash)) ? (hash as T) : null;
  }, [navItems]);

  // Scroll to section with offset
  const scrollToSection = useCallback((section: T, skipDelay = false) => {
    const element = sectionRefs.current[section];
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - SCROLL_OFFSET;
      const scrollFn = () => {
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
    }
  }, []);

  // Handle section change
  const handleSectionChange = useCallback(
    (newSection: T) => {
      setActiveSection(newSection);
      router.push(`${basePath}#${newSection}`, { scroll: false });
      scrollToSection(newSection, true); // Skip delay for manual navigation
      onSectionChange?.(newSection);
    },
    [router, basePath, scrollToSection, onSectionChange]
  );

  // Initial mount: Check hash first, then set default if needed - only scroll once
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialMountRef.current) return;

    const currentHash = window.location.hash.slice(1);
    const hashSection = getHashSection();
    let targetSection: T | null = null;

    if (hashSection) {
      // Hash exists and is valid - use it
      targetSection = hashSection;
      setActiveSection(hashSection);
    } else if (shouldSetDefault && !currentHash) {
      // No hash - set default hash
      targetSection = defaultSection;
      // Set hash directly to avoid router scroll behavior
      window.history.replaceState(null, '', `${basePath}#${defaultSection}`);
      setActiveSection(defaultSection);
    }

    // Only scroll once after DOM is ready
    if (targetSection && !hasScrolledRef.current) {
      // Use requestAnimationFrame to ensure DOM is ready
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (!hasScrolledRef.current && targetSection) {
            scrollToSection(targetSection, false);
          }
        });
      });
    }

    isInitialMountRef.current = false;
  }, [getHashSection, shouldSetDefault, basePath, defaultSection, scrollToSection]);

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
