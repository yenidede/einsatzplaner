/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AgendaView } from './agenda-view';
import type { CalendarEvent } from './types';

const { mockEventItem } = vi.hoisted(() => ({
  mockEventItem: vi.fn(({ isMultiDay }: { isMultiDay?: boolean }) => (
    <div data-multi-day={isMultiDay ? 'true' : 'false'} />
  )),
}));

vi.mock('@/components/event-calendar', () => ({
  EventItem: mockEventItem,
}));

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
        orgIds: [],
        activeOrganization: { id: 'org-1' },
      },
    },
  }),
}));

vi.mock('@/hooks/use-organization-terminology', () => ({
  useOrganizationTerminology: () => ({
    einsatz_plural: 'Einsaetze',
  }),
}));

vi.mock('@/features/organization/hooks/use-organization-queries', () => ({
  useOrganizations: () => ({ data: [] }),
}));

describe('AgendaView multi-day flag', () => {
  beforeEach(() => {
    mockEventItem.mockClear();
  });

  it('reicht multi-day events an EventItem weiter', () => {
    const events: CalendarEvent[] = [
      {
        id: 'multi',
        title: 'Mehrtägig',
        start: new Date('2026-04-20T08:00:00.000Z'),
        end: new Date('2026-04-21T09:00:00.000Z'),
        assignedUsers: [],
        helpersNeeded: 0,
      },
    ];

    render(
      <AgendaView
        events={events}
        onEventSelect={vi.fn()}
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    const eventItemProps = mockEventItem.mock.calls[0]?.[0];
    if (!eventItemProps || typeof eventItemProps !== 'object') {
      throw new Error('EventItem props were not captured as expected.');
    }

    expect(eventItemProps).toMatchObject({ isMultiDay: true });
  });

  it('markiert ganztägige Ein-Tages-Einsätze nicht als mehrtägig', () => {
    const events: CalendarEvent[] = [
      {
        id: 'single-all-day',
        title: 'Ganztägig',
        start: new Date(),
        end: new Date(),
        allDay: true,
        assignedUsers: [],
        helpersNeeded: 0,
      },
    ];

    render(
      <AgendaView
        events={events}
        onEventSelect={vi.fn()}
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    const eventItemProps = mockEventItem.mock.calls[0]?.[0];
    if (!eventItemProps || typeof eventItemProps !== 'object') {
      throw new Error('EventItem props were not captured as expected.');
    }

    expect(eventItemProps).toMatchObject({ isMultiDay: false });
  });
});
