import {
  Building2,
  Settings,
  MapPin,
  CreditCard,
  Users,
  FileText,
} from 'lucide-react';

// Navigation items for the organization manage sidebar
export const ORG_MANAGE_NAV_ITEMS = [
  { id: 'details', label: 'Organisationsdetails', icon: Building2 },
  { id: 'preferences', label: 'Einstellungen', icon: Settings },
  { id: 'addresses', label: 'Adressen', icon: MapPin },
  { id: 'bank-accounts', label: 'Bankkonten', icon: CreditCard },
  { id: 'user-properties', label: 'Benutzereigenschaften', icon: FileText },
  { id: 'users', label: 'Benutzer', icon: Users },
] as const;

export type OrgManageSectionId =
  (typeof ORG_MANAGE_NAV_ITEMS)[number]['id'];
