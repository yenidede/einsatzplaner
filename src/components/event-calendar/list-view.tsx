'use client';

import React, { useEffect, useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table/components/data-table';
import { DataTableAdvancedToolbar } from '@/components/data-table/components/data-table-advanced-toolbar';
import { DataTableSortList } from '@/components/data-table/components/data-table-sort-list';
import { useDataTable } from '@/components/data-table/hooks/use-data-table';

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

import type { ETV } from '@/features/einsatz/types';
import { useEinsaetzeTableView } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useStatuses } from '@/features/einsatz_status/hooks/useStatuses';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useTemplatesByOrgIds } from '@/features/template/hooks/use-template-queries';
import { useUsersByOrgIds } from '@/features/user/hooks/use-user-queries';
import { useCategoriesByOrgIds } from '@/features/category/hooks/useCategories';
import { ColumnDef, createColumnHelper } from '@tanstack/react-table';
import { Checkbox } from '../ui/checkbox';
import { CalendarMode } from './types';
import { getBadgeColorClassByStatus, getStatusByMode } from './utils';
import { Badge } from '../ui/badge';
import { cn } from '@/lib/utils';
import { DataTableFilterMenu } from '../data-table/components/data-table-filter-menu';
import {
  byOperator,
  byOperatorUseMetaField,
} from '../data-table/lib/filter-fns';
import { formatDate } from '../data-table/lib/format';
import { Button } from '../ui/button';
import { MoreHorizontal } from 'lucide-react';
import { useSession } from 'next-auth/react';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';

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
  const activeOrgId = userSession?.user?.activeOrganization?.id;
  const userOrgIds = userSession?.user?.orgIds ?? [];

  const { data, isLoading } = useEinsaetzeTableView(userOrgIds);

  const { data: statusData, isLoading: isStatusLoading } = useStatuses();

  const { data: organizations } = useOrganizations(userOrgIds);

  const { einsatz_singular, helper_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

  // const { data: organizationsData, isLoading: isOrganizationsLoading } =
  //   useQuery({
  //     queryKey: organizationQueryKeys.organizations(userOrgIds),
  //     queryFn: () => getOrganizationsByIds(userOrgIds),
  //     enabled: userOrgIds.length > 0,
  //   });

  const { data: templatesData, isLoading: areTemplatesLoading } =
    useTemplatesByOrgIds(userOrgIds);

  const { data: usersData, isLoading: isUsersLoading } =
    useUsersByOrgIds(userOrgIds);

  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategoriesByOrgIds(userOrgIds);

  // Ensure data is defined before accessing its elements

  const isSomeQueryLoading = useMemo(() => {
    return (
      isLoading ||
      isStatusLoading ||
      areTemplatesLoading ||
      isUsersLoading ||
      isCategoriesLoading
    );
  }, [
    isLoading,
    isStatusLoading,
    areTemplatesLoading,
    isUsersLoading,
    isCategoriesLoading,
  ]);

  const columnHelper = createColumnHelper<ETV>();

  // Note: Don't constrain ColumnDef's value generic to unknown; let each accessor infer (string, boolean, etc.).
  const columns = React.useMemo<ColumnDef<ETV, any>[]>(
    () => [
      columnHelper.display({
        id: 'select',
        size: 40,
        header: ({ table }) => (
          <Checkbox
            checked={
              table.getIsAllPageRowsSelected() ||
              (table.getIsSomePageRowsSelected() && 'indeterminate')
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
        id: 'title',
        header: 'Titel',
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: 'Titel',
          variant: 'text',
          placeholder: `Nach ${einsatz_singular} suchen...`,
        },
      }),
      columnHelper.accessor(
        (row) => getStatusByMode(row.einsatz_status, mode)?.text ?? '-',
        {
          id: 'status',
          header: 'Status',
          cell: (row) => (
            <Badge
              variant="default"
              className={cn(
                'capitalize',
                getBadgeColorClassByStatus(row.getValue(), mode)
              )}
            >
              {getStatusByMode(row.getValue(), mode)?.text ?? '-'}
            </Badge>
          ),
          enableColumnFilter: true,
          filterFn: byOperator,
          meta: {
            label: 'Status',
            variant: 'multiSelect',
            options:
              statusData?.reduce(
                (acc, status) => {
                  const label = getStatusByMode(status, mode)?.text ?? '-';
                  // labels shouldnt be duplicate, if not already exists add to list
                  if (!acc.some((item) => item.label === label)) {
                    acc.push({
                      label,
                      value: label, // label cause for some modes there isnt a difference between different values
                    });
                  }
                  return acc;
                },
                [] as { label: string; value: string }[]
              ) ?? [],
          },
        }
      ),
      columnHelper.accessor((row) => row.start, {
        id: 'start',
        header: 'Start Datum',
        cell: (props) => {
          const value = props.getValue();
          return value instanceof Date
            ? formatDate(value, { hour: '2-digit', minute: '2-digit' })
            : (value ?? '-');
        },
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: 'Start Datum',
          variant: 'dateRange',
          filterField: 'start',
        },
      }),
      columnHelper.accessor(
        (row) =>
          `${row.user?.firstname ?? ''} ${row.user?.lastname ?? ''}`.trim(),
        {
          id: 'created_by',
          header: 'Erstellt von',
          cell: (props) => props.getValue(),
          enableColumnFilter: true,
          filterFn: byOperatorUseMetaField,
          meta: {
            label: 'Erstellt von',
            variant: 'multiSelect',
            filterField: 'user.id',
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
            .join(', ')}`.trim(),
        {
          id: 'categories',
          header: 'Kategorien',
          cell: (props) => props.getValue(),
          enableColumnFilter: false,
          filterFn: byOperatorUseMetaField,
          meta: {
            label: 'Kategorien',
            variant: 'multiSelect',
            filterField: 'einsatz_categories.id',
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
        id: 'helper_count',
        header: `Anzahl ${helper_plural}`,
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: `Anzahl ${helper_plural}`,
          variant: 'range',
        },
      }),
      columnHelper.accessor((row) => `${row.einsatz_template?.name}`.trim(), {
        id: 'template',
        header: 'Vorlage',
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: 'Vorlage',
          variant: 'multiSelect',
          filterField: 'einsatz_template.id',
          options:
            templatesData
              ?.filter((t) => t.name)
              .map((template) => ({
                label: template.name?.trim() ?? '-',
                value: template.id,
              }))
              // sort by display name
              .sort((a, b) => a.label.localeCompare(b.label)) ?? [],
        },
      }),
      columnHelper.display({
        id: 'actions',
        size: 40,
        cell: function Cell(props) {
          return (
            <div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreHorizontal className="h-4 w-4" />
                    <span className="sr-only">Aktionsmenü öffnen</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem
                    onClick={() => onEventEdit(props.row.original.id)}
                  >
                    Bearbeiten
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
                    Löschen
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
      einsatz_singular,
      statusData,
      usersData,
      categoriesData,
      helper_plural,
      templatesData,
      mode,
      onEventEdit,
      onEventDelete,
    ]
  );

  const { table } = useDataTable({
    data: Array.isArray(data) ? data : [],
    columns: columns,
    rowCount: Array.isArray(data) ? data.length : 0,
    pageCount,
    initialState: {
      sorting: [
        {
          id: 'start',
          desc: false,
        },
      ],
      columnPinning: {
        left: ['select', 'title'],
        right: ['actions'],
      },
    },
  });

  const rowModelRows = table.getRowModel().rows;
  useEffect(() => {
    // run after table rows are computed
    setIsTableReady(true);
  }, [rowModelRows]);

  if (data instanceof Response) {
    console.error('Error Response in ListView:', data);
    return (
      <div className="flex flex-col items-baseline justify-start gap-4 px-4 py-6">
        <div>
          <h2 className="font-bold">{'Ein Fehler ist aufgetreten'}</h2>
        </div>
      </div>
    );
  }

  if (!userOrgIds || userOrgIds.length === 0) {
    return (
      <div className="flex flex-col items-baseline justify-start gap-4 px-4 py-6">
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
      <div className="flex flex-col items-baseline justify-start gap-4 px-4 py-6">
        <div>
          <h2 className="font-bold">
            Es wurden noch keine Datensätze angelegt.{' '}
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
