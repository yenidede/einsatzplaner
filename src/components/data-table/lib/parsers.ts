import { useUrlFilters } from './use-url-filters';

import { createParser } from 'nuqs/server';
import { z } from 'zod';

import { dataTableConfig } from '@/components/data-table/config/data-table';

import type {
  ExtendedColumnFilter,
  ExtendedColumnSort,
} from '@/components/data-table/types/data-table';

const sortingItemSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

export const getSortingStateParser = <TData>(
  columnIds?: string[] | Set<string>
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  return createParser({
    parse: (value) => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(sortingItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (validKeys && result.data.some((item) => !validKeys.has(item.id))) {
          return null;
        }

        return result.data as ExtendedColumnSort<TData>[];
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length &&
      a.every(
        (item, index) =>
          item.id === b[index]?.id && item.desc === b[index]?.desc
      ),
  });
};

export const filterItemSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.array(z.string())]),
  variant: z.enum(dataTableConfig.filterVariants),
  operator: z.enum(dataTableConfig.operators),
  filterId: z.string(),
});

export type FilterItemSchema = z.infer<typeof filterItemSchema>;

export const getFiltersStateParser = <TData>(
  columnIds?: string[] | Set<string>
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  return createParser({
    parse: (value) => {
      try {
        const parsed = JSON.parse(value);
        const result = z.array(filterItemSchema).safeParse(parsed);

        if (!result.success) return null;

        if (validKeys && result.data.some((item) => !validKeys.has(item.id))) {
          return null;
        }

        return result.data as ExtendedColumnFilter<TData>[];
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length &&
      a.every(
        (filter, index) =>
          filter.id === b[index]?.id &&
          filter.value === b[index]?.value &&
          filter.variant === b[index]?.variant &&
          filter.operator === b[index]?.operator
      ),
  });
};

const columnFilterSchema = z.object({
  id: z.string().nonempty(), // eg. "status"
  value: z.object({
    value: z.union([z.string(), z.array(z.string())]).nullable(),
    operator: z.enum(dataTableConfig.operators),
  }),
});

export type ColumnFilterSchema = z.infer<typeof columnFilterSchema>;

export const getColumnFiltersParser = <TData>(
  columnIds?: string[] | Set<string>
) => {
  const validKeys = columnIds
    ? columnIds instanceof Set
      ? columnIds
      : new Set(columnIds)
    : null;

  return createParser({
    parse: (value) => {
      try {
        const parsed = JSON.parse(value);

        const mapped = z.array(filterItemSchema).safeParse(parsed);
        if (!mapped.success) {
          throw new Error('Invalid filter state', { cause: mapped.error });
        }

        const result = mapped.data.map((i) => {
          return {
            id: i.id,
            value: {
              value: i.value,
              operator: i.operator,
            },
          };
        });

        if (!result || result.length <= 0)
          throw new Error('couldnt map filters');

        if (validKeys && result.some((item) => !validKeys.has(item.id))) {
          return null;
        }

        return result as ColumnFilterSchema[];
      } catch {
        return null;
      }
    },
    serialize: (value) => JSON.stringify(value),
    eq: (a, b) =>
      a.length === b.length &&
      a.every(
        (filter, index) =>
          filter.id === b[index]?.id &&
          filter.value.operator === b[index]?.value.operator &&
          filter.value.value === b[index]?.value.value
      ),
  });
};
