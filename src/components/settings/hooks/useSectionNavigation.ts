import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

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
  const searchParams = useSearchParams();
  const [activeSection, setActiveSection] = useState<T>(defaultSection);
  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});

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
      router.push(`${basePath}?section=${newSection}`, { scroll: false });
      scrollToSection(newSection);
      onSectionChange?.(newSection);
    },
    [router, basePath, scrollToSection, onSectionChange]
  );

  // Handle URL parameter changes
  useEffect(() => {
    const section = searchParams.get('section') as T | null;
    if (section && navItems.some((item) => item.id === section)) {
      setActiveSection(section);
      setTimeout(() => {
        scrollToSection(section);
      }, 100);
    }
  }, [searchParams, navItems, scrollToSection]);

  // Set default section if none specified (only if shouldSetDefault is true)
  useEffect(() => {
    if (!shouldSetDefault) return;
    const section = searchParams.get('section') as T | null;
    if (!section) {
      router.replace(`${basePath}?section=${defaultSection}`, {
        scroll: false,
      });
    }
  }, [searchParams, router, basePath, defaultSection, shouldSetDefault]);

  return {
    activeSection,
    setActiveSection,
    sectionRefs,
    handleSectionChange,
    scrollToSection,
  };
}
