/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { DroppableCell } from './droppable-cell';

const { mockUseDroppable, mockUseCalendarDnd } = vi.hoisted(() => ({
  mockUseDroppable: vi.fn(),
  mockUseCalendarDnd: vi.fn(),
}));

vi.mock('@dnd-kit/core', () => ({
  useDroppable: mockUseDroppable,
}));

vi.mock('@/components/event-calendar', () => ({
  useCalendarDnd: mockUseCalendarDnd,
}));

describe('DroppableCell', () => {
  beforeEach(() => {
    mockUseDroppable.mockReturnValue({
      setNodeRef: vi.fn(),
      isOver: false,
    });
    mockUseCalendarDnd.mockReturnValue({
      activeEvent: null,
    });
  });

  it('verhindert die Neuanlage, wenn ein speichernder Einsatz angeklickt wird', () => {
    const onCreate = vi.fn();

    render(
      <DroppableCell
        id="cell-1"
        date={new Date('2026-04-20T00:00:00.000Z')}
        onClick={onCreate}
      >
        <button
          type="button"
          data-saving="true"
          aria-disabled="true"
        >
          Speichernder Einsatz
        </button>
      </DroppableCell>
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Speichernder Einsatz' })
    );

    expect(onCreate).not.toHaveBeenCalled();
  });

  it('lässt normale Klicks weiterhin zur Zelle durch', () => {
    const onCreate = vi.fn();

    render(
      <DroppableCell
        id="cell-2"
        date={new Date('2026-04-20T00:00:00.000Z')}
        onClick={onCreate}
      >
        <button type="button">Freier Bereich</button>
      </DroppableCell>
    );

    fireEvent.click(screen.getByRole('button', { name: 'Freier Bereich' }));

    expect(onCreate).toHaveBeenCalledTimes(1);
  });
});
