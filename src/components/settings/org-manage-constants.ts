import {
  Building2,
  Settings,
  FileText,
  Users,
  FileDown,
  LayoutTemplate,
  SlidersHorizontal,
} from 'lucide-react';

// Navigation items for the organization manage sidebar - (icons currently not used)
export const ORG_MANAGE_NAV_ITEMS = [
  { id: 'details', label: 'Organisationsdetails', icon: Building2 },
  { id: 'preferences', label: 'Präferenzen', icon: Settings },
  { id: 'standardfelder', label: 'Standardfelder', icon: SlidersHorizontal },
  { id: 'vorlagen', label: 'Vorlagen', icon: LayoutTemplate },
  { id: 'user-properties', label: 'Personeneigenschaften', icon: FileText },
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'pdf-export', label: 'PDF-Export', icon: FileDown },
] as const;

export type OrgManageSectionId = (typeof ORG_MANAGE_NAV_ITEMS)[number]['id'];
