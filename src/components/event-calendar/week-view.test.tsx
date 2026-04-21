/**
 * @vitest-environment jsdom
 */

import { render } from '@testing-library/react';
import type { ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { WeekView } from './week-view';
import type { CalendarEvent } from './types';

const {
  mockDraggableEvent,
  mockDroppableCell,
  mockUseCurrentTimeIndicator,
  mockUseTodayStart,
  mockEventItem,
} = vi.hoisted(() => ({
  mockDraggableEvent: vi.fn(
    ({
      event,
      isMultiDay,
    }: {
      event: CalendarEvent;
      isMultiDay?: boolean;
    }) => (
      <div data-event-id={event.id} data-multi-day={isMultiDay ? 'true' : 'false'} />
    )
  ),
  mockDroppableCell: vi.fn(({ children }: { children?: ReactNode }) => (
    <div>{children}</div>
  )),
  mockUseCurrentTimeIndicator: vi.fn(() => ({
    currentTimePosition: 0,
    currentTimeVisible: false,
  })),
  mockUseTodayStart: vi.fn(() => new Date('2026-04-20T00:00:00.000Z')),
  mockEventItem: vi.fn(({ children }: { children?: ReactNode }) => <>{children}</>),
}));

vi.mock('./draggable-event', () => ({
  DraggableEvent: mockDraggableEvent,
}));

vi.mock('./droppable-cell', () => ({
  DroppableCell: mockDroppableCell,
}));

vi.mock('./event-item', () => ({
  EventItem: mockEventItem,
}));

vi.mock('./hooks/use-current-time-indicator', () => ({
  useCurrentTimeIndicator: mockUseCurrentTimeIndicator,
}));

vi.mock('./hooks/use-today-start', () => ({
  useTodayStart: mockUseTodayStart,
}));

describe('WeekView multi-day rendering', () => {
  it('markiert normalisierte Mehrtages-Instanzen als nicht draggable', () => {
    type DraggableProps = {
      event: CalendarEvent;
      isMultiDay?: boolean;
    };

    const events: CalendarEvent[] = [
      {
        id: 'multi',
        title: 'Mehrtägig',
        start: new Date('2026-04-20T08:00:00.000Z'),
        end: new Date('2026-04-22T10:00:00.000Z'),
        assignedUsers: [],
        helpersNeeded: 0,
      },
      {
        id: 'single',
        title: 'Ein Tag',
        start: new Date('2026-04-21T12:00:00.000Z'),
        end: new Date('2026-04-21T13:00:00.000Z'),
        assignedUsers: [],
        helpersNeeded: 0,
      },
    ];

    render(
      <WeekView
        currentDate={new Date('2026-04-20T00:00:00.000Z')}
        events={events}
        onEventSelect={vi.fn()}
        onEventCreate={vi.fn()}
        mode="verwaltung"
        pastIndicatorTooltip="Liegt in der Vergangenheit."
      />
    );

    const renderedDraggableProps = mockDraggableEvent.mock.calls
      .map(([props]) => props)
      .filter(
        (props): props is DraggableProps =>
          typeof props === 'object' &&
          props !== null &&
          'event' in props
      );

    const multiDayCalls = renderedDraggableProps.filter(
      (props) => props.event.id === 'multi'
    );
    const singleDayCalls = renderedDraggableProps.filter(
      (props) => props.event.id === 'single'
    );

    expect(multiDayCalls.length).toBeGreaterThan(1);
    multiDayCalls.forEach((props) => {
      expect(props.isMultiDay).toBe(true);
    });

    expect(singleDayCalls.length).toBeGreaterThan(0);
    singleDayCalls.forEach((props) => {
      expect(props.isMultiDay).toBe(false);
    });
  });
});
