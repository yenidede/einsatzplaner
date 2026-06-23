/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EventItem } from './event-item';
import type { CalendarEvent } from './types';

vi.mock('next-auth/react', () => ({
  useSession: () => ({
    data: {
      user: {
        id: 'user-1',
      },
    },
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    info: vi.fn(),
  },
}));

vi.mock('@/components/tooltip-custom', () => ({
  default: ({ children }: { children: ReactNode }) => <>{children}</>,
}));

vi.mock('../context-menu', () => ({
  ContextMenuEventRightClick: ({ trigger }: { trigger: React.ReactNode }) => (
    <>{trigger}</>
  ),
}));

describe('EventItem multi-day indicator', () => {
  it('zeigt das CalendarRange-Icon mit Tooltip für mehrtägige Einsätze', () => {
    const event: CalendarEvent = {
      id: 'einsatz-2',
      title: 'Mehrtageseinsatz',
      start: new Date('2026-04-20T08:00:00.000Z'),
      end: new Date('2026-04-21T09:00:00.000Z'),
      assignedUsers: [],
      helpersNeeded: 0,
    };

    render(
      <EventItem
        event={event}
        view="month"
        mode="verwaltung"
        isMultiDay
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    expect(
      screen.getByLabelText(
        'Mehrtägiger Eintrag: Änderungen betreffen alle Tage.'
      )
    ).toBeTruthy();
  });

  it('zeigt das Icon auch für normalisierte Mehrtages-Einträge mit gleichem Kalendertag', () => {
    const event: CalendarEvent = {
      id: 'einsatz-4',
      title: 'Mehrtageseinsatz normalisiert',
      start: new Date(2026, 3, 20, 13, 30, 0),
      end: new Date(2026, 3, 20, 15, 30, 0),
      assignedUsers: [],
      helpersNeeded: 0,
    };

    render(
      <EventItem
        event={event}
        view="month"
        mode="verwaltung"
        isMultiDay
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    expect(
      screen.getByLabelText(
        'Mehrtägiger Eintrag: Änderungen betreffen alle Tage.'
      )
    ).toBeTruthy();
  });

  it('zeigt kein Multi-Day-Icon für ganztägige Ein-Tages-Einsätze', () => {
    const event: CalendarEvent = {
      id: 'einsatz-3',
      title: 'Ganztägig ohne Mehrtagesspanne',
      start: new Date(2026, 3, 20, 0, 0, 0),
      end: new Date(2026, 3, 20, 23, 59, 59),
      allDay: true,
      assignedUsers: [],
      helpersNeeded: 0,
    };

    render(
      <EventItem
        event={event}
        view="month"
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    expect(
      screen.queryByLabelText(
        'Mehrtägiger Eintrag: Änderungen betreffen alle Tage.'
      )
    ).toBeNull();
  });
});
