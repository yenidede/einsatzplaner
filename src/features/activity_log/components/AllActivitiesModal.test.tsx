/**
 * @vitest-environment jsdom
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';

const mocks = vi.hoisted(() => ({
  useSession: vi.fn(),
  useActivityLogsFiltered: vi.fn(),
  useChangeTypes: vi.fn(),
  useOrganizations: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: mocks.useSession,
}));

vi.mock('../hooks/useActivityLogs', () => ({
  useActivityLogsFiltered: mocks.useActivityLogsFiltered,
  useChangeTypes: mocks.useChangeTypes,
}));

vi.mock('@/features/organization/hooks/use-organization-queries', () => ({
  useOrganizations: mocks.useOrganizations,
}));

import { AllActivitiesModal } from './AllActivitiesModal';

describe('AllActivitiesModal', () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mocks.useSession.mockReturnValue({
      data: {
        user: {
          orgIds: ['org-1'],
        },
      },
    });

    mocks.useActivityLogsFiltered.mockReturnValue({
      data: {
        activities: [],
        total: 0,
        hasMore: false,
      },
      isLoading: false,
    });

    mocks.useChangeTypes.mockReturnValue({
      data: [],
    });

    mocks.useOrganizations.mockReturnValue({
      data: [],
    });
  });

  it('rendert einen einzelnen Zeitraum-Filter statt separater Von/Bis-Felder', () => {
    render(
      <AllActivitiesModal
        open
        onOpenChange={vi.fn()}
        openDialog={vi.fn()}
        readIds={new Set()}
        lastReadNotifications={null}
        onMarkAsRead={vi.fn()}
      />
    );

    expect(screen.getByLabelText('Zeitraum')).toBeTruthy();
    expect(screen.queryByLabelText('Von')).toBeNull();
    expect(screen.queryByLabelText('Bis')).toBeNull();
  });
});
