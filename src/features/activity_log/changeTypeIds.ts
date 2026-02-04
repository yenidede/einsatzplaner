/**
 * Centralized mapping of change_type names to their database UUIDs.
 * Values must match the change_type table (id column).
 */
export const ChangeTypeIds = {
  'E-Bearbeitet': '052f7f39-cf1c-439d-864d-24f3caa2cc07',
  'N-Entfernt': '5896cd7f-ed88-4453-891a-c09bb4f5fca2',
  'N-Eingetragen': '5d54acc1-89cd-48a0-9c63-abe17f4ed5ce',
  'E-Erstellt': '6ceb0d0c-ab5b-4924-bb66-a7e7367f997',
  'N-Zugewiesen': '791e76d5-1fe2-4e79-8057-786dcedaba8b',
  'E-Bestaetigt': '80164142-44a4-4660-a366-76609bbcdbb',
  'N-Abgesagt': '8951ec4b-4479-48c1-973a-d1c5e5b3cc9f',
  'E-Geloescht': 'db2d7fb0-5d3c-4480-b83a-8e6584d1b4b',
} as const;

export type ChangeTypeName = keyof typeof ChangeTypeIds;
