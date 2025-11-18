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

type Props = {
  organizations: OrganizationBasicVisualize[];
  activeOrgId?: string;
};

export function NavSwitchOrgSelect({ organizations, activeOrgId }: Props) {
  return (
    <Select defaultValue={activeOrgId}>
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
