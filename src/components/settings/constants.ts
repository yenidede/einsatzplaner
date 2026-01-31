
// Navigation items for the settings sidebar
export const NAV_ITEMS = [
  { id: 'account', label: 'Mein Account' },
  { id: 'notifications', label: 'Benachrichtigungen' },
  { id: 'calendar', label: 'Kalender' },
  { id: 'organizations', label: 'Organisationen' },
] as const;

export type SectionId = (typeof NAV_ITEMS)[number]['id'];
