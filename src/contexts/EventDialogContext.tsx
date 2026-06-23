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
import { useSession } from 'next-auth/react';
import { parseAsString, useQueryState } from 'nuqs';
import { validateEinsatzIdFromUrl } from '@/utils/einsatzLinkUtils';
import { toast } from 'sonner';
import { useActiveOrganizationSwitch } from '@/hooks/use-active-organization-switch';

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
  const [isOrgSwitchPending, setIsOrgSwitchPending] = useState(false);
  const { data: session } = useSession();
  const { switchOrganization } = useActiveOrganizationSwitch();

  // URL state for einsatz ID (string only)
  const [einsatzFromUrl, setEinsatzFromUrl] = useQueryState(
    'einsatz',
    parseAsString.withOptions({
      history: 'push',
    })
  );
  const [orgFromUrl, setOrgFromUrl] = useQueryState(
    'org',
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

  // If URL specifies a different org context, switch first, then allow dialog to open.
  useEffect(() => {
    const run = async () => {
      if (!einsatzFromUrl || !orgFromUrl) {
        setIsOrgSwitchPending(false);
        return;
      }

      const activeOrgId = session?.user.activeOrganization?.id;
      if (!activeOrgId || orgFromUrl === activeOrgId) {
        setIsOrgSwitchPending(false);
        return;
      }

      const userOrgIds = session?.user.orgIds ?? [];
      if (!userOrgIds.includes(orgFromUrl)) {
        setIsOrgSwitchPending(false);
        return;
      }

      setIsOrgSwitchPending(true);
      try {
        await switchOrganization(orgFromUrl, {
          showSuccessToast: false,
          syncSettingsRoute: false,
        });
      } finally {
        setIsOrgSwitchPending(false);
      }
    };

    void run();
  }, [
    einsatzFromUrl,
    orgFromUrl,
    session?.user.activeOrganization?.id,
    session?.user.orgIds,
    switchOrganization,
  ]);

  // Compute the actual selectedEinsatz from both URL and local state
  // Only use einsatzFromUrl if it's valid
  const selectedEinsatz = useMemo(() => {
    if (einsatzFromUrl) {
      const validatedId = validateEinsatzIdFromUrl(einsatzFromUrl);
      return validatedId || localSelectedEvent;
    }
    return localSelectedEvent;
  }, [einsatzFromUrl, localSelectedEvent]);

  const shouldWaitForOrgSwitch = useMemo(() => {
    if (!einsatzFromUrl || !orgFromUrl) {
      return false;
    }

    const activeOrgId = session?.user.activeOrganization?.id;
    if (!activeOrgId) {
      return false;
    }

    if (orgFromUrl === activeOrgId) {
      return false;
    }

    const userOrgIds = session?.user.orgIds ?? [];
    return userOrgIds.includes(orgFromUrl);
  }, [
    einsatzFromUrl,
    orgFromUrl,
    session?.user.activeOrganization?.id,
    session?.user.orgIds,
  ]);

  // Auto-open dialog when selectedEinsatz changes to non-null (e.g., from URL navigation).
  // Do not auto-close when selectedEinsatz is null: null means "create new" and the dialog
  // should stay open; closing is handled by closeDialog().
  useEffect(() => {
    if (
      selectedEinsatz !== null &&
      !isOpen &&
      !isOrgSwitchPending &&
      !shouldWaitForOrgSwitch
    ) {
      setIsOpen(true);
    }
  }, [selectedEinsatz, isOpen, isOrgSwitchPending, shouldWaitForOrgSwitch]);

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
        setOrgFromUrl(null);
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
        setOrgFromUrl(null);
        setLocalSelectedEvent(null);
        return true;
      } else {
        // New einsatz or null - store locally only
        setEinsatzFromUrl(null);
        setOrgFromUrl(null);
        setLocalSelectedEvent(event);
        return true;
      }
    },
    [setEinsatzFromUrl, setLocalSelectedEvent, setOrgFromUrl]
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
    setOrgFromUrl(null);
    setLocalSelectedEvent(null);
  }, [setEinsatzFromUrl, setLocalSelectedEvent, setOrgFromUrl]);

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
