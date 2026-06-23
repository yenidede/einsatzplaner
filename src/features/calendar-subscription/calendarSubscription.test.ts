import { beforeEach, describe, expect, it, vi } from 'vitest';
import { defaultCalendarExportConfig } from './config';

const { mockFindFirst, mockFindMany, mockUpdate } = vi.hoisted(() => ({
  mockFindFirst: vi.fn(),
  mockFindMany: vi.fn(),
  mockUpdate: vi.fn(),
}));

vi.mock('@/lib/prisma', () => ({
  default: {
    calendar_subscription: {
      findFirst: mockFindFirst,
      findMany: mockFindMany,
      update: mockUpdate,
    },
  },
}));

import { updateCalendarExport } from './calendarSubscription';

describe('calendar subscription dal', () => {
  beforeEach(() => {
    mockFindFirst.mockReset();
    mockFindMany.mockReset();
    mockUpdate.mockReset();
  });

  it('verschiebt einen bestehenden Kalenderexport beim Bearbeiten in die neue Organisation', async () => {
    mockFindFirst.mockResolvedValue({ org_id: 'old-org' });
    mockFindMany.mockResolvedValue([]);
    mockUpdate.mockResolvedValue({
      id: 'export-1',
      user_id: 'user-1',
      org_id: 'new-org',
      name: 'Mein Export',
      config: defaultCalendarExportConfig,
    });

    await updateCalendarExport({
      id: 'export-1',
      userId: 'user-1',
      orgId: 'new-org',
      name: ' Mein Export ',
      config: defaultCalendarExportConfig,
    });

    expect(mockFindMany).toHaveBeenCalledWith({
      where: {
        user_id: 'user-1',
        org_id: 'new-org',
        id: { not: 'export-1' },
      },
      select: { name: true },
    });
    expect(mockUpdate).toHaveBeenCalledWith({
      where: { id: 'export-1', user_id: 'user-1' },
      data: {
        org_id: 'new-org',
        name: 'Mein Export',
        config: defaultCalendarExportConfig,
      },
    });
  });
});
