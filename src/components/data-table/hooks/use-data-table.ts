"use client";

import {
  FilterFn,
  getCoreRowModel,
  getFacetedMinMaxValues,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState
} from "@tanstack/react-table";
import {
  parseAsInteger, type UseQueryStateOptions,
  useQueryState
} from "nuqs";
import * as React from "react";

import { ColumnFilterSchema, getColumnFiltersParser, getSortingStateParser } from "@/components/data-table/lib/parsers";
import type { ExtendedColumnSort } from "@/components/data-table/types/data-table";
import { byOperator, byOperatorUseMetaField } from "@/components/data-table/lib/filter-fns";
import { FILTERS_KEY } from "../components/data-table-filter-menu";

const PAGE_KEY = "page";
const PER_PAGE_KEY = "perPage";
const SORT_KEY = "sort";
const ARRAY_SEPARATOR = ",";
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "state"
    | "rowCount"
    | "getCoreRowModel"
    | "manualFiltering"
    | "manualPagination"
    | "manualSorting"
  >,
  Required<Pick<TableOptions<TData>, "rowCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  history?: "push" | "replace";
  debounceMs?: number;
  throttleMs?: number;
  clearOnDefault?: boolean;
  enableAdvancedFilter?: boolean;
  scroll?: boolean;
  shallow?: boolean;
  startTransition?: React.TransitionStartFunction;
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    initialState,
    history = "replace",
    debounceMs = DEBOUNCE_MS,
    throttleMs = THROTTLE_MS,
    clearOnDefault = false,
    enableAdvancedFilter = true,
    scroll = false,
    shallow = true,
    startTransition,
    ...tableProps
  } = props;

  const queryStateOptions = React.useMemo<
    Omit<UseQueryStateOptions<string>, "parse">
  >(
    () => ({
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    }),
    [
      history,
      scroll,
      shallow,
      throttleMs,
      debounceMs,
      clearOnDefault,
      startTransition,
    ],
  );

  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});

  const [page, setPage] = useQueryState(
    PAGE_KEY,
    parseAsInteger.withOptions(queryStateOptions).withDefault(1),
  );

  const [perPage, setPerPage] = useQueryState(
    PER_PAGE_KEY,
    parseAsInteger
      .withOptions(queryStateOptions)
      .withDefault(initialState?.pagination?.pageSize ?? 10),
  );

  const pagination: PaginationState = React.useMemo(() => {
    return {
      pageIndex: page - 1, // one-based index -> zero-based index
      pageSize: perPage,
    };
  }, [page, perPage]);

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      if (typeof updaterOrValue === "function") {
        const newPagination = updaterOrValue(pagination);
        void setPerPage(newPagination.pageSize);
        // bug: something always sets pageIndex to 0. First page is now aliased instead of 0
        if (newPagination.pageIndex === 0) return;
        const setToPageIndex = Math.round(newPagination.pageIndex);
        void setPage(setToPageIndex + 1);
      } else {
        void setPage(updaterOrValue.pageIndex + 1);
        void setPerPage(updaterOrValue.pageSize);
      }
    },
    [pagination, setPage, setPerPage],
  );

  const columnIds = React.useMemo(() => {
    return new Set(
      columns.map((column) => column.id).filter(Boolean) as string[],
    );
  }, [columns]);

  const [sorting, setSorting] = useQueryState(
    SORT_KEY,
    getSortingStateParser<TData>(columnIds)
      .withOptions(queryStateOptions)
      .withDefault(initialState?.sorting ?? []),
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      if (typeof updaterOrValue === "function") {
        const newSorting = updaterOrValue(sorting);
        setSorting(newSorting as ExtendedColumnSort<TData>[]);
      } else {
        setSorting(updaterOrValue as ExtendedColumnSort<TData>[]);
      }
    },
    [sorting, setSorting],
  );

  const filterableColumns = React.useMemo(() => {
    // Treat columns as filterable unless they explicitly disable filtering
    return columns.filter((column) => column.enableColumnFilter !== false);
  }, [columns, enableAdvancedFilter]);

  // Read the URL from FILTERS_KEY and parse using getColumnFiltersParser
  // last instance before passing it to the table. Should be in format ColumnFilterSchema[] {"id" + Clause}
  const [columnFilters, setColumnFilters] = useQueryState<ColumnFilterSchema[]>(
    FILTERS_KEY,
    getColumnFiltersParser<TData>(filterableColumns.map((col) => col.id ?? ""))
      .withDefault([])
      .withOptions(queryStateOptions)
  );

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: any) => {
      if (typeof updaterOrValue === "function") {
        setColumnFilters((prev) => updaterOrValue(prev));
      } else {
        setColumnFilters(updaterOrValue);
      }
    },
    [setColumnFilters]
  );

  // Reset page to 1 when perPage changes
  React.useEffect(() => {
    setPage(1);
  }, [perPage, columnFilters]);

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getFacetedMinMaxValues: getFacetedMinMaxValues(),
    // Register custom filter functions
    filterFns: {
      byOperator: byOperator,
      byOperatorUseId: byOperatorUseMetaField,
    },
    defaultColumn: {
      enableColumnFilter: true,
      // Cast to satisfy generic mismatch when TData differs
      filterFn: byOperator as FilterFn<any>,
    },
    manualPagination: false,
    manualSorting: false,
    manualFiltering: false,
  });



  return { table, shallow, debounceMs, throttleMs };
}

