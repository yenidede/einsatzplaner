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

import type {
  Column,
  ColumnDef,
  PaginationState,
  SortingState,
  ColumnFiltersState,
} from "@tanstack/react-table";
import { MoreHorizontal, Text } from "lucide-react";
import {
  parseAsJson,
  parseAsString,
  useQueryState,
  parseAsInteger,
} from "nuqs";
import * as React from "react";
import {
  Einsatz,
  EinsatzCustomizable,
  EinsatzCustomizableFilter,
} from "@/features/einsatz/types";
import { CalendarEvent, CalendarMode, CalendarView } from "./types";
import { cn } from "@/lib/utils";
import { GetStatuses } from "@/features/einsatz_status/status-dal";
import { queryKeys as einsatzQueryKeys } from "@/features/einsatz/queryKeys";
import { queryKeys as statusQueryKeys } from "@/features/einsatz_status/queryKeys";
import { queryKeys as templatesQueryKeys } from "@/features/einsatztemplate/queryKeys";
import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { getEinsaetzeFiltered } from "@/features/einsatz/dal-einsatz";
import { getAllTemplatesByOrgIds } from "@/features/template/template-dal";
import z from "zod";
import { isEventPast, mapStatusIdsToLabels } from "./utils";
import { parseAsStringEnum } from "nuqs";

// Define sortable fields based on Einsatz keys
const SORTABLE_FIELDS = [
  "id",
  "title",
  "start",
  "end",
  "all_day",
  "helpers_needed",
  "participant_count",
  "price_per_person",
  "total_price",
  "created_at",
  "updated_at",
  "template_id",
  "created_by",
  "org_id",
  "status_id",
] as const satisfies readonly (keyof Einsatz)[];

type EC = EinsatzCustomizable;

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

// Reusable schemas for single value vs range
const singleDateFilter = z.object({
  date: z.coerce.date(),
  options: filterNumberOptionsSchema,
});
const rangeDateFilter = z
  .object({ from: z.coerce.date().optional(), to: z.coerce.date().optional() })
  .refine((o) => o.from || o.to, {
    message: "Mindestens ein Datum erforderlich",
  });

const singleNumberFilter = z.object({
  value: z.number(),
  options: filterNumberOptionsSchema,
});
const singleNullableNumberFilter = z.object({
  value: z.number().nullable(),
  options: filterNumberOptionsSchema,
});
const rangeNumberFilter = z
  .object({ from: z.number().optional(), to: z.number().optional() })
  .refine((o) => o.from !== undefined || o.to !== undefined, {
    message: "Mindestens eine Grenze erforderlich",
  });
const rangeNullableNumberFilter = z
  .object({
    from: z.number().nullable().optional(),
    to: z.number().nullable().optional(),
  })
  .refine((o) => o.from != null || o.to != null, {
    message: "Mindestens eine Grenze erforderlich",
  });

// Schema for filter parameters (matches EinsatzCustomizableFilter), now allowing ranges
export const filterSchema = z
  .object({
    id: z.string(),
    title: z.string().optional(),
    template_name: z.string().optional(),

    created_at: z.union([singleDateFilter, rangeDateFilter]).optional(),
    updated_at: z
      .union([
        singleDateFilter.extend({
          date: singleDateFilter.shape.date.nullable(),
        }),
        rangeDateFilter,
      ])
      .optional(),

    start: z.union([singleDateFilter, rangeDateFilter]).optional(),
    end: z.union([singleDateFilter, rangeDateFilter]).optional(),
    all_day: z.boolean().optional(),

    helpers_needed: z.union([singleNumberFilter, rangeNumberFilter]).optional(),
    still_needed_helpers: z
      .union([singleNumberFilter, rangeNumberFilter])
      .optional(),
    assigned_helpers_count: z
      .union([singleNumberFilter, rangeNumberFilter])
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
      .union([singleNullableNumberFilter, rangeNullableNumberFilter])
      .optional(),
    price_per_person: z
      .union([singleNullableNumberFilter, rangeNullableNumberFilter])
      .optional(),
    total_price: z
      .union([singleNullableNumberFilter, rangeNullableNumberFilter])
      .optional(),

    status_ids: z.array(z.uuid()).optional(),
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
  const currentUserId = "5ae139a7-476c-4d76-95cb-4dcb4e909da9";
  const currentOrgs = ["0c39989e-07bc-4074-92bc-aa274e5f22d0"];

  // Simple debounce hook (local to this component file)
  function useDebouncedValue<T>(value: T, delay: number) {
    const [debounced, setDebounced] = React.useState(value);
    React.useEffect(() => {
      const handle = setTimeout(() => setDebounced(value), delay);
      return () => clearTimeout(handle);
    }, [value, delay]);
    return debounced;
  }

  // URL state management for filters
  const [filters, setFilters] = useQueryState<EinsatzCustomizableFilter>(
    "filters",
    parseAsJson(filterSchema.parse).withDefault({} as EinsatzCustomizableFilter)
  );

  // URL state management for pagination
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage, setPerPage] = useQueryState(
    "perPage",
    parseAsInteger.withDefault(10)
  );

  // URL state management for sorting
  const [sortField, setSortField] = useQueryState(
    "sortField",
    parseAsStringEnum([...SORTABLE_FIELDS]).withDefault("start")
  );
  const [sortOrder, setSortOrder] = useQueryState(
    "sortOrder",
    parseAsStringEnum(["asc", "desc"] as const).withDefault("desc")
  );

  const [statusOptions, setStatusOptions] = React.useState<
    { label: string; value: string }[]
  >([]);

  // URL state for hidden columns (column visibility)
  const hiddenColsSchema = z.array(z.string());
  const [hiddenCols, setHiddenCols] = useQueryState(
    "hiddenCols",
    parseAsJson(hiddenColsSchema.parse).withDefault([] as string[])
  );

  // Debounced inputs for the data query (300ms)
  const DEBOUNCE_MS = 300;
  const debouncedFilters = useDebouncedValue(filters, DEBOUNCE_MS);
  const debouncedSortField = useDebouncedValue(sortField, DEBOUNCE_MS);
  const debouncedSortOrder = useDebouncedValue(sortOrder, DEBOUNCE_MS);
  const debouncedPage = useDebouncedValue(page, DEBOUNCE_MS);
  const debouncedPerPage = useDebouncedValue(perPage, DEBOUNCE_MS);

  const { data: statusData, isLoading: isStatusLoading } = useQuery({
    queryKey: statusQueryKeys.statuses(),
    queryFn: GetStatuses,
  });

  const { data: templatesData, isLoading: areTemplatesLoading } = useQuery({
    queryKey: templatesQueryKeys.templates(currentOrgs),
    queryFn: () => getAllTemplatesByOrgIds(currentOrgs),
  });

  // Data fetching with pagination, sorting, and filtering
  const { data, isLoading } = useQuery({
    queryKey: [
      ...einsatzQueryKeys.einsaetzeFiltered(
        debouncedFilters,
        { id: debouncedSortField, order: debouncedSortOrder },
        debouncedPage,
        debouncedPerPage
      ),
    ],
    queryFn: () =>
      getEinsaetzeFiltered(
        debouncedFilters,
        {
          sort_field: debouncedSortField,
          sort_order: debouncedSortOrder,
        },
        {
          limit: debouncedPerPage,
          offset: (debouncedPage - 1) * debouncedPerPage,
        }
      ),
    placeholderData: (previousData) => previousData,
    notifyOnChangeProps: "all",
  });

  React.useEffect(() => {
    const fetchData = async () => {
      const data = statusData;
      if (data === undefined) return;

      // Group status IDs by their label
      const labelToIds = new Map<string, string[]>();

      data.forEach((status) => {
        const label =
          mode === "helper" ? status.helper_text : status.verwalter_text;
        if (!labelToIds.has(label)) {
          labelToIds.set(label, []);
        }
        labelToIds.get(label)!.push(status.id);
      });

      // Create options with grouped IDs
      const uniqueOptions = Array.from(labelToIds.entries()).map(
        ([label, ids]) => ({
          label,
          value: ids.join(","), // Join multiple IDs with comma
        })
      );

      setStatusOptions(uniqueOptions);
    };
    fetchData();
  }, [mode, statusData]);

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
            aria-label="Alle auswählen"
            className="size-3.5 data-[state=checked]:bg-primary data-[state=checked]:text-white data-[state=checked]:border-primary"
          />
        ),
        cell: ({ row }) => (
          <Checkbox
            checked={row.getIsSelected()}
            onCheckedChange={(value) => row.toggleSelected(!!value)}
            aria-label="Datenreihe auswählen"
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
          <DataTableColumnHeader column={column} title="Titel" />
        ),
        cell: ({ cell }) => <div>{cell.getValue<EC["title"]>()}</div>,
        meta: {
          label: "Titel",
          placeholder: "Titel suchen...",
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
      {
        id: "start",
        accessorKey: "start",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Beginn" />
        ),
        cell: ({ cell }) => {
          const v = cell.getValue<Date | string | undefined>();
          if (!v) return "-";
          const d = new Date(v);
          return <div>{d.toLocaleString()}</div>;
        },
        meta: { label: "Beginn", variant: "dateRange" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "end",
        accessorKey: "end",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Ende" />
        ),
        cell: ({ cell }) => {
          const v = cell.getValue<Date | string | undefined>();
          if (!v) return "-";
          const d = new Date(v);
          return <div>{d.toLocaleString()}</div>;
        },
        meta: { label: "Ende", variant: "dateRange" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "template_name",
        accessorKey: "template_name",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Vorlage" />
        ),
        cell: ({ cell }) => <div>{cell.getValue<string>() || "-"}</div>,
        meta: {
          label: "Vorlage",
          variant: "multiSelect",
          options: templatesData?.map((t) => ({
            label: t.name ?? "(Ohne Namen)",
            value: t.id,
          })),
          placeholder: "Vorlage auswählen",
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "all_day",
        accessorKey: "all_day",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Ganztägig" />
        ),
        cell: ({ cell }) => {
          const v = cell.getValue<boolean | undefined>();
          return <span>{v ? "JA" : "NEIN"}</span>;
        },
        meta: {
          label: "Ganztägig",
          variant: "boolean",
        },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "helpers_needed",
        accessorKey: "helpers_needed",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Benötigte Helfer" />
        ),
        cell: ({ cell }) => cell.getValue<number | undefined>() ?? "-",
        meta: { label: "Benötigte Helfer", variant: "number" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "still_needed_helpers",
        accessorKey: "still_needed_helpers",
        header: () => <div>Noch benötigt</div>,
        cell: ({ cell }) => cell.getValue<number | undefined>() ?? "-",
        meta: { label: "Noch benötigt", variant: "number" },
        enableSorting: false,
        enableColumnFilter: true,
      },
      {
        id: "assigned_helpers_count",
        accessorKey: "assigned_helpers_count",
        header: () => <div>Zugewiesene Helfer</div>,
        cell: ({ cell }) => cell.getValue<number | undefined>() ?? "-",
        meta: { label: "Zugewiesene Helfer", variant: "number" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "assigned_users_name",
        accessorKey: "assigned_users_name",
        header: () => <div>Zugewiesene Benutzer</div>,
        cell: ({ cell }) => {
          const list = cell.getValue<string[] | undefined>() || [];
          return list.length ? (
            <div className="max-w-[200px] truncate" title={list.join(", ")}>
              {list.join(", ")}
            </div>
          ) : (
            "-"
          );
        },
        meta: { label: "Zugewiesene Benutzer", variant: "text" },
        enableSorting: false,
        enableColumnFilter: true,
      },
      {
        id: "created_by_name",
        accessorKey: "created_by_name",
        header: () => <div>Erstellt von</div>,
        cell: ({ cell }) => cell.getValue<string | undefined>() || "-",
        meta: { label: "Erstellt von", variant: "text" },
        enableSorting: false,
        enableColumnFilter: true,
      },
      {
        id: "participant_count",
        accessorKey: "participant_count",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Teilnehmer" />
        ),
        cell: ({ cell }) => cell.getValue<number | null | undefined>() ?? "-",
        meta: { label: "Teilnehmer", variant: "number" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "price_per_person",
        accessorKey: "price_per_person",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Preis/Person" />
        ),
        cell: ({ cell }) => {
          const v = cell.getValue<number | null | undefined>();
          return v != null ? v.toFixed(2) : "-";
        },
        meta: { label: "Preis/Person", variant: "number" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "total_price",
        accessorKey: "total_price",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Gesamtpreis" />
        ),
        cell: ({ cell }) => {
          const v = cell.getValue<number | null | undefined>();
          return v != null ? v.toFixed(2) : "-";
        },
        meta: { label: "Gesamtpreis", variant: "number" },
        enableSorting: true,
        enableColumnFilter: true,
      },
      {
        id: "organization_name",
        accessorKey: "organization_name",
        header: ({ column }: { column: Column<EC, unknown> }) => (
          <DataTableColumnHeader column={column} title="Organisation" />
        ),
        cell: ({ cell }) => cell.getValue<string | undefined>() || "-",
        meta: { label: "Organisation", variant: "text" },
        enableSorting: false,
        enableColumnFilter: true,
      },
      {
        id: "categories",
        accessorKey: "categories",
        header: () => <div>Kategorien</div>,
        cell: ({ cell }) => {
          const cats = cell.getValue<any[] | undefined>() || [];
          const labels = cats
            .map((c) => c.abbreviation || c.value)
            .filter(Boolean);
          return labels.length ? (
            <div className="max-w-[180px] truncate" title={labels.join(", ")}>
              {labels.join(", ")}
            </div>
          ) : (
            "-"
          );
        },
        meta: { label: "Kategorien", variant: "text" },
        enableSorting: false,
        enableColumnFilter: true,
      },
      {
        id: "einsatz_fields",
        accessorKey: "einsatz_fields",
        header: () => <div>Felder</div>,
        cell: ({ cell }) => {
          const fields = cell.getValue<any[] | undefined>() || [];
          if (!fields.length) return "-";
          const preview = fields
            .slice(0, 3)
            .map((f) => f.value)
            .filter(Boolean)
            .join(", ");
          const title = fields
            .map((f) => `${f.field_id}: ${f.value}`)
            .join("\n");
          return (
            <div className="max-w-[180px] truncate" title={title}>
              {preview}
              {fields.length > 3 ? "…" : ""}
            </div>
          );
        },
        meta: { label: "Felder", variant: "text" },
        enableSorting: false,
        enableColumnFilter: true,
      },
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
                  Bearbeiten
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
                  Löschen
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          );
        },
        size: 32,
      },
    ];
  }, [statusOptions, mode]); // Add the dependencies back!

  // Build initial column filter state from URL filters (JSON) for supported columns
  const initialColumnFilters: ColumnFiltersState = [];
  if (filters?.title)
    initialColumnFilters.push({ id: "title", value: filters.title });
  if (filters?.status_ids && filters.status_ids.length > 0) {
    // placeholder; real option values hydrated later
    initialColumnFilters.push({ id: "status", value: [] });
  }
  const numericLike = [
    "helpers_needed",
    "still_needed_helpers",
    "assigned_helpers_count",
    "participant_count",
    "price_per_person",
    "total_price",
  ] as const;
  numericLike.forEach((key) => {
    const k = key as keyof EinsatzCustomizableFilter;
    const val: any = (filters as any)?.[k];
    if (val && typeof val === "object" && "value" in val) {
      initialColumnFilters.push({ id: key, value: String(val.value) });
    }
  });
  if (filters?.all_day !== undefined) {
    initialColumnFilters.push({ id: "all_day", value: filters.all_day });
  }
  // Date fields: hydrate from either single or range shape
  (["start", "end"] as const).forEach((k) => {
    const f = (filters as any)[k];
    if (!f) return;
    if (f.date) {
      initialColumnFilters.push({
        id: k,
        value: [new Date(f.date).getTime(), undefined],
      });
    } else if (f.from || f.to) {
      initialColumnFilters.push({
        id: k,
        value: [
          f.from ? new Date(f.from).getTime() : undefined,
          f.to ? new Date(f.to).getTime() : undefined,
        ],
      });
    }
  });
  if (filters?.created_by_name)
    initialColumnFilters.push({
      id: "created_by_name",
      value: filters.created_by_name.value,
    });
  if (filters?.assigned_users_name)
    initialColumnFilters.push({
      id: "assigned_users_name",
      value: (filters.assigned_users_name.value || []).join(","),
    });
  if (filters?.organization_name)
    initialColumnFilters.push({
      id: "organization_name",
      value: filters.organization_name,
    });

  const { table } = useDataTable<EinsatzCustomizable>({
    data: (data?.data ?? []) as EinsatzCustomizable[],
    columns,
    pageCount: Math.ceil((data?.total ?? 0) / perPage),
    initialState: {
      pagination: { pageIndex: page - 1, pageSize: perPage },
      sorting: [
        {
          id: sortField as keyof EinsatzCustomizable,
          desc: sortOrder === "desc",
        },
      ],
      columnPinning: { left: ["select", "title"], right: ["actions"] },
      // Only include known column filter IDs here. Status hydration happens after options load.
      columnFilters: initialColumnFilters,
      columnVisibility: hiddenCols.reduce((acc, id) => {
        acc[id] = false;
        return acc;
      }, {} as Record<string, boolean>),
    },
    getRowId: (row: EinsatzCustomizable) => row.id,
    // Handle pagination changes
    onPaginationChange: (newPagination: PaginationState) => {
      setPage(newPagination.pageIndex + 1);
      setPerPage(newPagination.pageSize);
    },
    // Handle sorting changes
    onSortingChange: (newSorting: SortingState) => {
      if (newSorting.length > 0) {
        const newSortField = newSorting[0].id;
        // Validate that the sort field is one of our allowed fields
        if (SORTABLE_FIELDS.includes(newSortField as keyof Einsatz)) {
          setSortField(newSortField as keyof Einsatz);
          setSortOrder(newSorting[0].desc ? "desc" : "asc");
        }
      }
    },
    // Handle filter changes (serialize to JSON param)
    onColumnFiltersChange: (newFilters: ColumnFiltersState) => {
      const newUrlFilters: any = { ...(filters || {}) };

      // Clear managed keys
      [
        "title",
        "status_ids",
        "start",
        "end",
        "template_name",
        "all_day",
        "helpers_needed",
        "still_needed_helpers",
        "assigned_helpers_count",
        "assigned_users_name",
        "created_by_name",
        "participant_count",
        "price_per_person",
        "total_price",
        "organization_name",
      ].forEach((k) => {
        delete newUrlFilters[k];
      });

      for (const f of newFilters) {
        const { id, value } = f as any;
        if (value == null || value === "") continue;
        switch (id) {
          case "title":
            if (typeof value === "string") newUrlFilters.title = value.trim();
            break;
          case "status":
            if (Array.isArray(value) && value.length) {
              newUrlFilters.status_ids = value.flatMap((v: string) =>
                v.split(",")
              );
            }
            break;
          case "start":
          case "end": {
            if (Array.isArray(value)) {
              const [fromTs, toTs] = value as (number | undefined)[];
              if (fromTs || toTs) {
                // Store as range shape
                newUrlFilters[id] = {
                  ...(fromTs ? { from: new Date(fromTs).toISOString() } : {}),
                  ...(toTs ? { to: new Date(toTs).toISOString() } : {}),
                };
              }
            } else if (typeof value === "number") {
              newUrlFilters[id] = { from: new Date(value).toISOString() };
            }
            break;
          }
          case "all_day":
            if (typeof value === "boolean") newUrlFilters.all_day = value;
            break;
          case "helpers_needed":
          case "still_needed_helpers":
          case "assigned_helpers_count":
          case "participant_count":
          case "price_per_person":
          case "total_price": {
            const num = Number(value);
            if (!Number.isNaN(num))
              newUrlFilters[id] = { value: num, options: "equals" };
            break;
          }
          case "assigned_users_name":
            if (typeof value === "string") {
              const arr = value
                .split(",")
                .map((s) => s.trim())
                .filter(Boolean);
              if (arr.length)
                newUrlFilters.assigned_users_name = {
                  value: arr,
                  options: "equals",
                };
            }
            break;
          case "created_by_name":
            if (typeof value === "string" && value.trim())
              newUrlFilters.created_by_name = {
                value: value.trim(),
                options: "equals",
              };
            break;
          case "organization_name":
            if (typeof value === "string" && value.trim())
              newUrlFilters.organization_name = value.trim();
            break;
          default:
            break;
        }
      }
      setPage(1);
      setFilters(newUrlFilters);
    },
  });

  // Ref to prevent feedback loop when syncing hidden columns table -> URL -> table
  const hiddenColsSyncingRef = React.useRef(false);

  // Hydrate status column filter once we have statusOptions (grouped labels) and URL status_ids
  React.useEffect(() => {
    if (!filters?.status_ids || filters.status_ids.length === 0) return;
    if (statusOptions.length === 0) return;
    const statusCol = table.getColumn("status");
    if (!statusCol) return;
    const current = statusCol.getFilterValue();
    // Build list of option.value strings whose comma-separated IDs intersect with status_ids
    const optionValues = statusOptions
      .filter((opt) =>
        opt.value.split(",").some((id) => filters.status_ids!.includes(id))
      )
      .map((opt) => opt.value);
    // Avoid unnecessary state updates
    const asArray = Array.isArray(current) ? current : current ? [current] : [];
    const same =
      asArray.length === optionValues.length &&
      optionValues.every((v) => asArray.includes(v));
    if (!same) {
      statusCol.setFilterValue(optionValues);
    }
  }, [filters?.status_ids, statusOptions, table]);

  // Sync hidden columns from table state to URL
  const columnVisibility = table.getState().columnVisibility;
  React.useEffect(() => {
    const currentHidden = Object.entries(columnVisibility)
      .filter(([, visible]) => visible === false)
      .map(([id]) => id)
      .sort();
    const urlHidden = [...hiddenCols].sort();
    if (JSON.stringify(currentHidden) !== JSON.stringify(urlHidden)) {
      hiddenColsSyncingRef.current = true;
      setHiddenCols(currentHidden);
    }
  }, [columnVisibility, hiddenCols, setHiddenCols]);

  // Apply hiddenCols from URL to table (e.g., when user edits URL manually)
  React.useEffect(() => {
    // Skip if this update originated from table -> URL sync to avoid loop
    if (hiddenColsSyncingRef.current) {
      hiddenColsSyncingRef.current = false;
      return;
    }
    // Only hide columns listed in hiddenCols that are currently visible.
    // (We intentionally do NOT auto-show columns removed from hiddenCols to avoid loops
    //  and unexpected toggling; user actions in UI drive showing columns.)
    hiddenCols.forEach((id) => {
      const col = table.getColumn(id);
      if (col && col.getIsVisible()) {
        col.toggleVisibility(false);
      }
    });
  }, [hiddenCols, table]);

  // Don't render the table until statusOptions are loaded
  if (statusOptions.length === 0 || isLoading || isStatusLoading) {
    return (
      <div className="data-table-container px-4">
        <div className="flex items-center justify-center h-32">
          <div className="text-muted-foreground">
            {statusOptions.length === 0
              ? "Statusoptionen laden..."
              : "Daten werden geladen..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="data-table-container px-4">
      <DataTable
        table={table}
        key={`datatable-${statusOptions.length}`} // Force re-render when options change
        getRowIsPast={isEventPast}
      >
        <DataTableToolbar table={table} />
      </DataTable>
    </div>
  );
}
