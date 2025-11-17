import * as React from "react";
import type { OrganizationBasicVisualize } from "@/features/organization/types";

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

type Props = {
  organizations: OrganizationBasicVisualize[];
  activeOrgId?: string;
};

export function NavSwitchOrgSelect({ organizations, activeOrgId }: Props) {
  return (
    <Select>
      <SelectTrigger className="w-[180px]">
        <SelectValue
          placeholder={
            organizations.find((org) => org.id === activeOrgId)?.name ||
            "Aktive Organisation wählen"
          }
        />
      </SelectTrigger>
      <SelectContent>
        <SelectGroup>
          <SelectLabel>Aktive Organisation</SelectLabel>
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
