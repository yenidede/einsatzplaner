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
import { Button } from '@/components/ui/button';

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
    <div className={cn('flex w-full flex-col gap-2.5', className)} {...props}>
      {children}
      <div className="overflow-hidden rounded-md border">
        {isLoading ? (
          <DataTableSkeleton columnCount={8} />
        ) : (
          <>
            <div className="bg-background max-h-[70svh] overflow-auto">
              <Table className="w-max min-w-full">
                <TableHeader className="bg-background sticky top-0 z-40 border-b shadow-[0_4px_12px_rgba(15,23,42,0.04)]">
                  {table.getHeaderGroups().map((headerGroup) => (
                    <TableRow key={headerGroup.id}>
                      {headerGroup.headers.map((header) => (
                        <TableHead
                          key={header.id}
                          colSpan={header.colSpan}
                          className="bg-background"
                          style={{
                            ...getCommonPinningStyles({
                              column: header.column,
                              withBorder: true,
                            }),
                            zIndex: header.column.getIsPinned() ? 30 : 20,
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
                              ...getCommonPinningStyles({
                                column: cell.column,
                              }),
                              zIndex: cell.column.getIsPinned()
                                ? 10
                                : undefined,
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
                        colSpan={table.getVisibleLeafColumns().length}
                        className="h-24 text-center"
                      >
                        Keine Suchergebnisse.{' '}
                        <Button
                          variant="link"
                          onClick={() => table.resetColumnFilters()}
                        >
                          Filter zurücksetzen.
                        </Button>
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </div>
            <div className="bg-background flex flex-col gap-2.5 border-t pt-2">
              <DataTablePagination
                table={table}
                actionBar={
                  table.getFilteredSelectedRowModel().rows.length > 0
                    ? actionBar
                    : null
                }
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
