import { Building2, Settings, FileText, Users, FileDown } from 'lucide-react';

// Navigation items for the organization manage sidebar
export const ORG_MANAGE_NAV_ITEMS = [
  { id: 'details', label: 'Organisationsdetails', icon: Building2 },
  { id: 'preferences', label: 'Präferenzen', icon: Settings },
  { id: 'pdf-export', label: 'PDF-Export', icon: FileDown },
  { id: 'user-properties', label: 'Personeneigenschaften', icon: FileText },
  { id: 'users', label: 'Benutzer', icon: Users },
] as const;

export type OrgManageSectionId = (typeof ORG_MANAGE_NAV_ITEMS)[number]['id'];
