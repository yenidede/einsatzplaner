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
      {NAV_ITEMS.map((item) => (
        <Button
          key={item.id}
          variant={activeSection === item.id ? 'default' : 'outline'}
          size="sm"
          onClick={() => onSectionChange(item.id)}
          role="tab"
          aria-selected={activeSection === item.id}
        >
          <item.icon className="mr-2 h-4 w-4" />
          {item.label}
        </Button>
      ))}
    </>
  );
}
