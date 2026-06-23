import {
  Building2,
  Settings,
  FileText,
  Users,
  FileDown,
  LayoutTemplate,
  SlidersHorizontal,
  Bell,
  CalendarCog,
} from 'lucide-react';

// Navigation items for the organization manage sidebar - (icons currently not used)
export const ORG_MANAGE_NAV_ITEMS = [
  { id: 'details', label: 'Organisationsdetails', icon: Building2 },
  { id: 'preferences', label: 'Präferenzen', icon: Settings },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
  { id: 'standardfelder', label: 'Standardfelder', icon: SlidersHorizontal },
  { id: 'vorlagen', label: 'Vorlagen & eigene Felder', icon: LayoutTemplate },
  {
    id: 'calendar-export-templates',
    label: 'Kalenderexport-Vorlagen',
    icon: CalendarCog,
  },
  { id: 'user-properties', label: 'Personeneigenschaften', icon: FileText },
  { id: 'users', label: 'Benutzer', icon: Users },
  { id: 'document-templates', label: 'Dokumentvorlagen', icon: FileText },
  { id: 'pdf-export', label: 'PDF-Export', icon: FileDown },
] as const;

export type OrgManageSectionId = (typeof ORG_MANAGE_NAV_ITEMS)[number]['id'];
