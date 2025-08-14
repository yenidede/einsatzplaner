"use client";

import {
  type ColumnFiltersState,
  getCoreRowModel,
  type PaginationState,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
  type TableState,
  type Updater,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import * as React from "react";

import type { ExtendedColumnSort } from "@/components/data-table/types/data-table";

interface UseDataTableProps<TData>
  extends Omit<
    TableOptions<TData>,
    | "state"
    | "pageCount"
    | "getCoreRowModel"
    | "onPaginationChange"
    | "onSortingChange"
    | "onColumnFiltersChange"
  >,
  Required<Pick<TableOptions<TData>, "pageCount">> {
  initialState?: Omit<Partial<TableState>, "sorting"> & {
    sorting?: ExtendedColumnSort<TData>[];
  };
  //initialColumnFilterState: ColumnFiltersState;
  // Callbacks for state changes
  onPaginationChange?: (pagination: PaginationState) => void;
  onSortingChange?: (sorting: SortingState) => void;
  onColumnFiltersChange?: (filters: ColumnFiltersState) => void;
  // UI-related options
}

export function useDataTable<TData>(props: UseDataTableProps<TData>) {
  const {
    columns,
    pageCount = -1,
    initialState,
    //initialColumnFilterState,
    enableColumnResizing = true,
    onPaginationChange: onPaginationChangeProp,
    onSortingChange: onSortingChangeProp,
    onColumnFiltersChange: onColumnFiltersChangeProp,
    ...tableProps
  } = props;

  // Internal table state
  const [rowSelection, setRowSelection] = React.useState<RowSelectionState>(
    initialState?.rowSelection ?? {},
  );
  const [columnVisibility, setColumnVisibility] =
    React.useState<VisibilityState>(initialState?.columnVisibility ?? {});

  // Pagination state from initial state
  const [pagination, setPagination] = React.useState<PaginationState>(
    initialState?.pagination ?? { pageIndex: 0, pageSize: 10 }
  );

  // Sorting state from initial state
  const [sorting, setSorting] = React.useState<SortingState>(
    (initialState?.sorting ?? []) as SortingState
  );

  // Column filters state
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>(initialState?.columnFilters ?? []);

  const onPaginationChange = React.useCallback(
    (updaterOrValue: Updater<PaginationState>) => {
      const newPagination = typeof updaterOrValue === "function"
        ? updaterOrValue(pagination)
        : updaterOrValue;

      setPagination(newPagination);
      onPaginationChangeProp?.(newPagination);
    },
    [pagination, onPaginationChangeProp],
  );

  const onSortingChange = React.useCallback(
    (updaterOrValue: Updater<SortingState>) => {
      const newSorting = typeof updaterOrValue === "function"
        ? updaterOrValue(sorting)
        : updaterOrValue;

      setSorting(newSorting);
      onSortingChangeProp?.(newSorting);
    },
    [sorting, onSortingChangeProp],
  );

  const onColumnFiltersChange = React.useCallback(
    (updaterOrValue: Updater<ColumnFiltersState>) => {
      const newFilters = typeof updaterOrValue === "function"
        ? updaterOrValue(columnFilters)
        : updaterOrValue;

      setColumnFilters(newFilters);
      onColumnFiltersChangeProp?.(newFilters);
    },
    [columnFilters, onColumnFiltersChangeProp],
  );

  const table = useReactTable({
    ...tableProps,
    columns,
    initialState,
    pageCount,
    state: {
      pagination,
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    defaultColumn: {
      ...tableProps.defaultColumn,
      enableColumnFilter: false,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onPaginationChange,
    onSortingChange,
    onColumnFiltersChange,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true,
    manualFiltering: true,
  });

  return {
    table,
    pagination,
    sorting,
    columnFilters,
  };
}
