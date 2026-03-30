import { format } from 'date-fns';

import { formatDate } from '@/components/data-table/lib/format';
import type {
  EinsatzListCustomFieldMeta,
  EinsatzListCustomFieldValue,
  EinsatzListItem,
} from '@/features/einsatz/types';
import type { CalendarMode } from '@/components/event-calendar/types';

type CsvColumn = {
  header: string;
  getValue: (row: EinsatzListItem) => string;
};

function formatCustomFieldValue(
  value: EinsatzListCustomFieldValue,
  datatype: EinsatzListCustomFieldMeta['datatype']
): string {
  if (value == null || value === '') {
    return '';
  }

  if (datatype === 'boolean') {
    if (typeof value === 'boolean') {
      return value ? 'Ja' : 'Nein';
    }

    if (typeof value === 'string' && value.toLowerCase() === 'true') {
      return 'Ja';
    }

    if (typeof value === 'string' && value.toLowerCase() === 'false') {
      return 'Nein';
    }
  }

  if (value instanceof Date) {
    return formatDate(value, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }

  return String(value);
}

function escapeCsvCell(value: string): string {
  const normalizedValue = value.replace(/\r\n/g, '\n');
  const sanitizedValue = /^[\t ]*[=+\-@]/.test(normalizedValue)
    ? `'${normalizedValue}`
    : normalizedValue;

  if (
    sanitizedValue.includes(';') ||
    sanitizedValue.includes('"') ||
    sanitizedValue.includes('\n')
  ) {
    return `"${sanitizedValue.replace(/"/g, '""')}"`;
  }

  return sanitizedValue;
}

type BuildCsvColumnsOptions = {
  customFieldMeta: EinsatzListCustomFieldMeta[];
  mode: CalendarMode;
  registeredHelpersLabel: string;
  registeredHelpersCountLabel: string;
  neededHelpersCountLabel: string;
};

function buildCsvColumns({
  customFieldMeta,
  mode,
  registeredHelpersLabel,
  registeredHelpersCountLabel,
  neededHelpersCountLabel,
}: BuildCsvColumnsOptions
): CsvColumn[] {
  const baseColumns: CsvColumn[] = [
    {
      header: 'Titel',
      getValue: (row) => row.title ?? '',
    },
    {
      header: 'Status',
      getValue: (row) =>
        mode === 'helper'
          ? (row.status_helper_text ?? '')
          : (row.status_verwalter_text ?? ''),
    },
    {
      header: 'Start Datum',
      getValue: (row) =>
        formatDate(row.start, {
          day: '2-digit',
          month: '2-digit',
          year: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
    },
    {
      header: 'Erstellt von',
      getValue: (row) => row.created_by_name ?? '',
    },
    {
      header: 'Kategorien',
      getValue: (row) => row.category_display ?? '',
    },
    {
      header: registeredHelpersLabel,
      getValue: (row) => row.helper_display ?? '',
    },
    {
      header: registeredHelpersCountLabel,
      getValue: (row) => String(row.helper_count ?? ''),
    },
    {
      header: neededHelpersCountLabel,
      getValue: (row) => String(row.helpers_needed ?? ''),
    },
    {
      header: 'Vorlage',
      getValue: (row) => row.template_name ?? '',
    },
  ];

  const dynamicColumns = customFieldMeta.map<CsvColumn>((fieldMeta) => ({
    header: fieldMeta.label,
    getValue: (row) =>
      formatCustomFieldValue(
        row.custom_fields[fieldMeta.key] ?? null,
        fieldMeta.datatype
      ),
  }));

  return [...baseColumns, ...dynamicColumns];
}

export function buildListViewCsv(
  rows: EinsatzListItem[],
  options: BuildCsvColumnsOptions
): string {
  const columns = buildCsvColumns(options);
  const headerLine = columns
    .map((column) => escapeCsvCell(column.header))
    .join(';');
  const dataLines = rows.map((row) =>
    columns.map((column) => escapeCsvCell(column.getValue(row))).join(';')
  );

  return [headerLine, ...dataLines].join('\n');
}

export function createListViewCsvFilename(): string {
  return `data-list-${format(new Date(), 'yyyy-MM-dd-HH-mm')}.csv`;
}

export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([`\uFEFF${content}`], {
    type: 'text/csv;charset=utf-8;',
  });
  const blobUrl = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = blobUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);

  URL.revokeObjectURL(blobUrl);
}
