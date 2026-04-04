import '@tanstack/react-table';

// enables to filter by id and still eg. display the pretty fullname
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData, TValue> {
    filterField?: string;
    // add other custom meta fields here
  }
}

export type DataTableConfig = typeof dataTableConfig;

export const dataTableConfig = {
  textOperators: [
    { label: 'enthält', value: 'iLike' as const },
    { label: 'enthält nicht', value: 'notILike' as const },
    { label: 'ist', value: 'eq' as const },
    { label: 'ist nicht', value: 'ne' as const },
    { label: 'ist leer', value: 'isEmpty' as const },
    { label: 'ist nicht leer', value: 'isNotEmpty' as const },
  ],
  numericOperators: [
    { label: 'ist', value: 'eq' as const },
    { label: 'ist nicht', value: 'ne' as const },
    { label: 'ist kleiner als', value: 'lt' as const },
    { label: 'ist kleiner oder gleich', value: 'lte' as const },
    { label: 'ist größer als', value: 'gt' as const },
    { label: 'ist größer oder gleich', value: 'gte' as const },
    { label: 'ist zwischen', value: 'isBetween' as const },
    { label: 'ist leer', value: 'isEmpty' as const },
    { label: 'ist nicht leer', value: 'isNotEmpty' as const },
  ],
  dateOperators: [
    { label: 'ist zwischen', value: 'dateIsBetween' as const },
    { label: 'ist', value: 'dateEq' as const },
    { label: 'ist nicht', value: 'dateNe' as const },
    { label: 'ist vor', value: 'dateLt' as const },
    { label: 'ist nach', value: 'dateGt' as const },
    { label: 'ist am oder vor', value: 'dateLte' as const },
    { label: 'ist am oder nach', value: 'dateGte' as const },
    { label: 'ist leer', value: 'isEmpty' as const },
    { label: 'ist nicht leer', value: 'isNotEmpty' as const },
  ],
  selectOperators: [
    { label: 'ist', value: 'eq' as const },
    { label: 'ist nicht', value: 'ne' as const },
    { label: 'ist leer', value: 'isEmpty' as const },
    { label: 'ist nicht leer', value: 'isNotEmpty' as const },
  ],
  multiSelectOperators: [
    { label: 'enthält', value: 'inArray' as const },
    { label: 'enthält nicht', value: 'notInArray' as const },
    { label: 'ist leer', value: 'isEmpty' as const },
    { label: 'ist nicht leer', value: 'isNotEmpty' as const },
  ],
  booleanOperators: [
    { label: 'ist', value: 'eq' as const },
    { label: 'ist nicht', value: 'ne' as const },
  ],
  sortOrders: [
    { label: 'Aufsteigend', value: 'asc' as const },
    { label: 'Absteigend', value: 'desc' as const },
  ],
  filterVariants: [
    'text',
    'number',
    'range',
    'date',
    'dateRange',
    'boolean',
    'select',
    'multiSelect',
  ] as const,
  operators: [
    'iLike',
    'notILike',
    'eq',
    'ne',
    'inArray',
    'notInArray',
    'isEmpty',
    'isNotEmpty',
    'lt',
    'lte',
    'gt',
    'gte',
    'isBetween',
    'isRelativeToToday',
    'dateEq',
    'dateNe',
    'dateLt',
    'dateGt',
    'dateLte',
    'dateGte',
    'dateIsBetween',
  ] as const,
  joinOperators: ['and', 'or'] as const,
};

export type Operators = (typeof dataTableConfig)['operators'][number];
