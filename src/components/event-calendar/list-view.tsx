"use client";

import React, { useEffect, useState } from "react";

import { DataTable } from "@/components/data-table/components/data-table";
import { DataTableAdvancedToolbar } from "@/components/data-table/components/data-table-advanced-toolbar";
import { DataTableSortList } from "@/components/data-table/components/data-table-sort-list";
import { useDataTable } from "@/components/data-table/hooks/use-data-table";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { getCategoriesByOrgIds } from "@/features/category/cat-dal";
import { getEinsaetzeForTableView } from "@/features/einsatz/dal-einsatz";
import type { ETV } from "@/features/einsatz/types";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { queryKeys as statusQueryKeys } from "@/features/einsatz_status/queryKeys";
import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { queryKeys as templatesQueryKeys } from "@/features/einsatztemplate/queryKeys";
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
import { Button } from "../ui/button";
import { MoreHorizontal } from "lucide-react";
import { useSession } from "next-auth/react";

type ListViewProps = {
  onEventEdit: (eventId: string) => void;
  onEventCreate: (startTime: Date) => void;
  onEventDelete: (eventId: string, title: string) => void;
  onMultiEventDelete: (eventIds: string[]) => void;
  mode: CalendarMode;
};

export function ListView({
  onEventEdit,
  onEventCreate,
  onEventDelete,
  onMultiEventDelete,
  mode,
}: ListViewProps) {
  const [pageCount, setPageCount] = useState(0);
  const [isTableReady, setIsTableReady] = useState(false);

  const { data: userSession } = useSession();
  const userOrgIds = userSession?.user?.orgIds ?? [];

  const { data, isLoading } = useQuery<ETV[]>({
    queryKey: [...einsatzQueryKeys.einsaetzeTableView(userOrgIds)],
    queryFn: () => getEinsaetzeForTableView(userOrgIds),
    placeholderData: (previousData) => previousData ?? [],
    enabled: userOrgIds.length > 0,
  });

  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: statusQueryKeys.statuses(),
    queryFn: GetStatuses,
  });

  // const { data: organizationsData, isLoading: isOrganizationsLoading } =
  //   useQuery({
  //     queryKey: organizationQueryKeys.organizations(userOrgIds),
  //     queryFn: () => getOrganizationsByIds(userOrgIds),
  //     enabled: userOrgIds.length > 0,
  //   });

  const { data: templatesData, isLoading: areTemplatesLoading } = useQuery({
    queryKey: templatesQueryKeys.templates(userOrgIds),
    queryFn: () => getAllTemplatesByOrgIds(userOrgIds),
    enabled: userOrgIds.length > 0,
  });

  const { data: usersData, isLoading: isUsersLoading } = useQuery({
    queryKey: usersQueryKeys.users(userOrgIds),
    queryFn: () => getAllUsersWithRolesByOrgIds(userOrgIds),
    enabled: userOrgIds.length > 0,
  });

  const { data: categoriesData, isLoading: isCategoriesLoading } = useQuery({
    queryKey: ["categories", userOrgIds],
    queryFn: () => getCategoriesByOrgIds(userOrgIds),
    enabled: userOrgIds.length > 0,
  });

  // Ensure data is defined before accessing its elements

  const isSomeQueryLoading =
    isLoading ||
    isStatusLoading ||
    areTemplatesLoading ||
    isUsersLoading ||
    // isOrganizationsLoading ||
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
      columnHelper.accessor(
        (row) =>
          `${row.einsatz_categories
            .map((cat) => cat.abbreviation)
            .join(", ")}`.trim(),
        {
          id: "categories",
          header: "Kategorien",
          cell: (props) => props.getValue(),
          enableColumnFilter: false,
          filterFn: byOperatorUseMetaField,
          meta: {
            label: "Kategorien",
            variant: "multiSelect",
            filterField: "einsatz_categories.id",
            options:
              categoriesData
                ?.map((cat) => ({
                  label: `${cat.value} (${cat.abbreviation})`,
                  value: cat.id,
                }))
                // sort by display name
                .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
          },
        }
      ),
      columnHelper.accessor((row) => `${row.einsatz_helper.length}`, {
        id: "helper_count",
        header: "Anzahl Helfer",
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: "Anzahl Helfer",
          variant: "range",
        },
      }),
      columnHelper.accessor((row) => `${row.einsatz_template?.name}`.trim(), {
        id: "template",
        header: "Vorlage",
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: "Vorlage",
          variant: "multiSelect",
          filterField: "einsatz_template.id",
          options:
            templatesData
              ?.filter((t) => t.name)
              .map((template) => ({
                label: template.name?.trim() ?? "-",
                value: template.id,
              }))
              // sort by display name
              .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
        },
      }),
      columnHelper.display({
        id: "actions",
        cell: function Cell(props) {
          return (
            <div className="bg-background">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Open menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEventEdit(props.row.original.id)}
                  >
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    variant="destructive"
                    onClick={() =>
                      onEventDelete(
                        props.row.original.id,
                        props.row.original.title
                      )
                    }
                  >
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          );
        },
        enableColumnFilter: false,
      }),
    ],
    [
      columnHelper,
      statusData,
      categoriesData,
      templatesData,
      usersData,
      onEventEdit,
      onEventDelete,
      mode,
    ]
  );

  const { table } = useDataTable({
    data: data ?? [],
    columns: columns,
    rowCount: data?.length ?? 0,
    pageCount,
    initialState: {
      sorting: [
        {
          id: "start",
          desc: false,
        },
      ],
      columnPinning: {
        left: ["select", "title"],
        right: ["actions"],
      },
    },
  });

  const rowModelRows = table.getRowModel().rows;
  useEffect(() => {
    // run after table rows are computed
    setIsTableReady(true);
  }, [rowModelRows]);

  if (!userOrgIds || userOrgIds.length === 0) {
    return (
      <div className="flex flex-col gap-4 justify-start items-baseline px-4 py-6">
        <div>
          <h2 className="font-bold">Keiner Organisation beigetreten.</h2>
          <p>
            Bitten Sie Ihre Organisation um eine Einladung oder um eine Änderung
            der Zugriffsrechte.
          </p>
        </div>
      </div>
    );
  }

  if (!isTableReady) {
    return (
      <div className="flex flex-col gap-4 justify-start items-baseline px-4 py-6">
        <div>
          <h2 className="font-bold">
            Es wurden noch keine Datensätze angelegt.{" "}
          </h2>
          <p>
            Falls Sie glauben, dass ein Fehler vorliegt, wenden Sie sich bitte
            an Ihre Administration.
          </p>
        </div>
        <Button
          variant="default"
          onClick={() => {
            const now = new Date();
            // round to 15 minutes
            const roundedDate = new Date(
              Math.ceil(now.getTime() / (15 * 60 * 1000)) * (15 * 60 * 1000)
            );
            onEventCreate(roundedDate);
          }}
        >
          Datensatz anlegen
        </Button>
      </div>
    );
  }

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
