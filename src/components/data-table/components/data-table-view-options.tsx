'use client';

import type { Table } from '@tanstack/react-table';
import { Check, ChevronsUpDown, Settings2 } from 'lucide-react';
import * as React from 'react';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { cn } from '@/lib/utils';

interface DataTableViewOptionsProps<TData> {
  table: Table<TData>;
}

export function DataTableViewOptions<TData>({
  table,
}: DataTableViewOptionsProps<TData>) {
  const [searchValue, setSearchValue] = React.useState('');

  const columns = React.useMemo(
    () =>
      table.getAllLeafColumns().filter((column) => column.getCanHide()),
    [table]
  );

  const filteredColumns = React.useMemo(() => {
    const normalizedSearchValue = searchValue.trim().toLocaleLowerCase('de');

    if (!normalizedSearchValue) {
      return columns;
    }

    return columns.filter((column) =>
      (column.columnDef.meta?.label ?? column.id)
        .toLocaleLowerCase('de')
        .includes(normalizedSearchValue)
    );
  }, [columns, searchValue]);

  const allFilteredColumnsVisible =
    filteredColumns.length > 0 &&
    filteredColumns.every((column) => column.getIsVisible());

  const toggleAllColumns = React.useCallback(() => {
    const nextVisibility = !allFilteredColumnsVisible;

    table.setColumnVisibility((prev) => {
      const next = { ...prev };
      for (const column of filteredColumns) {
        next[column.id] = nextVisibility;
      }
      return next;
    });
  }, [allFilteredColumnsVisible, filteredColumns, table]);

  return (
    <Popover>
      <PopoverTrigger tooltip="Spalten verwalten" asChild>
        <Button
          aria-label="Spalten ein/ausblenden"
          role="combobox"
          variant="outline"
          size="sm"
          className="ml-auto hidden h-8 lg:flex"
        >
          <Settings2 />
          View
          <ChevronsUpDown className="ml-auto opacity-50" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-44 p-0">
        <Command>
          <CommandInput
            placeholder="Spalten suchen..."
            value={searchValue}
            onValueChange={setSearchValue}
          />
          <CommandList>
            <CommandEmpty>Keine Spalten gefunden.</CommandEmpty>
            <CommandGroup>
              {filteredColumns.map((column) => (
                <CommandItem
                  key={column.id}
                  onSelect={() =>
                    column.toggleVisibility(!column.getIsVisible())
                  }
                >
                  <span className="truncate">
                    {column.columnDef.meta?.label ?? column.id}
                  </span>
                  <Check
                    className={cn(
                      'ml-auto size-4 shrink-0',
                      column.getIsVisible() ? 'opacity-100' : 'opacity-0'
                    )}
                  />
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
        <div className="border-t p-2">
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={toggleAllColumns}
            disabled={filteredColumns.length === 0}
          >
            {allFilteredColumnsVisible ? 'Alle ausblenden' : 'Alle einblenden'}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
