'use client';

import { useState, useMemo, useEffect, memo, useDeferredValue } from 'react';
import Image from 'next/image';
import { ChevronDown, ChevronUp, Loader2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { de } from 'date-fns/locale';
import {
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState,
  createColumnHelper,
  flexRender,
} from '@tanstack/react-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { DataTableColumnHeader } from '@/components/data-table/components/data-table-column-header';
import { DataTablePagination } from '@/components/data-table/components/data-table-pagination';
import { cn } from '@/lib/utils';
import { getFormattedMessage } from '../utils';
import {
  useActivityLogsFiltered,
  useChangeTypes,
} from '../hooks/useActivityLogs';
import { useSession } from 'next-auth/react';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import type { ChangeLogEntry } from '../types';

function Dot({ className }: { className?: string }) {
  return (
    <svg
      width="6"
      height="6"
      fill="currentColor"
      viewBox="0 0 6 6"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      <circle cx="3" cy="3" r="3" />
    </svg>
  );
}

const ActivityTypeCell = memo(function ActivityTypeCell({
  changeColor,
  changeIconUrl,
  changeName,
}: {
  changeColor: string;
  changeIconUrl: string;
  changeName: string;
}) {
  return (
    <div
      className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full"
      style={{ backgroundColor: `${changeColor}40` }}
    >
      {changeIconUrl ? (
        <Image
          src={changeIconUrl}
          alt={changeName}
          className="h-4 w-4 object-contain"
          width={32}
          height={32}
        />
      ) : (
        <div
          className="h-3 w-3 rounded-full"
          style={{ backgroundColor: changeColor }}
        />
      )}
    </div>
  );
});

const ActivityMessageCell = memo(function ActivityMessageCell({
  activity,
  openDialog,
}: {
  activity: ChangeLogEntry;
  openDialog: (id: string) => void;
}) {
  return (
    <div className="min-w-0 text-left">
      {getFormattedMessage(activity, openDialog)}
    </div>
  );
});

/** Max activities fetched once when modal opens; filtering is then client-side. */
const ACTIVITIES_FETCH_LIMIT = 500;
const DEFAULT_PAGE_SIZE = 20;

type FilterState = {
  orgId: string;
  typeId: string;
  startDate: string;
  endDate: string;
  unreadOnly: boolean;
};

const defaultFilters: FilterState = {
  orgId: '',
  typeId: '',
  startDate: '',
  endDate: '',
  unreadOnly: false,
};

type AllActivitiesModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  openDialog: (einsatzId: string) => void;
  readIds: Set<string>;
  onMarkAsRead: (id: string) => void;
  onMarkAllAsRead?: (activityIds: string[]) => void;
};

export function AllActivitiesModal({
  open,
  onOpenChange,
  openDialog,
  readIds,
  onMarkAsRead,
  onMarkAllAsRead,
}: AllActivitiesModalProps) {
  const [filtersOpen, setFiltersOpen] = useState(true);
  const [filters, setFilters] = useState<FilterState>(defaultFilters);
  const [sorting, setSorting] = useState<SortingState>([
    { id: 'created_at', desc: true },
  ]);

  const deferredFilters = useDeferredValue(filters);
  const isFiltering =
    filters.orgId !== deferredFilters.orgId ||
    filters.typeId !== deferredFilters.typeId ||
    filters.startDate !== deferredFilters.startDate ||
    filters.endDate !== deferredFilters.endDate ||
    filters.unreadOnly !== deferredFilters.unreadOnly;

  const { data: session } = useSession();
  const orgIds = session?.user.orgIds;
  const { data: orgsData } = useOrganizations(
    orgIds && orgIds.length > 1 ? orgIds : undefined
  );

  const { data, isLoading } = useActivityLogsFiltered(
    { limit: ACTIVITIES_FETCH_LIMIT, offset: 0 },
    open
  );
  const { data: changeTypes = [] } = useChangeTypes(open);

  const allActivities = data?.activities ?? [];

  const filteredActivities = useMemo(() => {
    let list = allActivities;

    if (deferredFilters.orgId) {
      list = list.filter((a) => a.einsatz.org_id === deferredFilters.orgId);
    }
    if (deferredFilters.typeId) {
      list = list.filter((a) => a.change_type.id === deferredFilters.typeId);
    }
    if (deferredFilters.startDate) {
      const start = new Date(deferredFilters.startDate);
      start.setHours(0, 0, 0, 0);
      list = list.filter((a) => new Date(a.created_at) >= start);
    }
    if (deferredFilters.endDate) {
      const end = new Date(deferredFilters.endDate);
      end.setHours(23, 59, 59, 999);
      list = list.filter((a) => new Date(a.created_at) <= end);
    }
    if (deferredFilters.unreadOnly) {
      list = list.filter((a) => !readIds.has(a.id));
    }

    return list;
  }, [allActivities, deferredFilters, readIds]);

  const hasMultipleOrgs = (orgsData?.length ?? 0) > 1;

  const columnHelper = createColumnHelper<ChangeLogEntry>();

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: 'type',
        header: () => <span className="sr-only">Typ</span>,
        size: 48,
        cell: ({ row }) => (
          <ActivityTypeCell
            changeColor={row.original.change_type.change_color}
            changeIconUrl={row.original.change_type.change_icon_url}
            changeName={row.original.change_type.name}
          />
        ),
      }),
      columnHelper.display({
        id: 'message',
        header: 'Aktivität',
        cell: ({ row }) => (
          <div className="max-md:min-w-0 max-md:wrap-break-word">
            <ActivityMessageCell
              activity={row.original}
              openDialog={openDialog}
            />
          </div>
        ),
      }),
      columnHelper.accessor('created_at', {
        id: 'created_at',
        header: ({ column }) => (
          <DataTableColumnHeader column={column} title="Zeit" />
        ),
        cell: ({ getValue }) => (
          <span className="text-muted-foreground text-xs whitespace-nowrap">
            {formatDistanceToNow(new Date(getValue()), {
              addSuffix: true,
              locale: de,
            })}
          </span>
        ),
        sortingFn: 'datetime',
      }),
      ...(hasMultipleOrgs
        ? [
            columnHelper.display({
              id: 'organisation',
              header: () => <span className="max-md:hidden">Organisation</span>,
              cell: ({ row }) => (
                <span className="text-muted-foreground truncate text-xs max-md:hidden">
                  {orgsData?.find(
                    (org) => org.id === row.original.einsatz.org_id
                  )?.name ?? '–'}
                </span>
              ),
            }),
          ]
        : []),
      columnHelper.display({
        id: 'unread',
        header: () => <span className="sr-only">Status</span>,
        size: 32,
        cell: ({ row }) =>
          !readIds.has(row.original.id) ? (
            <span className="flex items-center" title="Ungelesen">
              <span className="sr-only">Ungelesen</span>
              <Dot className="text-primary" />
            </span>
          ) : null,
      }),
    ],
    [columnHelper, openDialog, hasMultipleOrgs, orgsData, readIds]
  );

  const table = useReactTable({
    data: filteredActivities,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: {
      pagination: { pageSize: DEFAULT_PAGE_SIZE, pageIndex: 0 },
    },
  });

  useEffect(() => {
    table.setPageIndex(0);
  }, [
    filters.orgId,
    filters.typeId,
    filters.startDate,
    filters.endDate,
    filters.unreadOnly,
  ]);

  const handleResetFilters = () => {
    setFilters(defaultFilters);
  };

  const handleMarkAllAsRead = () => {
    onMarkAllAsRead?.(filteredActivities.map((a) => a.id));
  };

  const hasActiveFilters =
    filters.orgId ||
    filters.typeId ||
    filters.startDate ||
    filters.endDate ||
    filters.unreadOnly;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col overflow-hidden max-md:max-h-full md:max-h-[90vh]">
        <DialogHeader className="shrink-0 max-md:pb-2">
          <DialogTitle>Alle Aktivitäten</DialogTitle>
        </DialogHeader>

        <div className="shrink-0 space-y-2">
          <Button
            variant="ghost"
            size="sm"
            className="flex w-full items-center justify-between gap-2 px-0 hover:bg-transparent"
            onClick={() => setFiltersOpen((open) => !open)}
            aria-expanded={filtersOpen}
          >
            <span className="text-muted-foreground text-sm font-medium">
              Filter
              {hasActiveFilters && (
                <span className="text-primary ml-1.5">(aktiv)</span>
              )}
            </span>
            {filtersOpen ? (
              <ChevronUp className="h-4 w-4 shrink-0" aria-hidden />
            ) : (
              <ChevronDown className="h-4 w-4 shrink-0" aria-hidden />
            )}
          </Button>
          {filtersOpen && (
            <>
              <div className="grid gap-2 max-md:gap-2 sm:grid-cols-2 lg:grid-cols-4">
                {hasMultipleOrgs && (
                  <div className="space-y-1.5">
                    <Label className="text-xs">Organisation</Label>
                    <Select
                      value={filters.orgId || 'all'}
                      onValueChange={(v) =>
                        setFilters((prev) => ({
                          ...prev,
                          orgId: v === 'all' ? '' : v,
                        }))
                      }
                    >
                      <SelectTrigger className="h-9">
                        <SelectValue placeholder="Alle" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Alle</SelectItem>
                        {orgsData?.map((org) => (
                          <SelectItem key={org.id} value={org.id}>
                            {org.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label className="text-xs">Aktivitätstyp</Label>
                  <Select
                    value={filters.typeId || 'all'}
                    onValueChange={(v) =>
                      setFilters((prev) => ({
                        ...prev,
                        typeId: v === 'all' ? '' : v,
                      }))
                    }
                  >
                    <SelectTrigger className="h-9">
                      <SelectValue placeholder="Alle" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">Alle</SelectItem>
                      {changeTypes.map((t) => (
                        <SelectItem key={t.id} value={t.id}>
                          {t.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Von</Label>
                  <Input
                    type="date"
                    className="h-9"
                    value={filters.startDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        startDate: e.target.value,
                      }))
                    }
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Bis</Label>
                  <Input
                    type="date"
                    className="h-9"
                    value={filters.endDate}
                    onChange={(e) =>
                      setFilters((prev) => ({
                        ...prev,
                        endDate: e.target.value,
                      }))
                    }
                  />
                </div>
              </div>
              <div className="flex flex-col gap-2 max-md:gap-2 sm:flex-row sm:justify-between">
                <div className="flex flex-wrap items-center gap-2 max-md:gap-2 sm:gap-4">
                  <label className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={filters.unreadOnly}
                      onCheckedChange={(checked) =>
                        setFilters((prev) => ({
                          ...prev,
                          unreadOnly: checked === true,
                        }))
                      }
                      aria-label="Nur Ungelesene anzeigen"
                    />
                    <span>Nur Ungelesene</span>
                  </label>
                </div>
              </div>
            </>
          )}
          <div className="flex flex-wrap gap-4 max-md:gap-1.5 md:justify-end">
            {hasActiveFilters && (
              <Button
                variant="outline"
                size="sm"
                onClick={handleResetFilters}
                className="max-md:h-8 max-md:text-xs"
              >
                Filter zurücksetzen
              </Button>
            )}
            {onMarkAllAsRead &&
              allActivities.length > 0 &&
              filteredActivities.some((a) => !readIds.has(a.id)) && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={handleMarkAllAsRead}
                  className="max-md:h-8 max-md:text-xs"
                >
                  Alle als gelesen markieren
                </Button>
              )}
          </div>
        </div>

        <div className="relative flex min-h-0 flex-1 flex-col rounded-md border max-md:min-h-[60vh]">
          {isLoading ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-sm max-md:py-8">
              Lade Aktivitäten...
            </div>
          ) : filteredActivities.length === 0 && !isFiltering ? (
            <div className="text-muted-foreground flex flex-1 items-center justify-center py-12 text-sm max-md:py-8">
              Keine Aktivitäten gefunden
            </div>
          ) : (
            <>
              {filteredActivities.length === 0 && isFiltering ? (
                <div className="text-muted-foreground flex flex-1 items-center justify-center gap-2 py-12 text-sm max-md:py-8">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Filter wird angewendet...
                </div>
              ) : (
                <>
                  <div className="min-h-0 flex-1 overflow-auto max-md:min-h-[50vh]">
                    <Table>
                      <TableHeader className="bg-background sticky top-0">
                        {table.getHeaderGroups().map((headerGroup) => (
                          <TableRow key={headerGroup.id}>
                            {headerGroup.headers.map((header) => (
                              <TableHead
                                key={header.id}
                                className="whitespace-nowrap"
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
                        {table.getRowModel().rows.map((row) => (
                          <TableRow
                            key={row.id}
                            className="cursor-pointer"
                            onClick={() => onMarkAsRead(row.original.id)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter' || e.key === ' ') {
                                e.preventDefault();
                                onMarkAsRead(row.original.id);
                              }
                            }}
                            tabIndex={0}
                            role="button"
                          >
                            {row.getVisibleCells().map((cell) => (
                              <TableCell
                                key={cell.id}
                                className={cn(
                                  'py-2 align-top max-md:px-1 max-md:py-1.5',
                                  cell.column.id === 'message' &&
                                    'max-md:max-w-[min(55vw,260px)] max-md:min-w-0 max-md:whitespace-normal'
                                )}
                              >
                                {flexRender(
                                  cell.column.columnDef.cell,
                                  cell.getContext()
                                )}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                  <div className="shrink-0 border-t px-2 max-md:px-1">
                    <DataTablePagination
                      table={table}
                      pageSizeOptions={[10, 20, 50, 200]}
                      hideRowCountOnMobile
                    />
                  </div>
                  {isFiltering && (
                    <div
                      className="bg-background/80 absolute inset-0 z-10 flex items-center justify-center rounded-md"
                      aria-live="polite"
                      aria-busy="true"
                    >
                      <div className="text-muted-foreground flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Filter wird angewendet...
                      </div>
                    </div>
                  )}
                </>
              )}
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
