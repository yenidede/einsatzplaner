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
      {ORG_MANAGE_NAV_ITEMS.map((item) => (
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
