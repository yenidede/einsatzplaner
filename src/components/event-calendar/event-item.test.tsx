/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { EventItem } from './event-item';
import type { CalendarEvent } from './types';

const { mockToastInfo } = vi.hoisted(() => ({
  mockToastInfo: vi.fn(),
}));

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
    info: mockToastInfo,
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

describe('EventItem save state', () => {
  it('zeigt Lock-Badge und blockiert Öffnen während Speicherung', () => {
    const onClick = vi.fn();
    const event: CalendarEvent = {
      id: 'einsatz-1',
      title: 'Testeinsatz',
      start: new Date('2026-04-20T08:00:00.000Z'),
      end: new Date('2026-04-20T09:00:00.000Z'),
      assignedUsers: [],
      helpersNeeded: 0,
    };

    render(
      <EventItem
        event={event}
        view="month"
        mode="verwaltung"
        onClick={onClick}
        pastIndicatorTooltip="Liegt in der Vergangenheit."
        isSaving
      />
    );

    expect(
      screen.getByLabelText('Dieser Einsatz wird gespeichert. Bitte warten Sie.')
    ).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /Testeinsatz/ }));

    expect(onClick).not.toHaveBeenCalled();
    expect(mockToastInfo).toHaveBeenCalledWith(
      'Dieser Einsatz wird gerade gespeichert. Bitte warten Sie einen Moment, bevor Sie ihn öffnen.'
    );
  });
});
