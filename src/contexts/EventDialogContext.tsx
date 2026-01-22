'use client';

import {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
  useCallback,
  Suspense,
  useEffect,
} from 'react';
import { EinsatzCreate } from '@/features/einsatz/types';
import { parseAsString, useQueryState } from 'nuqs';

interface EventDialogContextValue {
  isOpen: boolean;
  readonly selectedEinsatz: EinsatzCreate | string | null;
  openDialog: (einsatz: EinsatzCreate | string | null) => void;
  closeDialog: () => void;
  setEinsatz: (einsatz: EinsatzCreate | string | null) => void;
}

const EventDialogContext = createContext<EventDialogContextValue | undefined>(
  undefined
);

export function useEventDialogFromContext() {
  const context = useContext(EventDialogContext);
  if (!context) {
    throw new Error(
      'useEventDialog must be used within an EventDialogProvider'
    );
  }
  return context;
}

interface EventDialogProviderProps {
  children: ReactNode;
}

function EventDialogProviderInner({ children }: EventDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);

  // URL state for einsatz ID (string only)
  const [einsatzFromUrl, setEinsatzFromUrl] = useQueryState(
    'einsatz',
    parseAsString.withOptions({
      history: 'push',
    })
  );

  // Local state for full event object (can be string, EinsatzCreate, or null)
  const [localSelectedEvent, setLocalSelectedEvent] = useState<
    EinsatzCreate | string | null
  >(null);

  // Compute the actual selectedEinsatz from both URL and local state
  const selectedEinsatz = einsatzFromUrl || localSelectedEvent;

  // Auto-open dialog when selectedEinsatz changes to non-null (e.g., from URL navigation)
  useEffect(() => {
    if (selectedEinsatz !== null && !isOpen) {
      setIsOpen(true);
    } else if (selectedEinsatz === null && isOpen) {
      setIsOpen(false);
    }
  }, [selectedEinsatz, isOpen]);

  const openDialog = useCallback(
    (event: EinsatzCreate | string | null) => {
      if (typeof event === 'string') {
        // Store einsatz ID in URL
        setEinsatzFromUrl(event);
        setLocalSelectedEvent(null);
      } else if (event && 'id' in event && event.id) {
        // Store einsatz ID in URL if it exists
        setEinsatzFromUrl(event.id);
        setLocalSelectedEvent(null);
      } else {
        // New einsatz or null - store locally only
        setEinsatzFromUrl(null);
        setLocalSelectedEvent(event);
      }
      setIsOpen(true);
    },
    [setEinsatzFromUrl, setLocalSelectedEvent]
  );

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setEinsatzFromUrl(null);
    setLocalSelectedEvent(null);
  }, [setEinsatzFromUrl, setLocalSelectedEvent]);

  const setEinsatzFunc = useCallback(
    (event: EinsatzCreate | string | null) => {
      if (typeof event === 'string') {
        // Store einsatz ID in URL
        setEinsatzFromUrl(event);
        setLocalSelectedEvent(null);
      } else if (event && 'id' in event && event.id) {
        // Store einsatz ID in URL if it exists
        setEinsatzFromUrl(event.id);
        setLocalSelectedEvent(null);
      } else {
        // New einsatz or null - store locally only
        setEinsatzFromUrl(null);
        setLocalSelectedEvent(event);
      }
    },
    [setEinsatzFromUrl, setLocalSelectedEvent]
  );

  const contextValue: EventDialogContextValue = useMemo(
    () => ({
      isOpen,
      openDialog,
      closeDialog,
      selectedEinsatz,
      setEinsatz: setEinsatzFunc,
    }),
    [isOpen, selectedEinsatz, openDialog, closeDialog, setEinsatzFunc]
  );

  return (
    <EventDialogContext.Provider value={contextValue}>
      {children}
    </EventDialogContext.Provider>
  );
}

export function EventDialogProvider({ children }: EventDialogProviderProps) {
  return (
    <Suspense fallback={null}>
      <EventDialogProviderInner>{children}</EventDialogProviderInner>
    </Suspense>
  );
}
