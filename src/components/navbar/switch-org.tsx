"use client";
import * as React from "react";
import type { OrganizationBasicVisualize } from "@/features/organization/types";
import { useSession } from "next-auth/react";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateActiveOrganizationAction } from "@/features/settings/settings-action";

type Props = {
  organizations: OrganizationBasicVisualize[];
  activeOrgId?: string;
};

export function NavSwitchOrgSelect({ organizations, activeOrgId }: Props) {
  const { data: session, update } = useSession();
  const [, startTransition] = React.useTransition();

  const handleOrgChange = (orgId: string) => {
    if (!session?.user) return;

    const newOrg = organizations.find((org) => org.id === orgId);
    if (!newOrg) {
      console.error("Organisation nicht gefunden:", orgId);
      return;
    }

    update({
      user: {
        ...session.user,
        activeOrganization: {
          id: newOrg.id,
          name: newOrg.name,
          logo_url: newOrg.logo_url,
        },
      },
    });

    startTransition(async () => {
      try {
        const result = await updateActiveOrganizationAction(orgId);
        if (!result.success) {
          console.error(
            "Fehler beim Wechseln der Organisation:",
            result.error || "Unbekannter Fehler"
          );
          // Rollback bei nem Fehler
          await update({
            user: {
              ...session.user,
              activeOrganization: session.user.activeOrganization,
            },
          });
          return;
        }
      } catch (error) {
        // Rollback bei nem Fehler
        console.error("Fehler beim Wechseln der Organisation:", error);
        await update({
          user: {
            ...session.user,
            activeOrganization: session.user.activeOrganization,
          },
        });
      }
    });
  };

  return (
    <Select value={activeOrgId} onValueChange={handleOrgChange}>
      <SelectTrigger className="w-[180px]">
        <SelectValue
          placeholder={
            organizations.find((org) => org.id === activeOrgId)?.name ||
            "Organisation wählen"
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          {organizations.map((org) => (
            <SelectItem key={org.id} value={org.id}>
              {org.name}
            </SelectItem>
          ))}
        </SelectGroup>
      </SelectContent>
    </Select>
  );
}

export default NavSwitchOrgSelect;
