import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';

const SCROLL_OFFSET = 80;

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

  // Get current hash from URL
  const getHashSection = useCallback((): T | null => {
    if (typeof window === 'undefined') return null;
    const hash = window.location.hash.slice(1); // Remove #
    return (hash && navItems.some((item) => item.id === hash)) ? (hash as T) : null;
  }, [navItems]);

  // Scroll to section with offset
  const scrollToSection = useCallback((section: T) => {
    const element = sectionRefs.current[section];
    if (element) {
      const elementPosition = element.getBoundingClientRect().top;
      const offsetPosition = elementPosition + window.scrollY - SCROLL_OFFSET;
      window.scrollTo({
        top: offsetPosition,
        behavior: 'smooth',
      });
    }
  }, []);

  // Handle section change
  const handleSectionChange = useCallback(
    (newSection: T) => {
      setActiveSection(newSection);
      router.push(`${basePath}#${newSection}`, { scroll: false });
      scrollToSection(newSection);
      onSectionChange?.(newSection);
    },
    [router, basePath, scrollToSection, onSectionChange]
  );

  // Handle hash changes
  useEffect(() => {
    const handleHashChange = () => {
      const section = getHashSection();
      if (section && section !== activeSection) {
        setActiveSection(section);
        setTimeout(() => {
          scrollToSection(section);
        }, 100);
      }
    };

    // Check initial hash on mount
    if (typeof window !== 'undefined') {
      handleHashChange();
    }

    // Listen for hash changes
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [getHashSection, scrollToSection, activeSection]);

  // Set default section if none specified (only if shouldSetDefault is true)
  useEffect(() => {
    if (!shouldSetDefault || typeof window === 'undefined') return;
    const currentHash = window.location.hash.slice(1);
    if (!currentHash) {
      router.replace(`${basePath}#${defaultSection}`, {
        scroll: false,
      });
    }
  }, [router, basePath, defaultSection, shouldSetDefault]);

  return {
    activeSection,
    setActiveSection,
    sectionRefs,
    handleSectionChange,
    scrollToSection,
  };
}
