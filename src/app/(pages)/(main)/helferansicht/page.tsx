"use client";

import React from "react";
import Calendar from "@/components/event-calendar/calendar";
import { useSession } from "next-auth/react";
import { queryKeys as orgsQueryKeys } from "@/features/organization/queryKeys";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { useQuery } from "@tanstack/react-query";
import { getEinsaetzeData } from "@/components/event-calendar/utils";

export default function Helferansicht() {
  const { data: session } = useSession();
  const orgIds = session?.user.orgIds;

  const { data: organizations } = useQuery({
    queryKey: orgsQueryKeys.organizations(orgIds ?? []),
    queryFn: () => getOrganizationsByIds(orgIds ?? []),
    enabled: !!orgIds?.length,
  });

  const activeOrgId = session?.user?.activeOrganization?.id;
  const activeOrg =
    organizations?.find((org) => org.id === activeOrgId) ?? null;

  const { data: events } = useQuery({
    queryKey: einsatzQueryKeys.einsaetze(activeOrgId ? [activeOrgId] : []),
    queryFn: () => getEinsaetzeData(activeOrgId),
    // enabled: !!activeOrgId,
  });

  if (!events) {
    return <div>Lade Einsätze...</div>;
  }
  return (
    <>
      <h1>{activeOrg?.einsatz_name_plural ?? "Einsätze"}</h1>
      <p className="text-muted-foreground leading-7">
        {activeOrg?.helferansicht_description ??
          `Hier kannst du dich für ${
            activeOrg?.einsatz_name_plural ?? "Einsätze"
          } eintragen. Bitte wähle die Termine aus, an denen du verfügbar bist.`}
      </p>
      <div className="mt-6">
        <Calendar mode="helper" />
      </div>
    </>
  );
}
