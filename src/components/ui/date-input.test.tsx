// @vitest-environment jsdom

import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';

import { DateInput, type DateInputRangeValue } from './date-input';

function SingleDateHarness() {
  const [value, setValue] = useState('');

  return (
    <DateInput
      aria-label="Startdatum"
      value={value}
      onValueChange={setValue}
    />
  );
}

function RequiredSingleDateHarness() {
  const [value, setValue] = useState('2026-04-01');

  return (
    <DateInput
      aria-label="Pflichtdatum"
      allowEmpty={false}
      value={value}
      onValueChange={setValue}
    />
  );
}

function RangeDateHarness() {
  const [value, setValue] = useState<DateInputRangeValue>({
    from: '2026-04-01',
    to: '2026-04-01',
  });

  return (
    <DateInput
      aria-label="Zeitraum"
      mode="range"
      value={value}
      onValueChange={setValue}
    />
  );
}

function getInputValue(input: HTMLElement): string {
  if (!(input instanceof HTMLInputElement)) {
    throw new Error('Erwartetes Input-Element.');
  }

  return input.value;
}

describe('DateInput', () => {
  it('normalisiert Freitext erst beim Verlassen des Felds', async () => {
    render(<SingleDateHarness />);

    const input = screen.getByRole('textbox', { name: 'Startdatum' });

    fireEvent.change(input, { target: { value: '1.4.26' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(getInputValue(input)).toBe('1. April 2026');
    });
  });

  it('akzeptiert kurze Eingaben ohne Jahr im Single-Modus', async () => {
    render(<SingleDateHarness />);

    const input = screen.getByRole('textbox', { name: 'Startdatum' });
    const currentYear = new Date().getFullYear();

    fireEvent.change(input, { target: { value: '1202' } });
    fireEvent.blur(input);

    await waitFor(() => {
      expect(getInputValue(input)).toBe(`12. Februar ${currentYear}`);
    });
  });

  it('behält Pflichtdaten bei, wenn der ausgewählte Tag erneut angeklickt wird', async () => {
    render(<RequiredSingleDateHarness />);

    const input = screen.getByRole('textbox', { name: 'Pflichtdatum' });
    const openButton = screen.getByRole('button', {
      name: 'Kalender für Datum öffnen',
    });

    fireEvent.click(openButton);
    fireEvent.click(
      screen.getByRole('button', {
        name: /1\. April 2026, selected/,
      })
    );

    await waitFor(() => {
      expect(getInputValue(input)).toBe('1. April 2026');
    });
  });

  it('zeigt im Range-Modus zwei Kalender und übernimmt Maus-Auswahl', async () => {
    render(<RangeDateHarness />);

    const openButton = screen.getByRole('button', {
      name: 'Kalender für Zeitraum öffnen',
    });

    fireEvent.click(openButton);

    screen.getByText('April 2026');
    screen.getByText('Mai 2026');

    screen.getByRole('button', {
      name: /10\. April 2026/,
    });
    screen.getByRole('button', {
      name: /12\. April 2026/,
    });
  });
});
