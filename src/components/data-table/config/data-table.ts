import '@tanstack/react-table';

// enables to filter by id and still eg. display the pretty fullname
declare module '@tanstack/react-table' {
  interface ColumnMeta<TData extends unknown, TValue> {
    filterField?: string;
    // add other custom meta fields here
  }
}

export type DataTableConfig = typeof dataTableConfig;

export const dataTableConfig = {
  textOperators: [
    { label: 'Beinhaltet', value: 'iLike' as const },
    { label: 'Beinhaltet nicht', value: 'notILike' as const },
    { label: 'Ist', value: 'eq' as const },
    { label: 'Ist nicht', value: 'ne' as const },
    { label: 'Ist leer', value: 'isEmpty' as const },
    { label: 'Ist nicht leer', value: 'isNotEmpty' as const },
  ],
  numericOperators: [
    { label: 'Ist', value: 'eq' as const },
    { label: 'Ist nicht', value: 'ne' as const },
    { label: 'Ist kleiner als', value: 'lt' as const },
    { label: 'Ist kleiner als oder gleich', value: 'lte' as const },
    { label: 'Ist größer als', value: 'gt' as const },
    { label: 'Ist größer als oder gleich', value: 'gte' as const },
    { label: 'Ist zwischen', value: 'isBetween' as const },
    { label: 'Ist leer', value: 'isEmpty' as const },
    { label: 'Ist nicht leer', value: 'isNotEmpty' as const },
  ],
  dateOperators: [
    { label: 'Ist zwischen', value: 'dateIsBetween' as const },
    { label: 'Ist', value: 'dateEq' as const },
    { label: 'Ist nicht', value: 'dateNe' as const },
    { label: 'Ist vor', value: 'dateLt' as const },
    { label: 'Ist nach', value: 'dateGt' as const },
    { label: 'Ist an oder vor', value: 'dateLte' as const },
    { label: 'Ist an oder nach', value: 'dateGte' as const },
    { label: 'Ist leer', value: 'isEmpty' as const },
    { label: 'Ist nicht leer', value: 'isNotEmpty' as const },
  ],
  selectOperators: [
    { label: 'Ist', value: 'eq' as const },
    { label: 'Ist nicht', value: 'ne' as const },
    { label: 'Ist leer', value: 'isEmpty' as const },
    { label: 'Ist nicht leer', value: 'isNotEmpty' as const },
  ],
  multiSelectOperators: [
    { label: 'Ist', value: 'inArray' as const },
    { label: 'Ist nicht', value: 'notInArray' as const },
    { label: 'Ist leer', value: 'isEmpty' as const },
    { label: 'Ist nicht leer', value: 'isNotEmpty' as const },
  ],
  booleanOperators: [
    { label: 'Ist', value: 'eq' as const },
    { label: 'Ist nicht', value: 'ne' as const },
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
