'use client';

import { useMemo, useState } from 'react';

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
import { TruncatedTextWithTooltip } from '@/components/truncated-text-with-tooltip';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useOrganizationTerminology } from '@/hooks/use-organization-terminology';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import { cn } from '@/lib/utils';
import { useEinsaetzeTableView } from '@/features/einsatz/hooks/useEinsatzQueries';
import type {
  EinsatzListCustomFieldMeta,
  EinsatzListCustomFieldValue,
  EinsatzListItem,
} from '@/features/einsatz/types';
import { useCategoriesByOrgIds } from '@/features/einsatz/hooks/useEinsatzQueries';
import { useStatuses } from '@/features/einsatz_status/hooks/useStatuses';
import { useOrganizations } from '@/features/organization/hooks/use-organization-queries';
import { useTemplatesByOrgIds } from '@/features/template/hooks/use-template-queries';
import { useUsersByOrgIds } from '@/features/user/hooks/use-user-queries';
import { createColumnHelper } from '@tanstack/react-table';
import { MoreHorizontal, Trash2 } from 'lucide-react';
import { useSession } from 'next-auth/react';

import { ListViewCsvExport } from './ListViewCsvExport';
import { CalendarMode } from './types';
import { getBadgeColorClassByStatus, getStatusByMode } from './utils';
import TooltipCustom from '../tooltip-custom';

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
 * @param value - The category name
 * @param abbreviation - The category abbreviation
 * @returns The trimmed category name followed by ` (abbreviation)` when an abbreviation is present, otherwise the trimmed category name
 */
function formatCategoryLabel(value: string, abbreviation: string): string {
  const trimmedValue = value.trim();
  const trimmedAbbreviation = abbreviation.trim();

  return trimmedAbbreviation
    ? `${trimmedValue} (${trimmedAbbreviation})`
    : trimmedValue;
}

function getUserDisplayName(user: {
  firstname: string | null;
  lastname: string | null;
}): string {
  return [user.firstname, user.lastname]
    .filter((value): value is string => Boolean(value))
    .join(' ')
    .trim();
}

function getCustomFieldFilterVariant(
  datatype: EinsatzListCustomFieldMeta['datatype']
): 'text' | 'range' | 'dateRange' | 'select' {
  switch (datatype) {
    case 'number':
    case 'currency':
      return 'range';
    case 'date':
      return 'dateRange';
    case 'boolean':
    case 'select':
      return 'select';
    default:
      return 'text';
  }
}

function formatCustomFieldValue(
  value: EinsatzListCustomFieldValue,
  datatype: EinsatzListCustomFieldMeta['datatype']
): string {
  if (value == null || value === '') {
    return '-';
  }

  if (datatype === 'boolean') {
    if (value === 'true') return 'Ja';
    if (value === 'false') return 'Nein';
  }

  return String(value);
}

type ListViewProps = {
  onEventEdit: (eventId: string) => void;
  onEventCreate: (startTime: Date) => void;
  onEventDelete: (eventId: string, title: string) => void;
  onMultiEventDelete: (eventIds: string[]) => void;
  mode: CalendarMode;
};

/**
 * Render the Einsätze list view with filters, sorting, dynamic custom-field columns, and row actions.
 *
 * @param onEventEdit - Callback invoked with an event id when a row's "Bearbeiten" action is selected
 * @param onEventCreate - Callback invoked with a start date when the "Datensatz anlegen" action is selected
 * @param onEventDelete - Callback invoked with an event id and title when a row's "Löschen" action is selected
 * @param onMultiEventDelete - Callback for deleting multiple events; accepted by the props type but currently unused in this component
 * @param mode - Calendar mode that determines which status text is displayed
 * @returns A React element containing the list view table and toolbar
 */
export function ListView({
  onEventEdit,
  onEventCreate,
  onEventDelete,
  onMultiEventDelete,
  mode,
}: ListViewProps) {
  const [pageCount, setPageCount] = useState(0);
  const { showDestructive } = useConfirmDialog();

  const { data: userSession, status: sessionStatus } = useSession();
  const activeOrgId = userSession?.user?.activeOrganization?.id;
  const userOrgIds = userSession?.user?.orgIds ?? [];

  const { data, isLoading, isFetched } = useEinsaetzeTableView(userOrgIds);
  const { data: statusData, isLoading: isStatusLoading } = useStatuses();
  const { data: organizations } = useOrganizations(userOrgIds);
  const { data: templatesData, isLoading: areTemplatesLoading } =
    useTemplatesByOrgIds(userOrgIds);
  const { data: usersData, isLoading: isUsersLoading } =
    useUsersByOrgIds(userOrgIds);
  const { data: categoriesData, isLoading: isCategoriesLoading } =
    useCategoriesByOrgIds(userOrgIds);

  const { einsatz_singular, einsatz_plural, helper_plural } =
    useOrganizationTerminology(organizations, activeOrgId);

  const registeredHelpersLabel = `Eingetragene ${helper_plural}`;
  const registeredHelpersCountLabel = `Anzahl eingetragene ${helper_plural}`;
  const neededHelpersCountLabel = `Anzahl benötigte ${helper_plural}`;

  const isSomeQueryLoading = useMemo(() => {
    return (
      sessionStatus === 'loading' ||
      isLoading ||
      isStatusLoading ||
      areTemplatesLoading ||
      isUsersLoading ||
      isCategoriesLoading
    );
  }, [
    sessionStatus,
    isLoading,
    isStatusLoading,
    areTemplatesLoading,
    isUsersLoading,
    isCategoriesLoading,
  ]);

  const tableData = useMemo(() => {
    return Array.isArray(data) ? data : [];
  }, [data]);

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

  const customFieldSelectOptions = useMemo(() => {
    const optionsByFieldKey = new Map<
      string,
      { label: string; value: string }[]
    >();

    for (const fieldMeta of customFieldMeta) {
      if (fieldMeta.datatype !== 'select') {
        continue;
      }

      const uniqueValues = new Set<string>();

      for (const allowedValue of fieldMeta.allowed_values) {
        const normalizedValue = allowedValue.trim();

        if (normalizedValue.length === 0) {
          continue;
        }

        uniqueValues.add(normalizedValue);
      }

      for (const einsatz of tableData) {
        const fieldValue = einsatz.custom_fields[fieldMeta.key];

        if (typeof fieldValue !== 'string') {
          continue;
        }

        const normalizedValue = fieldValue.trim();

        if (normalizedValue.length === 0) {
          continue;
        }

        uniqueValues.add(normalizedValue);
      }

      optionsByFieldKey.set(
        fieldMeta.key,
        Array.from(uniqueValues)
          .map((value) => ({ label: value, value }))
          .sort((a, b) => a.label.localeCompare(b.label, 'de'))
      );
    }

    return optionsByFieldKey;
  }, [customFieldMeta, tableData]);

  const columnHelper = useMemo(() => createColumnHelper<EinsatzListItem>(), []);

  const columns = useMemo(() => {
    const userOptions =
      usersData
        ?.map((user) => {
          const label = getUserDisplayName(user);
          return label ? { label, value: label } : null;
        })
        .filter(
          (option): option is { label: string; value: string } =>
            option !== null
        )
        .sort((a, b) => a.label.localeCompare(b.label, 'de')) ?? [];

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
        enableHiding: false,
        enableColumnFilter: false,
      }),
      columnHelper.accessor((row) => row.title, {
        id: 'title',
        header: 'Titel',
        cell: (props) => {
          const title = props.getValue();

          return (
            // the max-w-32 and the triggerCharCount=18 need to be aligned
            <div className="max-w-32">
              <TruncatedTextWithTooltip text={title} triggerCharCount={18} />
            </div>
          );
        },
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
              ?.map((user) => {
                const label = getUserDisplayName(user);
                return label ? { label, value: user.id } : null;
              })
              .filter(
                (option): option is { label: string; value: string } =>
                  option !== null
              )
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
      columnHelper.accessor((row) => row.helper_display, {
        id: 'helper_display',
        header: registeredHelpersLabel,
        cell: (props) => props.getValue() || '-',
        enableColumnFilter: true,
        filterFn: byOperatorUseMetaField,
        meta: {
          label: registeredHelpersLabel,
          variant: 'multiSelect',
          filterField: 'helper_names',
          options: userOptions,
        },
      }),
      columnHelper.accessor((row) => row.helper_count, {
        id: 'helper_count',
        header: registeredHelpersCountLabel,
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: registeredHelpersCountLabel,
          variant: 'range',
        },
      }),
      columnHelper.accessor((row) => row.helpers_needed, {
        id: 'helpers_needed',
        header: neededHelpersCountLabel,
        cell: (props) => props.getValue(),
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: neededHelpersCountLabel,
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
    ];

    const dynamicColumns = customFieldMeta.map((fieldMeta) =>
      columnHelper.accessor((row) => row.custom_fields[fieldMeta.key] ?? '', {
        id: fieldMeta.key,
        header: fieldMeta.label,
        cell: (props) =>
          formatCustomFieldValue(props.getValue(), fieldMeta.datatype),
        enableHiding: true,
        enableSorting: true,
        enableColumnFilter: true,
        filterFn: byOperator,
        meta: {
          label: fieldMeta.label,
          variant: getCustomFieldFilterVariant(fieldMeta.datatype),
          options:
            fieldMeta.datatype === 'boolean'
              ? [
                  { label: 'Ja', value: 'true' },
                  { label: 'Nein', value: 'false' },
                ]
              : fieldMeta.datatype === 'select'
                ? (customFieldSelectOptions.get(fieldMeta.key) ?? [])
                : undefined,
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
      enableHiding: false,
      enableColumnFilter: false,
    });

    return [...staticColumns, ...dynamicColumns, actionColumn];
  }, [
    categoriesData,
    columnHelper,
    customFieldMeta,
    customFieldSelectOptions,
    einsatz_singular,
    neededHelpersCountLabel,
    mode,
    onEventDelete,
    onEventEdit,
    registeredHelpersCountLabel,
    registeredHelpersLabel,
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

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedEventIds = selectedRows.map((row) => row.original.id);

  const handleMultiDelete = async () => {
    if (selectedEventIds.length === 0) {
      return;
    }

    const title =
      selectedEventIds.length === 1
        ? `${einsatz_singular} löschen`
        : `${einsatz_plural} löschen`;
    const description =
      selectedEventIds.length === 1
        ? 'Möchten Sie den ausgewählten Datensatz wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.'
        : `Möchten Sie die ${selectedEventIds.length} ausgewählten Datensätze wirklich löschen? Diese Aktion kann nicht rückgängig gemacht werden.`;

    const result = await showDestructive(title, description);

    if (result !== 'success') {
      return;
    }

    onMultiEventDelete(selectedEventIds);
    table.resetRowSelection();
  };

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

  if (
    sessionStatus !== 'loading' &&
    isFetched &&
    !isSomeQueryLoading &&
    tableData.length === 0
  ) {
    return (
      <div className="flex flex-col items-baseline justify-start gap-4 px-4 py-6">
        <div>
          <h2 className="font-bold">
            Es sind noch keine Datensätze vorhanden.
          </h2>
          <p>
            Legen Sie den ersten Datensatz an, um die Tabellenansicht zu
            verwenden.
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
    <DataTable
      table={table}
      isLoading={isSomeQueryLoading}
      actionBar={
        mode === 'verwaltung' ? (
          <TooltipCustom text="Ausgewählte Datensätze löschen">
            <Button
              type="button"
              variant="outline"
              size="icon"
              className="size-8"
              aria-label="Ausgewählte Datensätze löschen"
              onClick={() => {
                void handleMultiDelete();
              }}
            >
              <Trash2 />
            </Button>
          </TooltipCustom>
        ) : null
      }
    >
      <div
        className="bg-card sticky z-40"
        style={{
          top: 'calc(var(--calendar-sticky-top, 0px) + var(--calendar-toolbar-height), 0px)',
        }}
      >
        <DataTableAdvancedToolbar
          table={table}
          viewOptionsLeadingActions={
            <ListViewCsvExport
              table={table}
              tableData={tableData}
              customFieldMeta={customFieldMeta}
              mode={mode}
              registeredHelpersLabel={registeredHelpersLabel}
              registeredHelpersCountLabel={registeredHelpersCountLabel}
              neededHelpersCountLabel={neededHelpersCountLabel}
            />
          }
        >
          <DataTableFilterMenu
            setPageCount={setPageCount}
            key={String(!isSomeQueryLoading)}
            table={table}
            isLoading={isSomeQueryLoading}
          />
          <DataTableSortList table={table} />
        </DataTableAdvancedToolbar>
      </div>
    </DataTable>
  );
}
