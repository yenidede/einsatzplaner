type LockedEventSource = {
  id: string;
  isLocked?: boolean | null;
};

type LockedEventCollections = {
  detailedEinsaetze?: LockedEventSource[] | null;
  events?: LockedEventSource[] | null;
};

export function collectLockedEventIds(
  data?: LockedEventCollections | null
): string[] {
  const lockedIds = new Set<string>();

  data?.detailedEinsaetze?.forEach((entry) => {
    if (entry.isLocked) {
      lockedIds.add(entry.id);
    }
  });

  data?.events?.forEach((entry) => {
    if (entry.isLocked) {
      lockedIds.add(entry.id);
    }
  });

  return Array.from(lockedIds);
}
