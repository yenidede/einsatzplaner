'use client';

import { Button } from '@/components/ui/button';
import { NAV_ITEMS, type SectionId } from './constants';

interface UserSettingsMobileNavProps {
  activeSection: SectionId;
  onSectionChange: (sectionId: SectionId) => void;
}

export function UserSettingsMobileNav({
  activeSection,
  onSectionChange,
}: UserSettingsMobileNavProps) {
  return (
    <>
      {NAV_ITEMS.map((item) =>
        (() => {
          const isActive = item.id === activeSection;
          return (
            <Button
              key={item.id}
              variant={isActive ? 'default' : 'outline'}
              size="sm"
              onClick={() => onSectionChange(item.id)}
              role="tab"
              aria-selected={isActive}
              tabIndex={isActive ? 0 : -1}
            >
              {item.label}
            </Button>
          );
        })()
      )}
    </>
  );
}
