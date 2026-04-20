/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import type { ComponentProps } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OrganizationDefaultValues } from './OrganizationDefaultValues';

vi.mock('@/features/category/category-action', () => ({
  createCategoryAction: vi.fn(),
  updateCategoryAction: vi.fn(),
  deleteCategoryAction: vi.fn(),
}));

vi.mock('@/hooks/use-confirm-dialog', () => ({
  useConfirmDialog: () => ({
    showDestructive: vi.fn(),
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

function renderOrganizationDefaults(
  overrides?: Partial<ComponentProps<typeof OrganizationDefaultValues>>
) {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const baseProps: ComponentProps<typeof OrganizationDefaultValues> = {
    orgId: 'orga-1',
    helperSingular: 'Helfer',
    maxParticipantsPerHelper: '25',
    defaultStarttime: '09:00',
    defaultEndtime: '17:00',
    defaultStarttimeError: null,
    defaultEndtimeError: null,
    categories: [
      {
        id: 'cat-1',
        value: 'Dauerausstellung',
        abbreviation: 'DA',
      },
    ],
    onMaxParticipantsPerHelperChange: vi.fn(),
    onDefaultStarttimeChange: vi.fn(),
    onDefaultEndtimeChange: vi.fn(),
    onDefaultStarttimeErrorChange: vi.fn(),
    onDefaultEndtimeErrorChange: vi.fn(),
  };

  return render(
    <QueryClientProvider client={queryClient}>
      <OrganizationDefaultValues {...baseProps} {...overrides} />
    </QueryClientProvider>
  );
}

describe('OrganizationDefaultValues', () => {
  it('verwendet die sichtbaren Labels als zugängliche Namen im Hinzufügen-Formular', () => {
    renderOrganizationDefaults();

    fireEvent.click(
      screen.getByRole('button', { name: 'Kategorie hinzufügen' })
    );

    expect(
      screen.getByRole('textbox', { name: 'Name (ausgeschrieben)' })
    ).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Kürzel' })).toBeTruthy();
  });

  it('verwendet die sichtbaren Labels als zugängliche Namen im Bearbeiten-Formular', () => {
    renderOrganizationDefaults();

    fireEvent.click(
      screen.getByRole('button', { name: 'Dauerausstellung bearbeiten' })
    );

    expect(
      screen.getByRole('textbox', { name: 'Name (ausgeschrieben)' })
    ).toBeTruthy();
    expect(screen.getByRole('textbox', { name: 'Kürzel' })).toBeTruthy();
  });
});
