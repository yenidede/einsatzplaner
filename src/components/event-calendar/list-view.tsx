'use client';

import { useEffect, useMemo, useState } from 'react';

import { DataTable } from '@/components/data-table/components/data-table';
import { DataTableAdvancedToolbar } from '@/components/data-table/components/data-table-advanced-toolbar';
import { DataTableFilterMenu } from '@/components/data-table/components/data-table-filter-menu';
import { DataTableSortList } from '@/components/data-table/components/data-table-sort-list';
import { useDataTable } from '@/components/data-table/hooks/use-data-table';
import {
  byOperator,
  byOperatorUseMetaField,
} from '@/components/data-table/lib/filter-fns';
import { formatDate } from '@/components/data-table/lib/format';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { cn } from '@/lib/utils';
import { useEinsaetzeTableView } from '@/features/einsatz/hooks/useEinsatzQueries';
import type {
  EinsatzListCustomFieldMeta,
  EinsatzListItem,
} from '@/features/einsatz/types';
import { useCategoriesByOrgIds } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useStatuses } from '@/features/einsatz_status/hooks/useStatuses';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useTemplatesByOrgIds } from '@/features/template/hooks/use-template-queries';
import { useUsersByOrgIds } from '@/features/user/hooks/use-user-queries';
import { createColumnHelper } from '@tanstack/react-table';
import { MoreHorizontal } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { CalendarMode } from './types';
import { getBadgeColorClassByStatus, getStatusByMode } from './utils';

/**
 * Selects the displayed status text for a list row based on the calendar mode.
 *
 * @param row - The list item containing status text fields
 * @param mode - Calendar mode; when `'helper'` the helper-specific status text is used
 * @returns `row.status_helper_text` when `mode` is `'helper'`, otherwise `row.status_verwalter_text`
 */
function getStatusLabel(row: EinsatzListItem, mode: CalendarMode): string {
  return mode === 'helper' ? row.status_helper_text : row.status_verwalter_text;
}

/**
 * Formats a category label by combining the category name with an optional abbreviation.
 *
 * @param value - The category name (may include surrounding whitespace)
 * @param abbreviation - The category abbreviation (may include surrounding whitespace)
 * @returns The trimmed category name followed by ` (abbreviation)` if `abbreviation` is non-empty after trimming, otherwise the trimmed category name
 */
function formatCategoryLabel(value: string, abbreviation: string): string {
  const trimmedValue = value.trim();
  const trimmedAbbreviation = abbreviation.trim();

  return trimmedAbbreviation
    ? `${trimmedValue} (${trimmedAbbreviation})`
    : trimmedValue;
}

type ListViewProps = {
  onEventEdit: (eventId: string) => void;
  onEventCreate: (startTime: Date) => void;
  onEventDelete: (eventId: string, title: string) => void;
  onMultiEventDelete: (eventIds: string[]) => void;
  mode: CalendarMode;
};

/**
 * Render the Einsätze list view: a data table with columns, filters, sorting, dynamic custom-field columns and per-row actions.
 *
 * @param onEventEdit - Callback invoked with an event id when a row's "Bearbeiten" action is selected.
 * @param onEventCreate - Callback invoked with a start date when the "Datensatz anlegen" button is pressed.
 * @param onEventDelete - Callback invoked with an event id and title when a row's "Löschen" action is selected.
 * @param onMultiEventDelete - Callback for deleting multiple events (declared but not used in this component).
 * @param mode - Calendar mode that determines which status text is shown for each row.
 * @returns A React element displaying the table, advanced toolbar (filters and sort list), and per-row action menu.
 */
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
  const { data: templatesData, isLoading: areTemplatesLoading } =
    useTemplatesByOrgIds(userOrgIds);
  const { data: usersData, isLoading: isUsersLoading } =
    useUsersByOrgIds(userOrgIds);
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategoriesByOrgIds(userOrgIds);

  const { einsatz_singular, helper_plural } = useOrganizationTerminology(
    organizations,
    activeOrgId
  );

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

  const tableData = Array.isArray(data) ? data : [];

  const customFieldMeta = useMemo<EinsatzListCustomFieldMeta[]>(() => {
    const metaByKey = new Map<string, EinsatzListCustomFieldMeta>();

    for (const einsatz of tableData) {
      for (const fieldMeta of einsatz.custom_field_meta) {
        if (!metaByKey.has(fieldMeta.key)) {
          metaByKey.set(fieldMeta.key, fieldMeta);
        }
      }
    }

    return Array.from(metaByKey.values()).sort((a, b) =>
      a.label.localeCompare(b.label, 'de')
    );
  }, [tableData]);

  const columnHelper = createColumnHelper<EinsatzListItem>();

  const columns = useMemo(() => {
    const staticColumns = [
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
      columnHelper.accessor((row) => getStatusLabel(row, mode), {
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
            {row.getValue() ?? '-'}
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
                if (!acc.some((item) => item.label === label)) {
                  acc.push({
                    label,
                    value: label,
                  });
                }
                return acc;
              },
              [] as { label: string; value: string }[]
            ) ?? [],
        },
      }),
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
      columnHelper.accessor((row) => row.created_by_name ?? '-', {
        id: 'created_by_name',
        header: 'Erstellt von',
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: 'Erstellt von',
          variant: 'multiSelect',
          filterField: 'created_by',
          options:
            usersData
              ?.map((user) => ({
                label: `${user.firstname} ${user.lastname}`.trim(),
                value: user.id,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'de')) ?? [],
        },
      }),
      columnHelper.accessor((row) => row.category_display, {
        id: 'categories',
        header: 'Kategorien',
        cell: (props) => props.getValue() || '-',
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: 'Kategorien',
          variant: 'multiSelect',
          filterField: 'category_labels',
          options:
            categoriesData
              ?.map((category) => {
                const label = formatCategoryLabel(
                  category.value,
                  category.abbreviation
                );

                return {
                  label,
                  value: label,
                };
              })
              .sort((a, b) => a.label.localeCompare(b.label, 'de')) ?? [],
        },
      }),
      columnHelper.accessor((row) => row.helper_count, {
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
      columnHelper.accessor((row) => row.template_name ?? '-', {
        id: 'template_name',
        header: 'Vorlage',
        cell: (props) => props.getValue() || '-',
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: 'Vorlage',
          variant: 'multiSelect',
          filterField: 'template_id',
          options:
            templatesData
              ?.filter((template) => template.name)
              .map((template) => ({
                label: template.name?.trim() ?? '-',
                value: template.id,
              }))
              .sort((a, b) => a.label.localeCompare(b.label, 'de')) ?? [],
        },
      }),
      columnHelper.accessor((row) => row.helper_display, {
        id: 'helper_display',
        header: helper_plural,
        cell: (props) => props.getValue() || '-',
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: helper_plural,
          variant: 'text',
          placeholder: `Nach ${helper_plural} suchen...`,
        },
      }),
    ];

    const dynamicColumns = customFieldMeta.map(
      (fieldMeta) =>
        columnHelper.accessor((row) => row.custom_fields[fieldMeta.key] ?? '', {
          id: fieldMeta.key,
          header: fieldMeta.label,
          cell: (props) => props.getValue() || '-',
          enableColumnFilter: true,
          filterFn: byOperator,
          meta: {
            label: fieldMeta.label,
            variant: 'text',
            placeholder: `Nach ${fieldMeta.label} suchen...`,
          },
        })
    );

    const actionColumn = columnHelper.display({
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
    });

    return [...staticColumns, ...dynamicColumns, actionColumn];
  }, [
    categoriesData,
    columnHelper,
    customFieldMeta,
    einsatz_singular,
    helper_plural,
    mode,
    onEventDelete,
    onEventEdit,
    statusData,
    templatesData,
    usersData,
  ]);

  const { table } = useDataTable({
    data: tableData,
    columns,
    rowCount: tableData.length,
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
