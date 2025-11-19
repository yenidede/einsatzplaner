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

type Props = {
  organizations: OrganizationBasicVisualize[];
};

export function NavSwitchOrgSelect({ organizations }: Props) {
  const { update, data: session } = useSession();

  const handleSetOrg = async (orgId: string) => {
    console.log("Organization now switching to:", orgId);

    await Promise.all([
      setUserActiveOrganization(session?.user.id || "", orgId),
      update({ activeOrgId: orgId }),
    ]);

    console.log("Organization switched to:", orgId);
    console.log("Updated session:", session);
  };
  return (
    <Select
      defaultValue={session?.user?.activeOrganization?.id}
      onValueChange={handleSetOrg}
      
    >
      <SelectTrigger className="w-[180px]">
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
