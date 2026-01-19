'use client';

import { useState } from 'react';
import type { JSX, ReactNode } from 'react';
import { FileDown } from 'lucide-react';

import { getBadgeColorClassByStatus, handlePdfGenerate } from './utils';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';
import { useQuery } from '@tanstack/react-query';
import { queryKeys as OrgaQueryKeys } from '@/features/organization/queryKeys';
import { queryKeys as UserQueryKeys } from '@/features/user/queryKeys';
import { queryKeys as StatusQueryKeys } from '@/features/einsatz_status/queryKeys';
import { getCategoriesByOrgIds } from '@/features/category/cat-dal';
import { getAllUsersWithRolesByOrgId } from '@/features/user/user-dal';
import { queryKeys as einsatzQueryKeys } from '@/features/einsatz/queryKeys';
import TooltipCustom from '../tooltip-custom';

import { usePdfGenerator } from '@/features/pdf/hooks/usePdfGenerator';
import { useSession } from 'next-auth/react';
import { getOrganizationsByIds } from '@/features/organization/org-dal';
import { toast } from 'sonner';

import { GetStatuses } from '@/features/einsatz_status/status-dal';
import { cn } from '@/lib/utils';
import { EinsatzActivityLog } from '@/features/activity_log/components/ActivityLogWrapperEinsatzDialog';
import { motion } from 'framer-motion';
import { useAlertDialog } from '@/hooks/use-alert-dialog';
import { getUserPropertiesByOrgId } from '@/features/user_properties/user_property-dal';
import { userPropertyQueryKeys } from '@/features/user_properties/queryKeys';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';

interface EventDialogProps {
  einsatz: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignToggleEvent: (einsatzId: string) => void;
}

type UserPropertyWithField = {
  id: string;
  field?: {
    name?: string | null;
  };
};
export function EventDialogHelfer({
  einsatz,
  isOpen,
  onClose,
  onAssignToggleEvent,
}: EventDialogProps) {
  const [showAllActivities, setShowAllActivities] = useState(false);
  const { showDialog, AlertDialogComponent } = useAlertDialog();

  const { data: session } = useSession();

  const activeOrgId = session?.user?.activeOrganization?.id;
  const currentUserId = session?.user?.id;

  const { generatePdf } = usePdfGenerator();

  // Fetch detailed einsatz data when einsatz is a string (UUID)
  const { data: detailedEinsatz, isLoading } = useQuery({
    // only enabled if it's a string (uuid)
    queryKey: einsatzQueryKeys.detailedEinsatz(einsatz as string),
    queryFn: async () => {
      const res = await getEinsatzWithDetailsById(einsatz as string);
      if (!(res instanceof Response)) return res;
      toast.error('Failed to fetch einsatz details: ' + res.statusText);
    },
    enabled: typeof einsatz === 'string' && isOpen,
  });

  const categoriesQuery = useQuery({
    queryKey: einsatzQueryKeys.categories(activeOrgId ?? ''),
    queryFn: () => getCategoriesByOrgIds(activeOrgId ? [activeOrgId] : []),
    enabled: !!activeOrgId,
  });

  const usersQuery = useQuery({
    queryKey: UserQueryKeys.users(activeOrgId ?? ''),
    queryFn: () => {
      return getAllUsersWithRolesByOrgId(activeOrgId ?? '');
    },
    enabled: !!activeOrgId,
  });

  const { data: userProperties } = useQuery<UserPropertyWithField[]>({
    queryKey: userPropertyQueryKeys.byOrg(activeOrgId ?? ''),
    queryFn: () => getUserPropertiesByOrgId(activeOrgId ?? ''),
    enabled: !!activeOrgId,
  });
  const { data: organizations } = useQuery({
    queryKey: OrgaQueryKeys.organizations(session?.user.orgIds ?? []),
    queryFn: () => getOrganizationsByIds(session?.user.orgIds ?? []),
    enabled: !!session?.user.orgIds?.length,
  });

  const { data: statuses } = useQuery({
    queryKey: StatusQueryKeys.statuses(),
    queryFn: () => GetStatuses(),
  });

  const { einsatz_singular, helper_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  const creator = usersQuery.data?.find(
    (user) => user.id === detailedEinsatz?.created_by
  );

  // Return early without error toast during loading
  if (!activeOrgId || !currentUserId) {
    return isOpen ? (
      <Dialog open={isOpen}>
        <DialogContent>Laden...</DialogContent>
      </Dialog>
    ) : null;
  }

  // normally should open the create dialog, in helferansicht just return
  if (isOpen && !einsatz) return;

  const assigned_count = detailedEinsatz?.assigned_users?.length ?? 0;
  const max_assigned_count = Number(detailedEinsatz?.helpers_needed ?? 0);
  const status = detailedEinsatz?.assigned_users?.includes(currentUserId)
    ? 'eigene'
    : statuses?.find((s) => s.id === detailedEinsatz?.status_id);

  // Personeneigenschaft Validation
  const validateAssignment = async (assigning: boolean) => {
    if (!detailedEinsatz || !usersQuery?.data) return true;

    const assigned = detailedEinsatz.assigned_users ?? [];
    const currentAssignedSet = new Set<string>(
      assigning
        ? [...assigned, currentUserId ?? '']
        : assigned.filter((id) => id !== currentUserId)
    );

    const assignedDetails =
      usersQuery.data?.filter((u) => currentAssignedSet.has(u.id)) ?? [];

    const warnings: string[] = [];

    for (const propConfig of detailedEinsatz.user_properties ?? []) {
      if (!propConfig.is_required) continue;
      const minRequired =
        typeof propConfig.min_matching_users === 'number'
          ? propConfig.min_matching_users
          : 1;

      const usersWithProp = assignedDetails.filter((user) => {
        const upv = user.user_property_value?.find(
          (pv) => pv.user_property_id === propConfig.user_property_id
        );
        const raw = upv?.value ?? '';
        const val = String(raw).toLowerCase().trim();
        if (val === 'true' || val === '1') return true;
        return val !== '';
      });

      const propertyName =
        userProperties?.find((p) => p.id === propConfig.user_property_id)?.field
          ?.name ?? propConfig.user_property_id;

      if ((usersWithProp?.length ?? 0) < minRequired) {
        warnings.push(
          `Personeneigenschaft '${propertyName}': mind. ${minRequired} benötigte (aktuell: ${
            usersWithProp?.length ?? 0
          })`
        );
      }
    }

    if (warnings.length === 0) return true;

    await showDialog({
      title: 'Eintragen nicht möglich',
      description:
        'Folgende Kriterien wären nach dieser Aktion nicht erfüllt:\n\n' +
        warnings.map((w) => `• ${w}`).join('\n') +
        '\n\nBitte wenden Sie sich an die Einsatzverwaltung, um die erforderlichen Personeneigenschaften zu klären.',
      confirmText: 'OK',
    });

    return false;
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      {AlertDialogComponent}
      <DialogContent className="flex max-h-[90vh] max-w-220 flex-col">
        <DialogHeader className="bg-background sticky top-0 z-10 shrink-0 border-b pb-4">
          <DialogTitle>
            <div className="flex items-center">
              {isLoading
                ? 'Laden...'
                : `Für '${
                    detailedEinsatz?.title ?? ''
                  }' eintragen (${assigned_count}/${max_assigned_count})`}
              {status && (
                <TooltipCustom
                  text={`${
                    status === 'eigene' ? 'eigene' : status.helper_text
                  }`}
                >
                  <div
                    className={cn(
                      getBadgeColorClassByStatus(status, 'helper'),
                      'ml-2 inline-block h-4 w-4 rounded-full'
                    )}
                  ></div>
                </TooltipCustom>
              )}
            </div>
          </DialogTitle>
          <div>
            {detailedEinsatz ? (
              <>
                {detailedEinsatz.start.toLocaleDateString('de-DE', {
                  weekday: 'short',
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric',
                })}{' '}
                {detailedEinsatz.all_day ? (
                  'Ganztägig'
                ) : (
                  <>
                    (
                    {detailedEinsatz.start.toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    -
                    {detailedEinsatz.end.toLocaleTimeString('de-DE', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                    )
                  </>
                )}
              </>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            Für {detailedEinsatz?.title ?? ''} eintragen Dialog Modal
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <DefinitionList>
            <DefinitionItem label="Kategorie">
              {detailedEinsatz?.categories.length ? (
                <ul className="list-inside list-disc space-y-1">
                  {categoriesQuery?.data
                    ?.filter((cat) =>
                      detailedEinsatz?.categories.includes(cat.id)
                    )
                    .map((cat) => (
                      <li key={cat.id}>
                        {cat.value} ({cat.abbreviation})
                      </li>
                    ))}
                </ul>
              ) : (
                'Keine Kategorie zugeordnet'
              )}
            </DefinitionItem>

            {detailedEinsatz?.total_price != null &&
              detailedEinsatz?.participant_count != null && (
                <DefinitionItem label="Teilnehmer/Preis">
                  {`${detailedEinsatz?.participant_count ?? '?'} Personen; €${
                    detailedEinsatz?.price_per_person ?? '?'
                  } p.P. = €${detailedEinsatz?.total_price ?? '?'}`}
                </DefinitionItem>
              )}

            <DefinitionItem label={helper_plural}>
              <ul className="list-inside list-disc space-y-1">
                {detailedEinsatz?.assigned_users ===
                undefined ? null : detailedEinsatz.assigned_users.length ===
                  0 ? (
                  <li className="text-gray-500 italic">
                    Noch niemand hinzugefügt.
                  </li>
                ) : (
                  usersQuery.data
                    ?.filter((user) =>
                      detailedEinsatz.assigned_users?.includes(user.id)
                    )
                    .map((user) => (
                      <li key={user.id}>
                        {user.id === session.user.id ? (
                          <b>{`${user.firstname} ${user.lastname} (Ich)`}</b>
                        ) : (
                          `${user.firstname} ${user.lastname} (${user.email})`
                        )}
                      </li>
                    ))
                )}
              </ul>
            </DefinitionItem>
            <DefinitionItem label="Erstellt von">
              <div>
                {creator?.firstname} {creator?.lastname}
              </div>
              <div>{creator?.email}</div>
            </DefinitionItem>
            {!!detailedEinsatz && detailedEinsatz.einsatz_fields.length > 0 && (
              <>
                <SectionDivider text="Eigene Felder" />
                {detailedEinsatz.einsatz_fields
                  .filter((field) => field.field_type.datatype !== 'fieldgroup')
                  .sort((a, b) =>
                    (a.group_name || '').localeCompare(b.group_name || '')
                  )
                  .map((field) => {
                    return (
                      <DefinitionItem
                        key={field.id}
                        label={field.field_name || 'Kein Feldname verfügbar'}
                      >
                        {field.value ?? '-'}
                      </DefinitionItem>
                    );
                  })}
              </>
            )}
            <div className="col-span-full border-t pt-4">
              {einsatz && (
                <EinsatzActivityLog einsatzId={einsatz} initialLimit={3} />
              )}
            </div>
          </DefinitionList>
        </div>
        <DialogFooter className="bg-background sticky bottom-0 z-10 shrink-0 flex-row border-t pt-4 sm:justify-between">
          <TooltipCustom text="PDF-Bestätigung drucken">
            <Button
              autoFocus={false}
              variant="outline"
              size="icon"
              onClick={() =>
                handlePdfGenerate(
                  einsatz_singular,
                  {
                    id: detailedEinsatz?.id,
                    title:
                      detailedEinsatz?.title ??
                      'Name konnte nicht geladen werden!',
                  },
                  generatePdf
                )
              }
              aria-label="PDF-Bestätigung drucken"
            >
              <FileDown size={16} aria-hidden="true" />
            </Button>
          </TooltipCustom>
          <div className="flex flex-1 justify-end gap-2">
            <Button variant="outline" onClick={onClose} autoFocus={isOpen}>
              Schließen
            </Button>
            {!detailedEinsatz?.assigned_users?.includes(currentUserId) ? (
              <Button
                disabled={
                  max_assigned_count !== 0 &&
                  max_assigned_count <= assigned_count
                }
                onClick={async () => {
                  if (!detailedEinsatz?.id || !session?.user?.id) {
                    toast.error(
                      'Eintragen nicht erfolgreich: Benutzerdaten oder Einsatzdaten fehlen.'
                    );
                    return;
                  }
                  const assigning = !(
                    detailedEinsatz.assigned_users ?? []
                  ).includes(currentUserId ?? '');
                  const ok = await validateAssignment(assigning);
                  if (!ok) return;
                  onAssignToggleEvent(detailedEinsatz.id);
                }}
              >
                Eintragen
              </Button>
            ) : (
              <Button
                onClick={() => {
                  if (!detailedEinsatz?.id || !session?.user?.id) {
                    toast.error(
                      'Eintragen nicht erfolgreich: Benutzerdaten oder Einsatzdaten fehlen.'
                    );
                    return;
                  }
                  onAssignToggleEvent(detailedEinsatz.id);
                }}
              >
                Austragen
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface DefinitionListProps {
  children: ReactNode;
  className?: string;
}

function SectionDivider({
  text,
  isLeft = false,
}: {
  text?: string;
  isLeft?: boolean;
}): JSX.Element {
  return (
    <>
      <div
        className={cn(
          isLeft ? 'text-left' : 'text-right',
          'flex grow items-center pt-4 font-bold'
        )}
      >
        <div
          className={cn(isLeft && 'hidden', 'bg-border h-[0.0625em] grow pr-4')}
        ></div>
        {text && <div className="shrink-0">{text}</div>}
      </div>
      <div className="flex items-center pt-4">
        <div className="bg-border h-[0.0625em] w-full"></div>
      </div>
    </>
  );
}
{
}
export function DefinitionList({ children, className }: DefinitionListProps) {
  return (
    <motion.dl
      className={`grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 ${className ?? ''}`}
    >
      {children}
    </motion.dl>
  );
}

interface DefinitionItemProps {
  label: string;
  children: ReactNode;
}

export function DefinitionItem({ label, children }: DefinitionItemProps) {
  return (
    <div className="contents">
      <dt className="shrink-0 text-right font-semibold">{label}</dt>
      <dd className="text-foreground/75">{children}</dd>
    </div>
  );
}
