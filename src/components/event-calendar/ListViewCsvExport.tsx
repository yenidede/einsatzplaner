'use client';

import type { Table } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import type {
  EinsatzListCustomFieldMeta,
  EinsatzListItem,
} from '@/features/einsatz/types';
import type { CalendarMode } from './types';

import {
  buildListViewCsv,
  createListViewCsvFilename,
  downloadCsvFile,
} from './list-view-csv';
import TooltipCustom from '../tooltip-custom';

type ListViewCsvExportProps = {
  table: Table<EinsatzListItem>;
  tableData: EinsatzListItem[];
  customFieldMeta: EinsatzListCustomFieldMeta[];
  mode: CalendarMode;
  registeredHelpersLabel: string;
  registeredHelpersCountLabel: string;
  neededHelpersCountLabel: string;
};

export function ListViewCsvExport({
  table,
  tableData,
  customFieldMeta,
  mode,
  registeredHelpersLabel,
  registeredHelpersCountLabel,
  neededHelpersCountLabel,
}: ListViewCsvExportProps) {
  const selectedRows = table
    .getFilteredSelectedRowModel()
    .rows.map((row) => row.original);

  const exportRows = (rows: EinsatzListItem[], successMessage: string) => {
    const csvContent = buildListViewCsv(rows, {
      customFieldMeta,
      mode,
      registeredHelpersLabel,
      registeredHelpersCountLabel,
      neededHelpersCountLabel,
    });
    downloadCsvFile(csvContent, createListViewCsvFilename());
    toast.success(successMessage);
  };

  const handleExportCurrentView = () => {
    const rows = table.getSortedRowModel().rows.map((row) => row.original);

    exportRows(
      rows,
      rows.length > 0
        ? 'Die CSV-Datei mit den aktuellen Einstellungen wurde heruntergeladen.'
        : 'Die CSV-Datei mit den aktuellen Einstellungen wurde als leere Liste heruntergeladen.'
    );
  };

  const handleExportSelected = () => {
    exportRows(
      selectedRows,
      selectedRows.length > 0
        ? 'Die CSV-Datei mit den ausgewählten Datensätzen wurde heruntergeladen.'
        : 'Die CSV-Datei mit den ausgewählten Datensätzen wurde als leere Liste heruntergeladen.'
    );
  };

  const handleExportAllData = () => {
    exportRows(
      tableData,
      tableData.length > 0
        ? 'Die CSV-Datei mit allen Rohdaten wurde heruntergeladen.'
        : 'Die CSV-Datei mit allen Rohdaten wurde als leere Liste heruntergeladen.'
    );
  };

  return (
    <DropdownMenu>
      <TooltipCustom text="Daten als CSV exportieren">
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="icon" className="size-8">
            <Download />
          </Button>
        </DropdownMenuTrigger>
      </TooltipCustom>
      <DropdownMenuContent align="start">
        <DropdownMenuItem
          onClick={handleExportSelected}
          disabled={selectedRows.length === 0}
        >
          Auswahl exportieren
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportCurrentView}>
          Aktuelle Ansicht exportieren
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleExportAllData}>
          Alle Daten ohne Filter exportieren
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
