/**
 * @vitest-environment jsdom
 */

import { render, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { ListView } from './list-view';

const mockUseDataTable = vi.fn();
const mockSetRawFilters = vi.fn();
const mockTable = {
  getFilteredSelectedRowModel: () => ({ rows: [] }),
  resetRowSelection: vi.fn(),
};

vi.mock('@/components/data-table/hooks/use-data-table', () => ({
  useDataTable: (...args: unknown[]) => mockUseDataTable(...args),
}));

vi.mock('nuqs', () => ({
  useQueryState: () => [[], mockSetRawFilters],
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
        activeOrganization: { id: 'org-1' },
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
    data: [
      { id: 'org-1', name: 'Erste Organisation' },
      { id: 'org-2', name: 'Zweite Organisation' },
    ],
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
    mockTable.resetRowSelection.mockReset();
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

    const options = mockUseDataTable.mock.calls[0][0];

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
});
