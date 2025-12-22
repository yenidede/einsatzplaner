"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { FileDown } from "lucide-react";

import { getBadgeColorClassByStatus, handlePdfGenerate } from "./utils";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import { useQuery } from "@tanstack/react-query";
import { queryKeys as OrgaQueryKeys } from "@/features/organization/queryKeys";
import { queryKeys as TemplateQueryKeys } from "@/features/einsatztemplate/queryKeys";
import { queryKeys as UserQueryKeys } from "@/features/user/queryKeys";
import { queryKeys as StatusQueryKeys } from "@/features/einsatz_status/queryKeys";
import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getAllTemplatesWithIconByOrgId } from "@/features/template/template-dal";
import { getAllUsersWithRolesByOrgId } from "@/features/user/user-dal";
import { useAlertDialog } from "@/contexts/AlertDialogContext";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import TooltipCustom from "../tooltip-custom";

import { usePdfGenerator } from "@/features/pdf/hooks/usePdfGenerator";
import { useSession } from "next-auth/react";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { toast } from "sonner";

import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { cn } from "@/lib/utils";

import { createChangeLogAuto } from "@/features/activity_log/activity_log-dal";

import {
  detectChangeTypes,
  getAffectedUserId,
} from "@/features/activity_log/utils";

interface EventDialogProps {
  einsatz: string | null;
  isOpen: boolean;
  onClose: () => void;
  onAssignToggleEvent: (einsatzId: string) => void;
}

export function EventDialogHelfer({
  einsatz,
  isOpen,
  onClose,
  onAssignToggleEvent,
}: EventDialogProps) {
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
      toast.error("Failed to fetch einsatz details: " + res.statusText);
    },
    enabled: typeof einsatz === "string" && isOpen,
  });

  const categoriesQuery = useQuery({
    queryKey: einsatzQueryKeys.categories(activeOrgId ?? ""),
    queryFn: () => getCategoriesByOrgIds(activeOrgId ? [activeOrgId] : []),
    enabled: !!activeOrgId,
  });

  const usersQuery = useQuery({
    queryKey: UserQueryKeys.users(activeOrgId ?? ""),
    queryFn: () => {
      return getAllUsersWithRolesByOrgId(activeOrgId ?? "");
    },
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

  const einsatz_singular =
    organizations?.find((org) => org.id === activeOrgId)
      ?.einsatz_name_singular ?? "Einsatz";

  const helper_plural =
    organizations?.find((org) => org.id === activeOrgId)?.helper_name_plural ??
    "Helfer:innen";

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

  // normally should open the create dialog, in helper just return
  if (isOpen && !einsatz) return;

  const assigned_count = detailedEinsatz?.assigned_users?.length ?? 0;
  const max_assigned_count = Number(detailedEinsatz?.helpers_needed ?? 0);
  const status = detailedEinsatz?.assigned_users?.includes(currentUserId)
    ? "eigene"
    : statuses?.find((s) => s.id === detailedEinsatz?.status_id);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-220 flex flex-col max-h-[90vh]">
        <DialogHeader className="shrink-0 sticky top-0 bg-background z-10 pb-4 border-b">
          <DialogTitle>
            <div className="flex items-center">
              {isLoading
                ? "Laden..."
                : `Für '${
                    detailedEinsatz?.title ?? ""
                  }' eintragen (${assigned_count}/${max_assigned_count})`}
              {status && (
                <TooltipCustom
                  text={`${
                    status === "eigene" ? "eigene" : status.helper_text
                  }`}
                >
                  <div
                    className={cn(
                      getBadgeColorClassByStatus(status, "helper"),
                      "h-4 w-4 inline-block ml-2 rounded-full"
                    )}
                  ></div>
                </TooltipCustom>
              )}
            </div>
          </DialogTitle>
          <div>
            {detailedEinsatz ? (
              <>
                {detailedEinsatz.start.toLocaleDateString("de-DE", {
                  weekday: "short",
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}{" "}
                {detailedEinsatz.all_day ? (
                  "Ganztägig"
                ) : (
                  <>
                    (
                    {detailedEinsatz.start.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    -
                    {detailedEinsatz.end.toLocaleTimeString("de-DE", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                    )
                  </>
                )}
              </>
            ) : null}
          </div>
          <DialogDescription className="sr-only">
            Für {detailedEinsatz?.title ?? ""} eintragen Dialog Modal
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto">
          <DefinitionList>
            <DefinitionItem label="Kategorie">
              {detailedEinsatz?.categories.length ? (
                <ul className="list-disc list-inside space-y-1">
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
                "Keine Kategorie zugeordnet"
              )}
            </DefinitionItem>

            {detailedEinsatz?.total_price != null &&
              detailedEinsatz?.participant_count != null && (
                <DefinitionItem label="Teilnehmer/Preis">
                  {`${detailedEinsatz?.participant_count ?? "?"} Personen; €${
                    detailedEinsatz?.price_per_person ?? "?"
                  } p.P. = €${detailedEinsatz?.total_price ?? "?"}`}
                </DefinitionItem>
              )}

            <DefinitionItem label={helper_plural}>
              <ul className="list-disc list-inside space-y-1">
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
          </DefinitionList>
        </div>
        <DialogFooter className="flex-row sm:justify-between shrink-0 sticky bottom-0 bg-background z-10 pt-4 border-t">
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
                      "Name konnte nicht geladen werden!",
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
                onClick={() => {
                  if (!detailedEinsatz?.id || !session?.user?.id) {
                    toast.error(
                      "Eintragen nicht erfolgreich: Benutzerdaten oder Einsatzdaten fehlen."
                    );
                    return;
                  }
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
                      "Eintragen nicht erfolgreich: Benutzerdaten oder Einsatzdaten fehlen."
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

export function DefinitionList({ children, className }: DefinitionListProps) {
  return (
    <dl
      className={`grid grid-cols-[auto_1fr] gap-x-6 gap-y-4 ${className ?? ""}`}
    >
      {children}
    </dl>
  );
}

interface DefinitionItemProps {
  label: string;
  children: ReactNode;
}

export function DefinitionItem({ label, children }: DefinitionItemProps) {
  return (
    <div className="contents">
      <dt className="font-semibold shrink-0 text-right">{label}</dt>
      <dd className="text-foreground/75">{children}</dd>
    </div>
  );
}
