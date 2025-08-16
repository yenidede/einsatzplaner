"use client";

import React, { useMemo, useCallback } from "react";

import { DataTable } from "@/components/data-table/components/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/components/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/components/data-table-filter-list";
import { DataTableSortList } from "@/components/data-table/components/data-table-sort-list";
import { useDataTable } from "@/components/data-table/hooks/use-data-table";

import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getEinsaetzeForTableView } from "@/features/einsatz/dal-einsatz";
import type { ETV } from "@/features/einsatz/types";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { queryKeys as statusQueryKeys } from "@/features/einsatz_status/queryKeys";
import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { queryKeys as templatesQueryKeys } from "@/features/einsatztemplate/queryKeys";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { queryKeys as organizationQueryKeys } from "@/features/organization/queryKeys";
import { getAllTemplatesByOrgIds } from "@/features/template/template-dal";
import { queryKeys as usersQueryKeys } from "@/features/user/queryKeys";
import { getAllUsersWithRolesByOrgIds } from "@/features/user/user-dal";
import { useQuery } from "@tanstack/react-query";
import { ColumnDef, createColumnHelper } from "@tanstack/react-table";
import { Checkbox } from "../ui/checkbox";
import { CalendarMode } from "./types";

type ListViewProps = {
  onEventEdit: (eventId: string) => void;
  onEventDelete: (eventId: string, title: string) => void;
  onMultiEventDelete: (eventIds: string[]) => void;
  mode: CalendarMode;
};

export function ListView({
  onEventEdit,
  onEventDelete,
  onMultiEventDelete,
  mode,
}: ListViewProps) {
  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: statusQueryKeys.statuses(),
    queryFn: GetStatuses,
  });

  const currentOrgs = ["0c39989e-07bc-4074-92bc-aa274e5f22d0"];

  const { data: templatesData, isLoading: areTemplatesLoading } = useQuery({
    queryKey: templatesQueryKeys.templates(currentOrgs),
    queryFn: () => getAllTemplatesByOrgIds(currentOrgs),
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: usersQueryKeys.users(currentOrgs),
    queryFn: () => getAllUsersWithRolesByOrgIds(currentOrgs),
  });

  const { data: organizationsData, isLoading: isOrganizationsLoading } =
    useQuery({
      queryKey: organizationQueryKeys.organizations(currentOrgs),
      queryFn: () => getOrganizationsByIds(currentOrgs),
    });

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", currentOrgs],
    queryFn: () => getCategoriesByOrgIds(currentOrgs),
  });

  // Data fetching with pagination, sorting, and filtering
  const { data, isLoading } = useQuery<ETV[]>({
    queryKey: [...einsatzQueryKeys.einsaetzeTableView(currentOrgs)],
    queryFn: () => getEinsaetzeForTableView(currentOrgs),
    placeholderData: (previousData) => previousData ?? [],
    notifyOnChangeProps: "all",
  });

  // Ensure data is defined before accessing its elements

  const columnHelper = createColumnHelper<ETV>();

  const columns = React.useMemo<ColumnDef<ETV>[]>(
    () => [
      columnHelper.display({
        id: "select",
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && "indeterminate")
            }
            onCheckedChange={(value) =>
              table.toggleAllPageRowsSelected(!!value)
            }
            aria-label="Alle auswählen"
          />
        ),
        cell: (props) => (
          <Checkbox
            checked={props.row.getIsSelected()}
            onCheckedChange={(value) => props.row.toggleSelected(!!value)}
            aria-label="Datenreihe auswählen"
          />
        ),
      }),
      columnHelper.accessor("title", {
        header: "Titel",
        cell: (props) => props.getValue(),
      }),
      columnHelper.accessor(
        (row) => `${row.user.firstname} ${row.user.lastname}`,
        {
          header: "Vollständiger Name",
        }
      ),
    ],
    [columnHelper]
  );

  const { table } = useDataTable({
    data: data ?? [],
    columns: columns,
    pageCount: 10,
  });

  // With advanced toolbar
  return (
    <DataTable table={table}>
      <DataTableAdvancedToolbar table={table}>
        <DataTableFilterList table={table} />
        <DataTableSortList table={table} />
      </DataTableAdvancedToolbar>
    </DataTable>
  );
}
