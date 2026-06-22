'use client';

import { Plus } from 'lucide-react';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  useCalendarExportEligibility,
  useCalendarExports,
} from '@/features/calendar-subscription/hooks/useCalendarSubscription';
import { CalendarExportDialog } from './CalendarExportDialog';

export function CalendarExportGlobalCreate({
  activeOrgId,
}: {
  activeOrgId?: string | null;
}) {
  const [open, setOpen] = useState(false);
  const eligibilityQuery = useCalendarExportEligibility();
  const calendarExports = useCalendarExports();
  const eligibility = eligibilityQuery.data ?? [];

  if (eligibilityQuery.isLoading || eligibility.length === 0) {
    return null;
  }

  return (
    <>
      <Button onClick={() => setOpen(true)}>
        <Plus className="mr-2 h-4 w-4" />
        Export erstellen
      </Button>
      <CalendarExportDialog
        open={open}
        mode="personal"
        eligibility={eligibility}
        initialOrgId={activeOrgId}
        onOpenChange={setOpen}
        onSavePersonal={async (input) => {
          const result = await calendarExports.createExport.mutateAsync(input);
          return {
            name: result.name,
            webcalUrl: result.webcalUrl,
            httpUrl: result.httpUrl,
          };
        }}
      />
    </>
  );
}
