"use client";

import { DataTable } from "@/components/data-table/components/data-table";
import { DataTableColumnHeader } from "@/components/data-table/components/data-table-column-header";
import { DataTableToolbar } from "@/components/data-table/components/data-table-toolbar";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDataTable } from "@/components/data-table/hooks/use-data-table";

import type { Column, ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal, Text } from "lucide-react";
import { parseAsJson, parseAsString, useQueryState } from "nuqs";
import * as React from "react";
import {
  EinsatzCustomizable,
  EinsatzCustomizableFilter,
} from "@/features/einsatz/types";
import { CalendarEvent, CalendarMode, CalendarView } from "./types";
import { cn } from "@/lib/utils";
import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { queryKeys } from "@/features/einsatz/queryKeys";
import { useQuery } from "@tanstack/react-query";
import { getEinsaetzeFiltered } from "@/features/einsatz/dal-einsatz";
import z from "zod";

type EC = EinsatzCustomizable;

const InitialData: EC[] = [
  {
    id: "1",
    title: "Einsatz Alpha",
    start: new Date(),
    end: new Date(),
    all_day: true,
    helpers_needed: 5,
    participant_count: 10,
    price_per_person: 100,
    total_price: 1000,
    status: {
      id: "bb169357-920b-4b49-9e3d-1cf489409370",
      helper_color: "lime",
      verwalter_color: "red",
      helper_text: "offen",
      verwalter_text: "offen",
    },
  },
  {
    id: "2",
    title: "Einsatz Beta",
    start: new Date(),
    end: new Date(),
    all_day: true,
    helpers_needed: 3,
    participant_count: 8,
    price_per_person: 120,
    total_price: 960,
    status: {
      id: "bb169357-920b-4b49-9e3d-1cf489409370",
      helper_color: "lime",
      verwalter_color: "red",
      helper_text: "offen",
      verwalter_text: "offen",
    },
  },
  {
    id: "3",

    title: "Einsatz Gamma",
    start: new Date(),
    end: new Date(),
    all_day: true,
    helpers_needed: 4,
    participant_count: 12,
    price_per_person: 90,
    total_price: 1080,
  },
  {
    id: "4",
    title: "Einsatz Delta",
    start: new Date(),
    end: new Date(),
    all_day: true,
    helpers_needed: 6,
    participant_count: 15,
    price_per_person: 110,
    total_price: 1650,
  },
];

type ListViewProps = {
  mode: CalendarMode;
  onEventSelect: (event: string) => void;
  onEventDelete: (eventId: string, eventTitle: string) => void;
};

// Define the filter number options enum
const filterNumberOptionsSchema = z.enum(["gte", "lte", "equals"]);

// Define the EinsatzStatus schema
const einsatzStatusSchema = z.object({
  id: z.string(),
  verwalter_color: z.string(),
  verwalter_text: z.string(),
  helper_color: z.string(),
  helper_text: z.string(),
});

// Define the EinsatzCategory schema (based on Prisma generated type)
const einsatzCategorySchema = z.object({
  id: z.string(),
  value: z.string(),
  abbreviation: z.string(),
  org_id: z.string(),
});

// Define the EinsatzField schema (based on Prisma generated type)
const einsatzFieldSchema = z.object({
  id: z.string(),
  value: z.string().nullable(),
  einsatz_id: z.string(),
  field_id: z.string(),
});

// Schema for filter parameters (matches EinsatzCustomizableFilter)
export const filterSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    template_name: z.string().optional(),

    created_at: z
      .object({
        date: z.date(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    updated_at: z
      .object({
        date: z.date().nullable(),
        options: filterNumberOptionsSchema,
      })
      .optional(),

    start: z
      .object({
        date: z.date(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    end: z
      .object({
        date: z.date(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    all_day: z.boolean().optional(),

    helpers_needed: z
      .object({
        value: z.number(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    still_needed_helpers: z
      .object({
        value: z.number(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    assigned_helpers_count: z
      .object({
        value: z.number(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    assigned_users_name: z
      .object({
        value: z.array(z.string()),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    created_by_name: z
      .object({
        value: z.string(),
        options: filterNumberOptionsSchema,
      })
      .optional(),

    participant_count: z
      .object({
        value: z.number().nullable(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    price_per_person: z
      .object({
        value: z.number().nullable(),
        options: filterNumberOptionsSchema,
      })
      .optional(),
    total_price: z
      .object({
        value: z.number().nullable(),
        options: filterNumberOptionsSchema,
      })
      .optional(),

    status: einsatzStatusSchema.optional(),
    organization_name: z.string().optional(),

    categories: z.array(einsatzCategorySchema).optional(),
    einsatz_fields: z.array(einsatzFieldSchema).optional(),
  })
  .partial(); // Make all fields optional to enable partial filtering

export function ListView({
  mode,
  onEventSelect,
  onEventDelete,
}: ListViewProps) {
  const [filters, setFilters] = useQueryState<EinsatzCustomizableFilter>(
    "filters",
    parseAsJson(filterSchema.parse).withDefault({
      start: { date: new Date(), options: "gte" },
    } as EinsatzCustomizableFilter)
  );

  const [statusOptions, setStatusOptions] = React.useState<
    { label: string; value: string }[]
  >([]);

  const limit = 10;
  const offset = 0;
  const { data } = useQuery({
    queryKey: queryKeys.einsaetzeFiltered(filters),
    queryFn: () => getEinsaetzeFiltered(filters, { limit, offset }),
  });

  React.useEffect(() => {
    const fetchData = async () => {
      const data = await GetStatuses();
      const statusOptionsWithDuplicates = data.map((status) => {
        const label =
          mode === "helper" ? status.helper_text : status.verwalter_text;
        return {
          label,
          value: label, // Multiple entries might have same label (viewMode specific)
        };
      });

      // Remove duplicates based on label
      const uniqueOptions = statusOptionsWithDuplicates.filter(
        (option, index, self) =>
          index === self.findIndex((t) => t.label === option.label)
      );

      setStatusOptions(uniqueOptions);
    };
    fetchData();
  }, [mode]);

  const columns = React.useMemo<ColumnDef<EC>[]>(() => {
    return [
      {
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
            aria-label="Select all"
            className="size-3.5 data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:border-primary"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Select row"
          />
        ),
        size: 32,
        enableSorting: false,
        enableHiding: false,
      },
      {
        id: "title",
        accessorKey: "title",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Title" />
        ),
        cell: ({ cell }) => <div>{cell.getValue<EC["title"]>()}</div>,
        meta: {
          label: "Title",
          placeholder: "Search titles...",
          variant: "text" as "text",
          icon: Text,
        },
        enableColumnFilter: true,
      },
      {
        id: "status",
        accessorKey: "status",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Status" />
        ),
        cell: ({ cell }) => {
          const status = cell.getValue<EC["status"]>();

          let badgeColor = "";
          if (mode === "helper") {
            switch (status?.helper_color) {
              case "red":
                badgeColor =
                  "bg-red-400 text-bg-red-900 dark:bg-red-800 dark:text-red-200";
                break;
              case "lime":
                badgeColor =
                  "bg-lime-400 text-lime-900 dark:bg-lime-800 dark:text-lime-200";
                break;
              default:
                badgeColor =
                  "bg-slate-400 text-bg-slate-900 dark:bg-slate-800 dark:text-slate-200";
            }
          } else {
            switch (status?.verwalter_color) {
              case "red":
                badgeColor =
                  "bg-red-400 text-bg-red-900 dark:bg-red-800 dark:text-red-200";
                break;
              case "orange":
                badgeColor =
                  "bg-orange-400 text-orange-900 dark:bg-orange-800 dark:text-orange-200";
                break;
              case "green":
                badgeColor =
                  "bg-green-400 text-green-900 dark:bg-green-800 dark:text-green-200";
                break;
              default:
                badgeColor =
                  "bg-slate-400 text-bg-slate-900 dark:bg-slate-800 dark:text-slate-200";
            }
          }

          return (
            <Badge variant="default" className={cn("capitalize", badgeColor)}>
              {mode === "verwaltung"
                ? status?.verwalter_text
                : status?.helper_text}
            </Badge>
          );
        },
        meta: {
          label: "Status",
          variant: "multiSelect",
          options: statusOptions,
        },
        enableColumnFilter: true,
      },
      // {
      //   id: "budget",
      //   accessorKey: "budget",
      //   header: ({ column }: { column: Column<EC, unknown> }) => (
      //     <DataTableColumnHeader column={column} title="Budget" />
      //   ),
      //   cell: ({ cell }) => {
      //     const budget = cell.getValue<EC["budget"]>();

      //     return (
      //       <div className="flex items-center gap-1">
      //         <DollarSign className="size-4" />
      //         {budget.toLocaleString()}
      //       </div>
      //     );
      //   },
      // },
      {
        id: "actions",
        cell: function Cell({ cell }) {
          return (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreHorizontal className="h-4 w-4" />
                  <span className="sr-only">Open menu</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onClick={() => onEventSelect(cell.getValue<EC["id"]>())}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() =>
                    onEventDelete(
                      cell.getValue<EC["id"]>(),
                      cell.getValue<EC["title"]>() || "{Titel unbekannt}"
                    )
                  }
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
      },
    ];
  }, [statusOptions, mode]); // Add the dependencies back!

  const { table } = useDataTable({
    data: (data?.data ?? InitialData) as EinsatzCustomizable[],
    columns,
    pageCount: 1,
    manualFiltering: true,
    initialState: {
      sorting: [{ id: "title", desc: true }],
      columnPinning: { right: ["actions"] },
      // Set initial column filters from URL state
      columnFilters: [
        ...(filters?.title ? [{ id: "title", value: filters.title }] : []),
        ...(filters?.status
          ? [
              {
                id: "status",
                value: [
                  filters.status.helper_text || filters.status.verwalter_text,
                ],
              },
            ]
          : []),
      ],
    },
    getRowId: (row) => row.id,
    // Handle filter changes and sync with URL state
    onColumnFiltersChange: (updater) => {
      const currentFilters = table.getState().columnFilters;
      const newFilters =
        typeof updater === "function" ? updater(currentFilters) : updater;

      // Update URL state based on column filters
      const titleFilter = newFilters.find((f) => f.id === "title");
      const statusFilter = newFilters.find((f) => f.id === "status");

      const newUrlFilters = { ...(filters || {}) };

      if (titleFilter && typeof titleFilter.value === "string") {
        newUrlFilters.title = titleFilter.value;
      } else {
        delete newUrlFilters.title;
      }

      if (
        statusFilter &&
        Array.isArray(statusFilter.value) &&
        statusFilter.value.length > 0
      ) {
        // Find the status object by ID
        const statusValue = statusFilter.value as string[];
        const statusOption = statusOptions.find(
          (opt) => opt.value === statusValue[0]
        );
        if (statusOption) {
          newUrlFilters.status = {
            id: statusOption.value,
            helper_text: statusOption.label,
            verwalter_text: statusOption.label,
            helper_color: "",
            verwalter_color: "",
          } as any; // This should match your EinsatzStatus type
        }
      } else {
        delete newUrlFilters.status;
      }

      setFilters(newUrlFilters);
    },
  });

  //Force table to re-render when statusOptions change
  React.useEffect(() => {
    if (statusOptions.length > 0) {
      //console.log("StatusOptions loaded, table should update");
    }
  }, [statusOptions]);

  // Don't render the table until statusOptions are loaded
  if (statusOptions.length === 0) {
    return (
      <div className="data-table-container px-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">Loading status options...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container px-4">
      <DataTable
        table={table}
        key={`datatable-${statusOptions.length}`} // Force re-render when options change
      >
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}
