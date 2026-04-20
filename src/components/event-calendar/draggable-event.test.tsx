/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DraggableEvent } from './draggable-event';
import type { CalendarEvent } from './types';

const { mockUseDraggable, mockUseCalendarDnd, mockEventItem } = vi.hoisted(
  () => ({
    mockUseDraggable: vi.fn(),
    mockUseCalendarDnd: vi.fn(),
    mockEventItem: vi.fn(
      ({
        children,
        dndListeners,
        dndAttributes,
      }: {
        children?: ReactNode;
        dndListeners?: unknown;
        dndAttributes?: unknown;
      }) => (
        <div
          data-has-listeners={dndListeners ? 'true' : 'false'}
          data-has-attributes={dndAttributes ? 'true' : 'false'}
        >
          {children}
        </div>
      )
    ),
  })
);

vi.mock('@dnd-kit/core', () => ({
  useDraggable: mockUseDraggable,
}));

vi.mock('@/components/event-calendar', () => ({
  EventItem: mockEventItem,
  useCalendarDnd: mockUseCalendarDnd,
}));

describe('DraggableEvent', () => {
  beforeEach(() => {
    mockUseCalendarDnd.mockReturnValue({
      activeId: null,
    });
    mockUseDraggable.mockReturnValue({
      attributes: { role: 'button' },
      listeners: { onPointerDown: vi.fn() },
      setNodeRef: vi.fn(),
      transform: null,
      isDragging: false,
    });
    mockUseDraggable.mockClear();
    mockEventItem.mockClear();
  });

  it('deaktiviert DnD für mehrtägige Events', () => {
    const event: CalendarEvent = {
      id: 'multi-day',
      title: 'Mehrtägiger Einsatz',
      start: new Date('2026-04-20T08:00:00.000Z'),
      end: new Date('2026-04-21T10:00:00.000Z'),
      assignedUsers: [],
      helpersNeeded: 0,
    };

    const { container } = render(
      <DraggableEvent
        event={event}
        view="week"
        isMultiDay
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: true,
      })
    );
    expect(
      container.querySelector('[data-has-listeners="false"]')
    ).toBeTruthy();
    expect(
      container.querySelector('[data-has-attributes="false"]')
    ).toBeTruthy();
  });

  it('reicht das Mehrtages-Flag an EventItem weiter', () => {
    const event: CalendarEvent = {
      id: 'multi-day-prop',
      title: 'Mehrtägiger Einsatz mit Prop',
      start: new Date('2026-04-20T08:00:00.000Z'),
      end: new Date('2026-04-21T10:00:00.000Z'),
      assignedUsers: [],
      helpersNeeded: 0,
    };

    render(
      <DraggableEvent
        event={event}
        view="week"
        isMultiDay
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    const eventItemProps = mockEventItem.mock.calls[0]?.[0];

    if (
      eventItemProps &&
      typeof eventItemProps === 'object' &&
      'isMultiDay' in eventItemProps
    ) {
      expect(eventItemProps.isMultiDay).toBe(true);
    } else {
      throw new Error('EventItem props were not captured as expected.');
    }
  });

  it('bleibt für eintägige Events draggable', () => {
    const event: CalendarEvent = {
      id: 'single-day',
      title: 'Eintägiger Einsatz',
      start: new Date('2026-04-20T08:00:00.000Z'),
      end: new Date('2026-04-20T10:00:00.000Z'),
      assignedUsers: [],
      helpersNeeded: 0,
    };

    render(
      <DraggableEvent
        event={event}
        view="week"
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    expect(mockUseDraggable).toHaveBeenCalledWith(
      expect.objectContaining({
        disabled: false,
      })
    );

    const eventItemProps = mockEventItem.mock.calls[0]?.[0];

    if (
      eventItemProps &&
      typeof eventItemProps === 'object' &&
      'dndListeners' in eventItemProps &&
      'dndAttributes' in eventItemProps
    ) {
      expect(eventItemProps.dndListeners).toBeDefined();
      expect(eventItemProps.dndAttributes).toBeDefined();
    } else {
      throw new Error('EventItem props were not captured as expected.');
    }
  });

  it('erzeugt pro normalisierter Instanz eine eindeutige Drag-ID', () => {
    const sharedEvent = {
      id: 'shared-id',
      title: 'Mehrtägiger Einsatz',
      assignedUsers: [],
      helpersNeeded: 0,
    } satisfies Omit<CalendarEvent, 'start' | 'end'>;

    render(
      <>
        <DraggableEvent
          event={{
            ...sharedEvent,
            start: new Date('2026-04-20T08:00:00.000Z'),
            end: new Date('2026-04-21T10:00:00.000Z'),
          }}
          view="week"
          isMultiDay
          mode="verwaltung"
          pastIndicatorTooltip="Liegt in der Vergangenheit."
        />
        <DraggableEvent
          event={{
            ...sharedEvent,
            start: new Date('2026-04-21T08:00:00.000Z'),
            end: new Date('2026-04-22T10:00:00.000Z'),
          }}
          view="week"
          isMultiDay
          mode="verwaltung"
          pastIndicatorTooltip="Liegt in der Vergangenheit."
        />
      </>
    );

    const draggableIds = mockUseDraggable.mock.calls.map(([args]) => args.id);
    expect(new Set(draggableIds).size).toBe(draggableIds.length);
  });
});
