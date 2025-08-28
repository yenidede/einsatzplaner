"use client";

import React, { useMemo, useCallback, useState } from "react";

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
import { getBadgeColorClassByStatus, getStatusByMode } from "./utils";
import { Badge } from "../ui/badge";
import { cn } from "@/lib/utils";
import { DataTableFilterMenu } from "../data-table/components/data-table-filter-menu";
import {
  byOperator,
  byOperatorUseMetaField,
} from "../data-table/lib/filter-fns";
import { formatDate } from "../data-table/lib/format";

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
  const [pageCount, setPageCount] = useState(0);

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
    queryFn: () => getEinsaetzeForTableView(currentOrgs[0]),
    placeholderData: (previousData) => previousData ?? [],
    notifyOnChangeProps: "all",
  });

  // Ensure data is defined before accessing its elements

  const isSomeQueryLoading =
    isLoading ||
    isStatusLoading ||
    areTemplatesLoading ||
    isUsersLoading ||
    isOrganizationsLoading ||
    isCategoriesLoading;
  const columnHelper = createColumnHelper<ETV>();

  // Note: Don't constrain ColumnDef's value generic to unknown; let each accessor infer (string, boolean, etc.).
  const columns = React.useMemo<ColumnDef<ETV, any>[]>(
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
        enableColumnFilter: false,
      }),
      columnHelper.accessor((row) => row.title, {
        id: "title",
        header: "Titel",
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: "Titel",
          variant: "text",
          placeholder: "Einsatz suchen...",
        },
      }),
      columnHelper.accessor(
        (row) => getStatusByMode(row.einsatz_status, mode)?.text ?? "-",
        {
          id: "status",
          header: "Status",
          cell: (row) => (
            <Badge
              variant="default"
              className={cn(
                "capitalize",
                getBadgeColorClassByStatus(row.getValue(), mode)
              )}
            >
              {getStatusByMode(row.getValue(), mode)?.text ?? "-"}
            </Badge>
          ),
          enableColumnFilter: true,
          filterFn: byOperator,
          meta: {
            label: "Status",
            variant: "multiSelect",
            options:
              statusData?.reduce((acc, status) => {
                const label = getStatusByMode(status, mode)?.text ?? "-";
                // labels shouldnt be duplicate, if not already exists add to list
                if (!acc.some((item) => item.label === label)) {
                  acc.push({
                    label,
                    value: label, // label cause for some modes there isnt a difference between different values
                  });
                }
                return acc;
              }, [] as { label: string; value: string }[]) ?? [],
          },
        }
      ),
      columnHelper.accessor((row) => row.start, {
        id: "start",
        header: "Start Datum",
        cell: (props) => {
          const value = props.getValue();
          return value instanceof Date
            ? formatDate(value, { hour: "2-digit", minute: "2-digit" })
            : value ?? "-";
        },
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: "Start Datum",
          variant: "dateRange",
          filterField: "start",
        },
      }),
      columnHelper.accessor(
        (row) =>
          `${row.user?.firstname ?? ""} ${row.user?.lastname ?? ""}`.trim(),
        {
          id: "created_by",
          header: "Erstellt von",
          cell: (props) => props.getValue(),
          enableColumnFilter: true,
          filterFn: byOperatorUseMetaField,
          meta: {
            label: "Erstellt von",
            variant: "multiSelect",
            filterField: "user.id",
            options:
              usersData
                ?.map((user) => ({
                  label: `${user.firstname} ${user.lastname}`.trim(),
                  value: user.id,
                }))
                // sort by display name
                .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
          },
        }
      ),
    ],
    [columnHelper, statusData]
  );

  const { table } = useDataTable({
    data: data ?? [],
    columns: columns,
    rowCount: data?.length ?? 0,
    pageCount,
  });

  return (
    <DataTable table={table} isLoading={isSomeQueryLoading}>
      <DataTableAdvancedToolbar table={table}>
        {/* "key" changes to make sure ui updates when everything is loaded */}
        <DataTableFilterMenu
          setPageCount={setPageCount}
          key={String(!isSomeQueryLoading)}
          table={table}
          isLoading={isSomeQueryLoading}
        />
        <DataTableSortList table={table} />
      </DataTableAdvancedToolbar>
    </DataTable>
  );
}
