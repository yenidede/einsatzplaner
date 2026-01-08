'use client';

import type { Column, Table } from '@tanstack/react-table';
import { CalendarIcon, Check, Plus, X } from 'lucide-react';
import { useQueryState } from 'nuqs';
import * as React from 'react';

import { DataTableRangeFilter } from '@/components/data-table/components/data-table-range-filter';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import { Input } from '@/components/ui/input';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDebouncedCallback } from '@/hooks/use-debounced-callback';
import {
  getDefaultFilterOperator,
  getFilterOperators,
} from '../lib/data-table';
import { formatDate } from '../lib/format';
import { generateId } from '@/components/data-table/lib/id';
import { getFiltersStateParser } from '@/components/data-table/lib/parsers';
import { cn } from '@/lib/utils';
import type {
  ExtendedColumnFilter,
  FilterOperator,
} from '@/components/data-table/types/data-table';
import TooltipCustom from '@/components/tooltip-custom';

export const FILTERS_KEY = 'filters';
const DEBOUNCE_MS = 300;
const THROTTLE_MS = 50;
const OPEN_MENU_SHORTCUT = 'f';
const REMOVE_FILTER_SHORTCUTS = ['backspace', 'delete'];

interface DataTableFilterMenuProps<TData> extends React.ComponentProps<
  typeof PopoverContent
> {
  table: Table<TData>;
  debounceMs?: number;
  throttleMs?: number;
  shallow?: boolean;
  isLoading: boolean;
  setPageCount: React.Dispatch<React.SetStateAction<number>>;
}

export function DataTableFilterMenu<TData>({
  table,
  debounceMs = DEBOUNCE_MS,
  throttleMs = THROTTLE_MS,
  shallow = true,
  align = 'start',
  setPageCount,
  isLoading,
  ...props
}: DataTableFilterMenuProps<TData>) {
  const id = React.useId();

  const columns = React.useMemo(() => {
    return table
      .getAllColumns()
      .filter((column) => column.columnDef.enableColumnFilter);
  }, [table]);

  const [open, setOpen] = React.useState(false);
  const [selectedColumn, setSelectedColumn] =
    React.useState<Column<TData> | null>(null);
  const [inputValue, setInputValue] = React.useState('');
  const triggerRef = React.useRef<HTMLButtonElement>(null);
  const inputRef = React.useRef<HTMLInputElement>(null);

  const recalculatePageCount = React.useCallback(() => {
    const totalPages = Math.ceil(
      table.getFilteredRowModel().rows.length /
        table.getState().pagination.pageSize
    );
    setPageCount(totalPages);
    table.setPageIndex(0);
  }, [table]);

  const onOpenChange = React.useCallback((open: boolean) => {
    setOpen(open);

    if (!open) {
      setTimeout(() => {
        setSelectedColumn(null);
        setInputValue('');
      }, 100);
    }
  }, []);

  const onInputKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLInputElement>) => {
      if (
        REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase()) &&
        !inputValue &&
        selectedColumn
      ) {
        event.preventDefault();
        setSelectedColumn(null);
      }
    },
    [inputValue, selectedColumn]
  );

  const [filters, setFilters] = useQueryState(
    FILTERS_KEY,
    getFiltersStateParser<TData>(columns.map((field) => field.id))
      .withDefault([])
      .withOptions({
        clearOnDefault: true,
        shallow,
        throttleMs,
      })
  );
  const debouncedSetFilters = useDebouncedCallback(setFilters, debounceMs);

  // Recalculate when filters or data changed (e.g. reload)
  React.useEffect(() => {
    recalculatePageCount();
  }, [filters, table, table.getRowModel()]);

  const onFilterAdd = React.useCallback(
    (column: Column<TData>, value: string | string[]) => {
      // Support array of strings for dateRange and multiSelect
      let filterValue: string | string[];
      if (Array.isArray(value)) {
        filterValue = value;
      } else if (column.columnDef.meta?.variant === 'multiSelect') {
        filterValue = [value];
      } else {
        filterValue = value;
      }

      // For string values, check for empty string
      if (
        typeof filterValue === 'string' &&
        !filterValue.trim() &&
        column.columnDef.meta?.variant !== 'boolean'
      ) {
        return;
      }

      const newFilter: ExtendedColumnFilter<TData> = {
        id: column.id as Extract<keyof TData, string>,
        value: filterValue,
        variant: column.columnDef.meta?.variant ?? 'text',
        operator: getDefaultFilterOperator(
          column.columnDef.meta?.variant ?? 'text'
        ),
        filterId: generateId({ length: 8 }),
      };

      debouncedSetFilters([...filters, newFilter]);
      setOpen(false);

      setTimeout(() => {
        setSelectedColumn(null);
        setInputValue('');
      }, 100);
    },
    [filters, debouncedSetFilters]
  );

  const onFilterRemove = React.useCallback(
    (filterId: string) => {
      const updatedFilters = filters.filter(
        (filter) => filter.filterId !== filterId
      );
      debouncedSetFilters(updatedFilters);
      requestAnimationFrame(() => {
        triggerRef.current?.focus();
      });
    },
    [filters, debouncedSetFilters]
  );

  const onFilterUpdate = React.useCallback(
    (
      filterId: string,
      updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>
    ) => {
      debouncedSetFilters((prevFilters) => {
        const updatedFilters = prevFilters.map((filter) => {
          if (filter.filterId === filterId) {
            return { ...filter, ...updates } as ExtendedColumnFilter<TData>;
          }
          return filter;
        });
        return updatedFilters;
      });
    },
    [debouncedSetFilters]
  );

  const onFiltersReset = React.useCallback(() => {
    debouncedSetFilters([]);
  }, [debouncedSetFilters]);

  React.useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (
        event.target instanceof HTMLInputElement ||
        event.target instanceof HTMLTextAreaElement
      ) {
        return;
      }

      if (
        event.key.toLowerCase() === OPEN_MENU_SHORTCUT &&
        !event.ctrlKey &&
        !event.metaKey &&
        !event.shiftKey
      ) {
        event.preventDefault();
        setOpen(true);
      }

      if (
        event.key.toLowerCase() === OPEN_MENU_SHORTCUT &&
        event.shiftKey &&
        !open &&
        filters.length > 0
      ) {
        event.preventDefault();
        onFilterRemove(filters[filters.length - 1]?.filterId ?? '');
      }
    }

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, filters, onFilterRemove]);

  const onTriggerKeyDown = React.useCallback(
    (event: React.KeyboardEvent<HTMLButtonElement>) => {
      if (
        REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase()) &&
        filters.length > 0
      ) {
        event.preventDefault();
        onFilterRemove(filters[filters.length - 1]?.filterId ?? '');
      }
    },
    [filters, onFilterRemove]
  );

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <DataTableFilterItem
          key={filter.filterId}
          filter={filter}
          filterItemId={`${id}-filter-${filter.filterId}`}
          columns={columns}
          onFilterUpdate={onFilterUpdate}
          onFilterRemove={onFilterRemove}
        />
      ))}
      <Popover open={open} onOpenChange={onOpenChange}>
        <PopoverTrigger tooltip="Filtermenü öffnen" asChild>
          <Button
            aria-label="Filtermenü öffnen"
            variant="outline"
            size={filters.length > 0 ? 'icon' : 'sm'}
            className={cn(filters.length > 0 && 'size-8', 'h-8')}
            ref={triggerRef}
            onKeyDown={onTriggerKeyDown}
          >
            <Plus />
            {filters.length > 0 ? null : 'Filter'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          align={align}
          className="w-full max-w-(--radix-popover-content-available-width) origin-(--radix-popover-content-transform-origin) p-0"
          {...props}
        >
          <Command loop className="[&_[cmdk-input-wrapper]_svg]:hidden">
            <CommandInput
              ref={inputRef}
              placeholder={
                selectedColumn
                  ? (selectedColumn.columnDef.meta?.label ?? selectedColumn.id)
                  : 'Felder durchsuchen...'
              }
              value={inputValue}
              onValueChange={setInputValue}
              onKeyDown={onInputKeyDown}
            />
            <CommandList>
              {selectedColumn ? (
                <>
                  {selectedColumn.columnDef.meta?.options && (
                    <CommandEmpty>Keine Optionen gefunden.</CommandEmpty>
                  )}
                  <FilterValueSelector
                    column={selectedColumn}
                    value={inputValue}
                    onSelect={(value) => onFilterAdd(selectedColumn, value)}
                  />
                </>
              ) : (
                <>
                  <CommandEmpty>Keine Optionen gefunden.</CommandEmpty>
                  <CommandGroup>
                    {columns
                      .filter(
                        (column) =>
                          !filters.some((filter) => filter.id === column.id)
                      )
                      .map((column) => (
                        <CommandItem
                          key={column.id}
                          value={column.id}
                          onSelect={() => {
                            setSelectedColumn(column);
                            setInputValue('');
                            requestAnimationFrame(() => {
                              inputRef.current?.focus();
                            });
                          }}
                        >
                          {column.columnDef.meta?.icon && (
                            <column.columnDef.meta.icon />
                          )}
                          <span className="truncate">
                            {column.columnDef.meta?.label ?? column.id}
                          </span>
                        </CommandItem>
                      ))}
                  </CommandGroup>
                </>
              )}
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>
      {filters.length > 0 && (
        <TooltipCustom text="Alle Filter zurücksetzen">
          <Button
            aria-label="Alle Filter zurücksetzen"
            variant="outline"
            size="icon"
            className="size-8"
            onClick={onFiltersReset}
          >
            <X />
          </Button>
        </TooltipCustom>
      )}
    </div>
  );
}

interface DataTableFilterItemProps<TData> {
  filter: ExtendedColumnFilter<TData>;
  filterItemId: string;
  columns: Column<TData>[];
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>
  ) => void;
  onFilterRemove: (filterId: string) => void;
}

function DataTableFilterItem<TData>({
  filter,
  filterItemId,
  columns,
  onFilterUpdate,
  onFilterRemove,
}: DataTableFilterItemProps<TData>) {
  {
    const [showFieldSelector, setShowFieldSelector] = React.useState(false);
    const [showOperatorSelector, setShowOperatorSelector] =
      React.useState(false);
    const [showValueSelector, setShowValueSelector] = React.useState(false);

    const column = columns.find((column) => column.id === filter.id);

    const operatorListboxId = `${filterItemId}-operator-listbox`;
    const inputId = `${filterItemId}-input`;

    const columnMeta = column?.columnDef.meta;
    const filterOperators = getFilterOperators(filter.variant);

    const onItemKeyDown = React.useCallback(
      (event: React.KeyboardEvent<HTMLDivElement>) => {
        if (
          event.target instanceof HTMLInputElement ||
          event.target instanceof HTMLTextAreaElement
        ) {
          return;
        }

        if (showFieldSelector || showOperatorSelector || showValueSelector) {
          return;
        }

        if (REMOVE_FILTER_SHORTCUTS.includes(event.key.toLowerCase())) {
          event.preventDefault();
          onFilterRemove(filter.filterId);
        }
      },
      [
        filter.filterId,
        showFieldSelector,
        showOperatorSelector,
        showValueSelector,
        onFilterRemove,
      ]
    );

    if (!column) return null;

    return (
      <div
        key={filter.filterId}
        role="listitem"
        id={filterItemId}
        className="bg-background flex h-8 items-center rounded-md"
        onKeyDown={onItemKeyDown}
      >
        <Popover open={showFieldSelector} onOpenChange={setShowFieldSelector}>
          <PopoverTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="dark:bg-input/30 rounded-none rounded-l-md border border-r-0 font-normal"
            >
              {columnMeta?.icon && (
                <columnMeta.icon className="text-muted-foreground" />
              )}
              {columnMeta?.label ?? column.id}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-48 origin-(--radix-popover-content-transform-origin) p-0"
          >
            <Command loop>
              <CommandInput placeholder="Optionen durchsuchen..." />
              <CommandList>
                <CommandEmpty>Keine Optionen gefunden.</CommandEmpty>
                <CommandGroup>
                  {columns.map((column) => (
                    <CommandItem
                      key={column.id}
                      value={column.id}
                      onSelect={() => {
                        onFilterUpdate(filter.filterId, {
                          id: column.id as Extract<keyof TData, string>,
                          variant: column.columnDef.meta?.variant ?? 'text',
                          operator: getDefaultFilterOperator(
                            column.columnDef.meta?.variant ?? 'text'
                          ),
                          value: '',
                        });

                        setShowFieldSelector(false);
                      }}
                    >
                      {column.columnDef.meta?.icon && (
                        <column.columnDef.meta.icon />
                      )}
                      <span className="truncate">
                        {column.columnDef.meta?.label ?? column.id}
                      </span>
                      <Check
                        className={cn(
                          'ml-auto',
                          column.id === filter.id ? 'opacity-100' : 'opacity-0'
                        )}
                      />
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
        <Select
          open={showOperatorSelector}
          onOpenChange={setShowOperatorSelector}
          value={filter.operator}
          onValueChange={(value: FilterOperator) =>
            onFilterUpdate(filter.filterId, {
              operator: value,
              value:
                value === 'isEmpty' || value === 'isNotEmpty'
                  ? ''
                  : filter.value,
            })
          }
        >
          <SelectTrigger
            aria-controls={operatorListboxId}
            className="h-8 rounded-none border-r-0 px-2.5 lowercase data-size:h-8 [&_svg]:hidden"
          >
            <SelectValue placeholder={filter.operator} />
          </SelectTrigger>
          <SelectContent
            id={operatorListboxId}
            className="origin-(--radix-select-content-transform-origin)"
          >
            {filterOperators.map((operator) => (
              <SelectItem
                key={operator.value}
                className="lowercase"
                value={operator.value}
              >
                {operator.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {onFilterInputRender({
          filter,
          column,
          inputId,
          onFilterUpdate,
          showValueSelector,
          setShowValueSelector,
        })}
        <TooltipCustom text="Filter entfernen">
          <Button
            aria-controls={filterItemId}
            variant="ghost"
            size="sm"
            className="dark:bg-input/30 h-full rounded-none rounded-r-md border border-l-0 px-1.5 font-normal"
            onClick={() => onFilterRemove(filter.filterId)}
          >
            <X className="size-3.5" />
          </Button>
        </TooltipCustom>
      </div>
    );
  }
}

interface FilterValueSelectorProps<TData> {
  column: Column<TData>;
  value: string;
  onSelect: (value: string | string[]) => void;
}

function FilterValueSelector<TData>({
  column,
  value,
  onSelect,
}: FilterValueSelectorProps<TData>) {
  const variant = column.columnDef.meta?.variant ?? 'text';

  switch (variant) {
    case 'boolean':
      return (
        <CommandGroup>
          <CommandItem value="true" onSelect={() => onSelect('true')}>
            True
          </CommandItem>
          <CommandItem value="false" onSelect={() => onSelect('false')}>
            False
          </CommandItem>
        </CommandGroup>
      );

    case 'select':
    case 'multiSelect':
      return (
        <CommandGroup>
          {column.columnDef.meta?.options?.map((option) => (
            <CommandItem
              key={option.value}
              value={option.value}
              onSelect={() => onSelect(option.value)}
            >
              {option.icon && <option.icon />}
              <span className="truncate">{option.label}</span>
              {option.count && (
                <span className="ml-auto font-mono text-xs">
                  {option.count}
                </span>
              )}
            </CommandItem>
          ))}
        </CommandGroup>
      );

    case 'date':
      // case "dateRange":
      return (
        <Calendar
          autoFocus
          mode="single"
          selected={value ? new Date(value) : undefined}
          onSelect={(date) => onSelect(date?.getTime().toString() ?? '')}
        />
      );
    case 'dateRange': {
      // Support picking both min and max before closing
      const [range, setRange] = React.useState<
        { from?: Date; to?: Date } | undefined
      >(undefined);
      return (
        <Calendar
          autoFocus
          mode="range"
          selected={{ from: range?.from, to: range?.to }}
          onSelect={(date: { from?: Date; to?: Date } | undefined) => {
            setRange(date);
            if (date?.from && date?.to && date.from < date.to) {
              onSelect([
                date.from?.getTime().toString(),
                date.to?.getTime().toString(),
              ]);
            }
          }}
        />
      );
    }

    default: {
      const isEmpty = !value.trim();

      return (
        <CommandGroup>
          <CommandItem
            value={value}
            onSelect={() => onSelect(value)}
            disabled={isEmpty}
          >
            {isEmpty ? (
              <>
                <span>Text eingeben...</span>
              </>
            ) : (
              <>
                <span className="truncate">Beinhaltet &quot;{value}&quot;</span>
              </>
            )}
          </CommandItem>
        </CommandGroup>
      );
    }
  }
}

function onFilterInputRender<TData>({
  filter,
  column,
  inputId,
  onFilterUpdate,
  showValueSelector,
  setShowValueSelector,
}: {
  filter: ExtendedColumnFilter<TData>;
  column: Column<TData>;
  inputId: string;
  onFilterUpdate: (
    filterId: string,
    updates: Partial<Omit<ExtendedColumnFilter<TData>, 'filterId'>>
  ) => void;
  showValueSelector: boolean;
  setShowValueSelector: (value: boolean) => void;
}) {
  if (filter.operator === 'isEmpty' || filter.operator === 'isNotEmpty') {
    return (
      <div
        id={inputId}
        role="status"
        aria-label={`${column.columnDef.meta?.label} filter ist ${
          filter.operator === 'isEmpty' ? 'empty' : 'not empty'
        }`}
        aria-live="polite"
        className="text-muted-foreground dark:bg-input/30 h-full w-16 rounded-none border bg-transparent px-1.5 py-0.5"
      />
    );
  }

  switch (filter.variant) {
    case 'text':
    case 'number':
    case 'range': {
      if (
        (filter.variant === 'range' && filter.operator === 'isBetween') ||
        filter.operator === 'isBetween' ||
        filter.operator === 'dateIsBetween'
      ) {
        return (
          <DataTableRangeFilter
            filter={filter}
            column={column}
            inputId={inputId}
            onFilterUpdate={onFilterUpdate}
            className="size-full max-w-28 gap-0 **:data-[slot='range-min']:border-r-0 [&_input]:rounded-none [&_input]:px-1.5"
          />
        );
      }

      const isNumber =
        filter.variant === 'number' || filter.variant === 'range';

      return (
        <Input
          id={inputId}
          type={isNumber ? 'number' : 'text'}
          inputMode={isNumber ? 'numeric' : undefined}
          placeholder={column.columnDef.meta?.placeholder ?? 'Wert eingeben...'}
          className="h-full w-24 rounded-none px-1.5"
          defaultValue={typeof filter.value === 'string' ? filter.value : ''}
          onChange={(event) =>
            onFilterUpdate(filter.filterId, { value: event.target.value })
          }
        />
      );
    }

    case 'boolean': {
      const inputListboxId = `${inputId}-listbox`;

      return (
        <Select
          open={showValueSelector}
          onOpenChange={setShowValueSelector}
          value={typeof filter.value === 'string' ? filter.value : 'true'}
          onValueChange={(value: 'true' | 'false') =>
            onFilterUpdate(filter.filterId, { value })
          }
        >
          <SelectTrigger
            id={inputId}
            aria-controls={inputListboxId}
            className="rounded-none bg-transparent px-1.5 py-0.5 [&_svg]:hidden"
          >
            <SelectValue placeholder={filter.value ? 'True' : 'False'} />
          </SelectTrigger>
          <SelectContent id={inputListboxId}>
            <SelectItem value="true">Ja</SelectItem>
            <SelectItem value="false">Nein</SelectItem>
          </SelectContent>
        </Select>
      );
    }

    case 'select':
    case 'multiSelect': {
      const inputListboxId = `${inputId}-listbox`;

      const options = column.columnDef.meta?.options ?? [];
      const selectedValues = Array.isArray(filter.value)
        ? filter.value
        : [filter.value];

      const selectedOptions = options.filter((option) =>
        selectedValues.includes(option.value)
      );

      return (
        <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              aria-controls={inputListboxId}
              variant="ghost"
              size="sm"
              className="dark:bg-input/30 h-full min-w-16 rounded-none border px-1.5 font-normal"
            >
              {selectedOptions.length === 0 ? (
                filter.variant === 'multiSelect' ? (
                  'auswählen...'
                ) : (
                  'auswählen...'
                )
              ) : (
                <>
                  <div className="flex items-center -space-x-2 rtl:space-x-reverse">
                    {selectedOptions.map((selectedOption) =>
                      selectedOption.icon ? (
                        <div
                          key={selectedOption.value}
                          className="bg-background rounded-full border p-0.5"
                        >
                          <selectedOption.icon className="size-3.5" />
                        </div>
                      ) : null
                    )}
                  </div>
                  <span className="truncate">
                    {selectedOptions.length > 1
                      ? `${selectedOptions.length} ausgewählt`
                      : selectedOptions[0]?.label}
                  </span>
                </>
              )}
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={inputListboxId}
            align="start"
            className="w-48 origin-(--radix-popover-content-transform-origin) p-0"
          >
            <Command>
              <CommandInput placeholder="Optionen durchsuchen..." />
              <CommandList>
                <CommandEmpty>Keine Optionen gefunden.</CommandEmpty>
                <CommandGroup>
                  {options.map((option) => (
                    <CommandItem
                      key={option.value}
                      value={option.value}
                      onSelect={() => {
                        const value =
                          filter.variant === 'multiSelect'
                            ? selectedValues.includes(option.value)
                              ? selectedValues.filter((v) => v !== option.value)
                              : [...selectedValues, option.value]
                            : option.value;
                        onFilterUpdate(filter.filterId, { value });
                      }}
                    >
                      {option.icon && <option.icon />}
                      <span className="truncate">{option.label}</span>
                      {filter.variant === 'multiSelect' && (
                        <Check
                          className={cn(
                            'ml-auto',
                            selectedValues.includes(option.value)
                              ? 'opacity-100'
                              : 'opacity-0'
                          )}
                        />
                      )}
                    </CommandItem>
                  ))}
                </CommandGroup>
              </CommandList>
            </Command>
          </PopoverContent>
        </Popover>
      );
    }

    case 'date':
    case 'dateRange': {
      const inputListboxId = `${inputId}-listbox`;

      const dateValue = Array.isArray(filter.value)
        ? filter.value.filter(Boolean)
        : [filter.value, filter.value].filter(Boolean);

      const displayValue =
        filter.operator === 'dateIsBetween' && dateValue.length === 2
          ? `${formatDate(new Date(Number(dateValue[0])))} - ${formatDate(
              new Date(Number(dateValue[1]))
            )}`
          : dateValue[0]
            ? formatDate(new Date(Number(dateValue[0])))
            : 'Datum wählen...';

      return (
        <Popover open={showValueSelector} onOpenChange={setShowValueSelector}>
          <PopoverTrigger asChild>
            <Button
              id={inputId}
              aria-controls={inputListboxId}
              variant="ghost"
              size="sm"
              className={cn(
                'dark:bg-input/30 h-full rounded-none border px-1.5 font-normal',
                !filter.value && 'text-muted-foreground'
              )}
            >
              <CalendarIcon className="size-3.5" />
              <span className="truncate">{displayValue}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            id={inputListboxId}
            align="start"
            className="w-auto origin-(--radix-popover-content-transform-origin) p-0"
          >
            {filter.operator === 'dateIsBetween' ? (
              <Calendar
                mode="range"
                autoFocus
                selected={
                  dateValue.length === 2
                    ? {
                        from: new Date(Number(dateValue[0])),
                        to: new Date(Number(dateValue[1])),
                      }
                    : {
                        from: new Date(),
                        to: new Date(),
                      }
                }
                onSelect={(date) => {
                  onFilterUpdate(filter.filterId, {
                    value: date
                      ? [
                          (date.from?.getTime() ?? '').toString(),
                          (date.to?.getTime() ?? '').toString(),
                        ]
                      : [],
                  });
                }}
              />
            ) : (
              <Calendar
                mode="single"
                autoFocus
                selected={
                  dateValue[0] ? new Date(Number(dateValue[0])) : undefined
                }
                onSelect={(date) => {
                  onFilterUpdate(filter.filterId, {
                    value: (date?.getTime() ?? '').toString(),
                  });
                }}
              />
            )}
          </PopoverContent>
        </Popover>
      );
    }

    default:
      return null;
  }
}
