import { createParser } from "nuqs/server";
import { z } from "zod";

import { dataTableConfig } from "@/components/data-table-server/config/data-table";

import type {
  ExtendedColumnFilter,
  ExtendedColumnSort,
} from "@/components/data-table-server/types/data-table";
import { Prisma } from "@/generated/prisma";

type EinsatzWhereKey = keyof Prisma.einsatzWhereInput;
type EinsatzMultiRelational = ["categories"];
export type EinsatzFilterableKey = EinsatzWhereKey | EinsatzMultiRelational;

const validEinsatzWhereKeys: EinsatzWhereKey[] = [
  "id",
  "title",
  "created_at",
  "updated_at",
  "start",
  "participant_count",
  "price_per_person",
  "total_price",
  "org_id",
  "created_by",
  "template_id",
  "all_day",
  "end",
  "helpers_needed",
  "status_id",
  "change_log",
  "user",
  "organization",
  "einsatz_status",
  "einsatz_template",
  "einsatz_comment",
  "einsatz_field",
  "einsatz_helper",
] as const;

// Converts ExtendedColumnFilter[] to a Prisma where clause
export function extendedColumnFiltersToWhere<TData>(filters: ExtendedColumnFilter<TData>[]): Partial<Prisma.einsatzWhereInput> {
  const where: Partial<Prisma.einsatzWhereInput> = {};
  filters.forEach((filter) => {
    const { id, value, variant, operator } = filter;
    if (!(id in where)) return;
    if (value == null || value === "" || (Array.isArray(value) && value.length === 0)) return;
    switch (variant) {
      case "text":
        where[id] = { contains: value, mode: "insensitive" };
        break;
      case "multiSelect":
        if (Array.isArray(value)) {
          // For status, template, etc. (comma-separated IDs)
          where[id] = { in: value.flatMap((v: string) => v.split(",")) };
        }
        break;
      case "boolean":
        where[id] = value;
        break;
      case "range":
      case "number":
        if (typeof value === "number" || typeof value === "string") {
          const num = Number(value);
          if (!Number.isNaN(num)) {
            where[id] = operator === "gte" ? { gte: num } : operator === "lte" ? { lte: num } : num;
          }
        }
        break;
      case "dateRange":
        if (Array.isArray(value)) {
          const [fromTs, toTs] = (value as string[]).map((v) => {
            const num = Number(v);
            return Number.isNaN(num) ? undefined : num;
          }) as (number | undefined)[];
          if (fromTs && toTs) {
            where[id] = { gte: new Date(fromTs), lte: new Date(toTs + 86400000) }; // add 1 day to end date
          } else if (fromTs) {
            where[id] = { gte: new Date(fromTs) };
          } else if (toTs) {
            where[id] = { lte: new Date(toTs) };
          }
        }
        break;
      default:
        where[id] = value;
        break;
    }
  });
  return where;
}

const sortingItemSchema = z.object({
  id: z.string(),
  desc: z.boolean(),
});

export const getSortingStateParser = <TData>(
  columnIds?: string[] | Set<string>,
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
          item.id === b[index]?.id && item.desc === b[index]?.desc,
      ),
  });
};

const filterItemSchema = z.object({
  id: z.string(),
  value: z.union([z.string(), z.array(z.string()), z.boolean()]),
  variant: z.enum(dataTableConfig.filterVariants),
  operator: z.enum(dataTableConfig.operators),
  filterId: z.string(),
});

export type FilterItemSchema = z.infer<typeof filterItemSchema>;

export const getFiltersStateParser = <TData>(
  columnIds?: string[] | Set<string>,
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
          filter.operator === b[index]?.operator,
      ),
  });
};
