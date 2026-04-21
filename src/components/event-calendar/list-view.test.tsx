/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListView } from './list-view';

type QueryFilter = {
  id: string;
  value: string | string[];
  variant: 'text' | 'range' | 'dateRange' | 'select' | 'multiSelect';
  operator: string;
  filterId: string;
};

const mockUseDataTable = vi.fn();
const mockTable = {
  getFilteredSelectedRowModel: () => ({ rows: [] }),
  resetRowSelection: vi.fn(),
};
let rawFilters: QueryFilter[] = [];
let activeOrgId: string | null = 'org-1';
let organizationsData:
  | {
      id: string;
      name: string;
    }[]
  | undefined = [
  { id: 'org-1', name: 'Erste Organisation' },
  { id: 'org-2', name: 'Zweite Organisation' },
];
const mockSetRawFilters = vi.fn(
  (
    nextFilters:
      | QueryFilter[]
      | ((previousFilters: QueryFilter[]) => QueryFilter[])
  ) => {
    rawFilters =
      typeof nextFilters === 'function'
        ? nextFilters(rawFilters)
        : nextFilters;

    return Promise.resolve(rawFilters);
  }
);

vi.mock('@/components/data-table/hooks/use-data-table', () => ({
  useDataTable: (...args: unknown[]) => mockUseDataTable(...args),
}));

vi.mock('nuqs', () => ({
  useQueryState: () => [rawFilters, mockSetRawFilters],
}));

vi.mock('@/components/data-table/components/data-table', () => ({
  DataTable: ({
    children,
    actionBar,
  }: {
    children?: ReactNode;
    actionBar?: ReactNode;
  }) => (
    <div>
      {actionBar}
      {children}
    </div>
  ),
}));

vi.mock('@/components/data-table/components/data-table-advanced-toolbar', () => ({
  DataTableAdvancedToolbar: ({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  ),
}));

vi.mock('@/components/data-table/components/data-table-filter-menu', () => ({
  FILTERS_KEY: 'filters',
  DataTableFilterMenu: () => null,
}));

vi.mock('@/components/data-table/components/data-table-sort-list', () => ({
  DataTableSortList: () => null,
}));

vi.mock('./ListViewCsvExport', () => ({
  ListViewCsvExport: () => null,
}));

vi.mock('../tooltip-custom', () => ({
  default: ({ children }: { children?: ReactNode }) => <>{children}</>,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        orgIds: ['org-1', 'org-2'],
        activeOrganization: activeOrgId
          ? { id: activeOrgId }
          : null,
      },
    },
    status: 'authenticated',
  }),
}));

vi.mock('@/hooks/use-confirm-dialog', () => ({
  useConfirmDialog: () => ({
    showDestructive: vi.fn(),
  }),
}));

vi.mock('@/hooks/use-organization-terminology', () => ({
  useOrganizationTerminology: () => ({
    einsatz_singular: 'Einsatz',
    einsatz_plural: 'Einsätze',
    helper_plural: 'Helfer',
  }),
}));

vi.mock('@/features/organization/hooks/use-organization-queries', () => ({
  useOrganizations: () => ({
    data: organizationsData,
  }),
}));

vi.mock('@/features/einsatz/hooks/useEinsatzQueries', () => ({
  useEinsaetzeTableView: () => ({
    data: [],
    isLoading: false,
    isFetched: true,
  }),
  useCategoriesByOrgIds: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/features/einsatz_status/hooks/useStatuses', () => ({
  useStatuses: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/features/template/hooks/use-template-queries', () => ({
  useTemplatesByOrgIds: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/features/user/hooks/use-user-queries', () => ({
  useUsersByOrgIds: () => ({
    data: [],
    isLoading: false,
  }),
}));

vi.mock('@/components/event-calendar/save-state-messages', () => ({
  getSavingToastMessage: () => 'Toast',
  getSavingTooltipText: () => 'Tooltip',
}));

describe('ListView', () => {
  beforeEach(() => {
    mockUseDataTable.mockReset();
    mockUseDataTable.mockReturnValue({ table: mockTable });
    mockSetRawFilters.mockReset();
    mockSetRawFilters.mockImplementation(
      (
        nextFilters:
          | QueryFilter[]
          | ((previousFilters: QueryFilter[]) => QueryFilter[])
      ) => {
        rawFilters =
          typeof nextFilters === 'function'
            ? nextFilters(rawFilters)
            : nextFilters;

        return Promise.resolve(rawFilters);
      }
    );
    mockTable.resetRowSelection.mockReset();
    rawFilters = [];
    activeOrgId = 'org-1';
    organizationsData = [
      { id: 'org-1', name: 'Erste Organisation' },
      { id: 'org-2', name: 'Zweite Organisation' },
    ];
  });

  it('setzt die aktive Organisation als Standardfilter und versteckt org_id', async () => {
    render(
      <ListView
        onEventEdit={vi.fn()}
        onEventCreate={vi.fn()}
        onEventDelete={vi.fn()}
        onMultiEventDelete={vi.fn().mockResolvedValue(undefined)}
        mode="verwaltung"
      />
    );

    await waitFor(() => {
      expect(mockSetRawFilters).toHaveBeenCalledTimes(1);
    });

    const options = mockUseDataTable.mock.calls.at(-1)?.[0];

    expect(mockSetRawFilters).toHaveBeenCalledWith([
      {
        id: 'org_id',
        value: ['org-1'],
        variant: 'multiSelect',
        operator: 'inArray',
        filterId: 'active-org-org-1',
      },
    ]);

    expect(options.initialState.columnVisibility).toEqual({
      org_id: false,
    });
    expect(
      options.columns.some((column: { id?: string }) => column.id === 'org_id')
    ).toBe(true);
  });

  it('reapplies the default org filter after an active org switch', async () => {
    const { rerender } = render(
      <ListView
        onEventEdit={vi.fn()}
        onEventCreate={vi.fn()}
        onEventDelete={vi.fn()}
        onMultiEventDelete={vi.fn().mockResolvedValue(undefined)}
        mode="verwaltung"
      />
    );

    await waitFor(() => {
      expect(mockSetRawFilters).toHaveBeenCalledWith([
        {
          id: 'org_id',
          value: ['org-1'],
          variant: 'multiSelect',
          operator: 'inArray',
          filterId: 'active-org-org-1',
        },
      ]);
    });

    activeOrgId = 'org-2';
    rerender(
      <ListView
        onEventEdit={vi.fn()}
        onEventCreate={vi.fn()}
        onEventDelete={vi.fn()}
        onMultiEventDelete={vi.fn().mockResolvedValue(undefined)}
        mode="verwaltung"
      />
    );

    await waitFor(() => {
      expect(mockSetRawFilters).toHaveBeenCalledWith([
        {
          id: 'org_id',
          value: ['org-2'],
          variant: 'multiSelect',
          operator: 'inArray',
          filterId: 'active-org-org-2',
        },
      ]);
    });
  });

  it('builds org options safely while organizations are still loading', () => {
    organizationsData = undefined;

    render(
      <ListView
        onEventEdit={vi.fn()}
        onEventCreate={vi.fn()}
        onEventDelete={vi.fn()}
        onMultiEventDelete={vi.fn().mockResolvedValue(undefined)}
        mode="verwaltung"
      />
    );

    const options = mockUseDataTable.mock.calls.at(-1)?.[0];
    const orgColumn = options.columns.find(
      (column: { id?: string; meta?: { options?: Array<{ value: string }> } }) =>
        column.id === 'org_id'
    );

    expect(orgColumn?.meta?.options).toEqual([]);
  });
});
