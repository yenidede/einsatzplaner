import { User, Settings, Bell, Calendar, Building2 } from 'lucide-react';

// Navigation items for the settings sidebar
export const NAV_ITEMS = [
  { id: 'account', label: 'Mein Account', icon: User },
  { id: 'preferences', label: 'Präferenzen', icon: Settings },
  { id: 'notifications', label: 'Benachrichtigungen', icon: Bell },
  { id: 'calendar', label: 'Kalender', icon: Calendar },
  { id: 'organizations', label: 'Organisationen', icon: Building2 },
] as const;

export type SectionId = (typeof NAV_ITEMS)[number]['id'];
