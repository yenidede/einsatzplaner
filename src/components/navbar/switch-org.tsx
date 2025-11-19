"use client";
import * as React from "react";
import type { OrganizationBasicVisualize } from "@/features/organization/types";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useSession } from "next-auth/react";
import { setUserActiveOrganization } from "@/features/user/user-dal";
import { toast } from "sonner";

type Props = {
  organizations: OrganizationBasicVisualize[];
};

export function NavSwitchOrgSelect({ organizations }: Props) {
  const { update: updateSession, data: session } = useSession();
  const [activeOrgId, setActiveOrgId] = React.useState<string | undefined>(
    session?.user?.activeOrganization?.id || undefined
  );

  const handleSetOrg = async (orgId: string) => {
    const previousOrgId = activeOrgId; // Store the previous organization ID
    try {
      // UI-State
      setActiveOrgId(orgId);
      const newOrg = organizations.find((o) => o.id === orgId);
      if (!newOrg || !session) {
        console.error("Organization not found or session is null");
        return;
      }
      await Promise.all([
        // database
        setUserActiveOrganization(session?.user.id || "", orgId),
        // session updateSession
        updateSession({
          user: {
            ...session.user,
            activeOrganization: {
              id: newOrg.id,
              name: newOrg.name,
              logo_url: newOrg.logo_url,
            },
          },
        }),
      ]);
      toast.success(
        "Organization switched to: " +
          organizations.find((o) => o.id === orgId)?.name
      );
    } catch (error) {
      toast.error("Error switching organization: " + error);
      setActiveOrgId(previousOrgId); // Rollback to previous organization
    }
  };
  return (
    <Select value={activeOrgId} onValueChange={handleSetOrg}>
      <SelectTrigger className="w-[11.5rem]">
        <SelectValue
          placeholder={
            session?.user?.activeOrganization?.name || "Organisation wählen"
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
