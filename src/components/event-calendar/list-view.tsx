"use client";

import { DataTable } from "@/components/data-table/components/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/components/data-table-advanced-toolbar";
import { DataTableFilterList } from "@/components/data-table/components/data-table-filter-list";
import { DataTableSortList } from "@/components/data-table/components/data-table-sort-list";
import { useDataTable } from "@/components/data-table/hooks/use-data-table";

import { useQuery } from "@tanstack/react-query";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { queryKeys as statusQueryKeys } from "@/features/einsatz_status/queryKeys";
import { queryKeys as templatesQueryKeys } from "@/features/einsatztemplate/queryKeys";
import { queryKeys as organizationQueryKeys } from "@/features/organization/queryKeys";
import { queryKeys as usersQueryKeys } from "@/features/user/queryKeys";
import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getEinsaetzeFiltered } from "@/features/einsatz/dal-einsatz";
import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { getOrganizationsByIds } from "@/features/organization/org-dal";
import { getAllTemplatesByOrgIds } from "@/features/template/template-dal";
import { getAllUsersWithRolesByOrgIds } from "@/features/user/user-dal";

export default function ListView() {
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
  const { data, isLoading } = useQuery({
    queryKey: [...einsatzQueryKeys.einsaetzeTableView()],
    queryFn: () =>
      getEinsaetzeFiltered(
        [],
        { sort_field: "start", sort_order: "asc" },
        {
          limit: 2000,
          offset: 0,
        },
        currentOrgs
      ),
    placeholderData: (previousData) => previousData,
    notifyOnChangeProps: "all",
  });

  const { table } = useDataTable({
    data: data ?? [],
    columns,
    pageCount,
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
