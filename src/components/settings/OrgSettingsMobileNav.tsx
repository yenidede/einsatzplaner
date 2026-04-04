'use client';

import { Button } from '@/components/ui/button';
import {
  ORG_MANAGE_NAV_ITEMS,
  type OrgManageSectionId,
} from './org-manage-constants';

interface OrgSettingsMobileNavProps {
  activeSection: OrgManageSectionId;
  onSectionChange: (sectionId: OrgManageSectionId) => void;
}

export function OrgSettingsMobileNav({
  activeSection,
  onSectionChange,
}: OrgSettingsMobileNavProps) {
  return (
    <>
      {ORG_MANAGE_NAV_ITEMS.map((item) => {
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
            className="min-h-10 shrink-0 touch-manipulation sm:min-h-9"
          >
            <item.icon className="mr-2 h-4 w-4 shrink-0" />
            <span className="whitespace-nowrap">{item.label}</span>
          </Button>
        );
      })}
    </>
  );
}
