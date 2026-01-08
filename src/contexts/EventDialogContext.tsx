'use client';

import React, {
  createContext,
  useContext,
  useState,
  ReactNode,
  useMemo,
} from 'react';
import { EinsatzCreate } from '@/features/einsatz/types';

interface EventDialogContextValue {
  isOpen: boolean;
  selectedEvent: EinsatzCreate | string | null;
  openDialog: (event: EinsatzCreate | string | null) => void;
  closeDialog: () => void;
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

export function EventDialogProvider({ children }: EventDialogProviderProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedEvent, setSelectedEvent] = useState<
    EinsatzCreate | string | null
  >(null);

  const openDialog = (event: EinsatzCreate | string | null) => {
    setSelectedEvent(event);
    setIsOpen(true);
  };

  const closeDialog = () => {
    setIsOpen(false);
    setSelectedEvent(null);
  };

  const contextValue: EventDialogContextValue = useMemo(
    () => ({
      isOpen,
      selectedEvent,
      openDialog,
      closeDialog,
    }),
    [isOpen, selectedEvent]
  );

  return (
    <EventDialogContext.Provider value={contextValue}>
      {children}
    </EventDialogContext.Provider>
  );
}
