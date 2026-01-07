"use client";

import React, { useEffect } from "react";
import Calendar from "@/components/event-calendar/calendar";
import { useSession } from "next-auth/react";
import { queryKeys as orgsQueryKeys } from "@/features/organization/queryKeys";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { useQuery } from "@tanstack/react-query";
import { getEinsaetzeData } from "@/components/event-calendar/utils";
import { CalendarMode } from "./types";
import { useRouter } from "next/navigation";
import { useOrganizationTerminology } from "@/hooks/use-organization-terminology";

export default function CalendarPageWrapper({
  mode,
  description,
}: {
  mode: CalendarMode;
  description?: string;
}) {
  const { data: session, status: sessionStatus } = useSession();
  const router = useRouter();
  const orgIds = session?.user?.orgIds;

  const { data: organizations, isError: isOrgError } = useQuery({
    queryKey: orgsQueryKeys.organizations(orgIds ?? []),
    queryFn: () => getOrganizationsByIds(orgIds ?? []),
    enabled: !!orgIds?.length,
  });

  const activeOrgId = session?.user?.activeOrganization?.id;
  const activeOrg =
    organizations?.find((org) => org.id === activeOrgId) ?? null;

  const { einsatz_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  const { isError: isEventError } = useQuery({
    queryKey: einsatzQueryKeys.einsaetze(activeOrgId ? [activeOrgId] : []),
    queryFn: () => getEinsaetzeData(activeOrgId),
    enabled: !!activeOrgId,
  });

  const descriptionText = description
    ? description
    : mode === "verwaltung"
    ? activeOrg?.verwalteransicht_description ??
      `Hier können ${einsatz_plural} bearbeitet, erstellt und gelöscht werden..`
    : activeOrg?.helferansicht_description ??
      `Hier sehen Sie alle ${einsatz_plural}. Bitte tragen Sie sich für die Termine ein, an denen Sie verfügbar sind.`;

  if (isOrgError) {
    return <div>Fehler beim Laden der Organisationen</div>;
  }

  if (isEventError) {
    return <div>Fehler beim Laden der Einsätze. {}</div>;
  }

  // Redirect to sign-in if not authenticated (could happen if logout on different page)
  useEffect(() => {
    if (sessionStatus === "loading") {
      return;
    }

    if (!session) {
      router.push(
        `/signin?callbackUrl=${encodeURIComponent(window.location.href)}`
      );
    }
  }, [router, session, sessionStatus]);

  return (
    <>
      <h1>
        {einsatz_plural} {mode === "verwaltung" ? "verwalten" : "ansehen"}
      </h1>
      <p className="text-muted-foreground leading-4">{descriptionText}</p>
      <div className="mt-6">
        <Calendar mode={mode} />
      </div>
    </>
  );
}
