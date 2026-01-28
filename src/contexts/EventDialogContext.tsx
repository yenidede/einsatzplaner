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
import { validateEinsatzIdFromUrl } from '@/utils/einsatzLinkUtils';
import { toast } from 'sonner';

interface EventDialogContextValue {
  isOpen: boolean;
  readonly selectedEinsatz: EinsatzCreate | string | null;
  openDialog: (einsatz: EinsatzCreate | string | null) => void;
  closeDialog: () => void;
  setEinsatz: (einsatz: EinsatzCreate | string | null) => boolean;
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

  // Validate einsatz ID from URL and show error if invalid
  useEffect(() => {
    if (einsatzFromUrl) {
      const validatedId = validateEinsatzIdFromUrl(einsatzFromUrl);
      if (!validatedId) {
        toast.error('Ungültige Einsatz-ID in der URL', {
          description: 'Die ID muss ein gültiges UUID-Format haben.',
        });
        // Clear invalid ID from URL
        setEinsatzFromUrl(null);
      }
    }
  }, [einsatzFromUrl, setEinsatzFromUrl]);

  // Compute the actual selectedEinsatz from both URL and local state
  // Only use einsatzFromUrl if it's valid
  const selectedEinsatz = useMemo(() => {
    if (einsatzFromUrl) {
      const validatedId = validateEinsatzIdFromUrl(einsatzFromUrl);
      return validatedId || localSelectedEvent;
    }
    return localSelectedEvent;
  }, [einsatzFromUrl, localSelectedEvent]);

  // Auto-open dialog when selectedEinsatz changes to non-null (e.g., from URL navigation)
  useEffect(() => {
    if (selectedEinsatz !== null && !isOpen) {
      setIsOpen(true);
    } else if (selectedEinsatz === null && isOpen) {
      setIsOpen(false);
    }
  }, [selectedEinsatz, isOpen]);

  // Helper function to update einsatz state (URL or local)
  // Returns true on success, false on validation failure
  const updateEinsatzState = useCallback(
    (event: EinsatzCreate | string | null): boolean => {
      if (typeof event === 'string') {
        // Validate UUID before storing in URL
        const validatedId = validateEinsatzIdFromUrl(event);
        if (!validatedId) {
          toast.error('Ungültige Einsatz-ID', {
            description: 'Die ID muss ein gültiges UUID-Format haben.',
          });
          return false;
        }
        // Store einsatz ID in URL
        setEinsatzFromUrl(validatedId);
        setLocalSelectedEvent(null);
        return true;
      } else if (event && 'id' in event && event.id) {
        // Validate UUID before storing in URL
        const validatedId = validateEinsatzIdFromUrl(event.id);
        if (!validatedId) {
          toast.error('Ungültige Einsatz-ID', {
            description: 'Die ID muss ein gültiges UUID-Format haben.',
          });
          return false;
        }
        // Store einsatz ID in URL if it exists
        setEinsatzFromUrl(validatedId);
        setLocalSelectedEvent(null);
        return true;
      } else {
        // New einsatz or null - store locally only
        setEinsatzFromUrl(null);
        setLocalSelectedEvent(event);
        return true;
      }
    },
    [setEinsatzFromUrl, setLocalSelectedEvent]
  );

  const openDialog = useCallback(
    (event: EinsatzCreate | string | null) => {
      const success = updateEinsatzState(event);
      if (success) {
        setIsOpen(true);
      }
    },
    [updateEinsatzState]
  );

  const closeDialog = useCallback(() => {
    setIsOpen(false);
    setEinsatzFromUrl(null);
    setLocalSelectedEvent(null);
  }, [setEinsatzFromUrl, setLocalSelectedEvent]);

  const setEinsatzFunc = useCallback(
    (event: EinsatzCreate | string | null): boolean => {
      return updateEinsatzState(event);
    },
    [updateEinsatzState]
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
