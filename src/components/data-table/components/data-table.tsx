import { flexRender, type Table as TanstackTable } from '@tanstack/react-table';
import type * as React from 'react';

import { DataTablePagination } from '@/components/data-table/components/data-table-pagination';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { getCommonPinningStyles } from '@/components/data-table/lib/data-table';
import { cn } from '@/lib/utils';
import { DataTableSkeleton } from '../components/data-table-skeleton';

interface DataTableProps<TData> extends React.ComponentProps<'div'> {
  table: TanstackTable<TData>;
  actionBar?: React.ReactNode;
  isLoading?: boolean;
}

export function DataTable<TData>({
  table,
  actionBar,
  children,
  className,
  isLoading = false,
  ...props
}: DataTableProps<TData>) {
  return (
    <div
      className={cn('flex w-full flex-col gap-2.5', className)}
      {...props}
    >
      {children}
      <div className="bg-background overflow-x-auto rounded-md border">
        {isLoading ? (
          <DataTableSkeleton columnCount={8} />
        ) : (
          <Table className="min-w-full w-max">
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id}>
                  {headerGroup.headers.map((header) => (
                    <TableHead
                      key={header.id}
                      colSpan={header.colSpan}
                      className={cn(
                        header.column.getIsPinned() && 'bg-background'
                      )}
                      style={{
                        ...getCommonPinningStyles({ column: header.column }),
                      }}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  ))}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows?.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell
                        key={cell.id}
                        className={cn(
                          cell.column.getIsPinned() &&
                            'bg-background group-hover:bg-muted/50 group-data-[state=selected]:bg-muted'
                        )}
                        style={{
                          ...getCommonPinningStyles({ column: cell.column }),
                        }}
                      >
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={table.getAllColumns().length}
                    className="h-24 text-center"
                  >
                    Keine Suchergebnisse.{' '}
                    <a
                      className="cursor-pointer underline"
                      onClick={() => table.resetColumnFilters()}
                    >
                      Filter zurücksetzen.
                    </a>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        )}
      </div>
      <div className="bg-background sticky bottom-0 z-20 flex flex-col gap-2.5 border-t pt-2">
        <DataTablePagination table={table} />
        {actionBar &&
          table.getFilteredSelectedRowModel().rows.length > 0 &&
          actionBar}
      </div>
    </div>
  );
}
