/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelfServeSignupFlow } from './SelfServeSignupFlow';

describe('SelfServeSignupFlow', () => {
  it('übernimmt die Organisationsdaten in den nächsten Schritt und hält sie beim Zurückgehen', async () => {
    const onContinue = vi.fn().mockResolvedValue({
      status: 'available' as const,
    });

    render(<SelfServeSignupFlow onContinue={onContinue} />);

    fireEvent.change(screen.getByLabelText('Organisationsname'), {
      target: { value: 'Musterverein Hohenems' },
    });
    fireEvent.change(screen.getByLabelText('Kurzbeschreibung'), {
      target: { value: 'Wir planen ehrenamtliche Einsätze.' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Weiter zur Konto-Prüfung' })
    );

    await screen.findByText(/Ihr Organisationsname ist verfügbar\./);

    expect(onContinue).toHaveBeenCalledWith({
      organizationName: 'Musterverein Hohenems',
      organizationDescription: 'Wir planen ehrenamtliche Einsätze.',
    });
    expect(screen.getByText('Musterverein Hohenems')).toBeTruthy();
    expect(screen.getByText('Wir planen ehrenamtliche Einsätze.')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

    const nameInput = screen.getByLabelText('Organisationsname');
    const descriptionInput = screen.getByLabelText('Kurzbeschreibung');

    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error('Organisationsname-Feld ist kein Eingabefeld');
    }

    if (!(descriptionInput instanceof HTMLTextAreaElement)) {
      throw new Error('Kurzbeschreibung-Feld ist kein Textbereich');
    }

    await waitFor(() => {
      expect(nameInput.value).toBe('Musterverein Hohenems');
    });
    expect(descriptionInput.value).toBe('Wir planen ehrenamtliche Einsätze.');
  });

  it('zeigt die Nicht-verfügbar-Meldung inline an und bleibt im Organisationsschritt', async () => {
    render(
      <SelfServeSignupFlow
        onContinue={vi.fn().mockResolvedValue({
          status: 'unavailable' as const,
          message:
            'Der Organisationsname "Testverein" ist nicht verfügbar. Bitte ändern Sie ihn leicht und versuchen Sie es erneut.',
        })}
      />
    );

    fireEvent.change(screen.getByLabelText('Organisationsname'), {
      target: { value: 'Testverein' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Weiter zur Konto-Prüfung' })
    );

    await screen.findAllByText(
      'Der Organisationsname "Testverein" ist nicht verfügbar. Bitte ändern Sie ihn leicht und versuchen Sie es erneut.'
    );

    const nameInput = screen.getByLabelText('Organisationsname');

    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error('Organisationsname-Feld ist kein Eingabefeld');
    }

    expect(screen.queryByText(/Ihr Organisationsname ist verfügbar\./)).toBeNull();
    expect(nameInput.value).toBe('Testverein');
  });
});
