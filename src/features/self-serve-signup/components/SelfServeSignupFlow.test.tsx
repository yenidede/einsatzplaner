/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { SelfServeSignupFlow } from './SelfServeSignupFlow';

describe('SelfServeSignupFlow', () => {
  it('übernimmt Organisationsdaten in den neuen Kontomodus und hält sie beim Zurückgehen', async () => {
    const onContinue = vi.fn().mockResolvedValue({
      status: 'account-mode-resolved' as const,
      accountMode: 'new-account' as const,
      email: 'neu@example.com',
    });

    render(<SelfServeSignupFlow onContinue={onContinue} />);

    fireEvent.change(screen.getByLabelText('Organisationsname'), {
      target: { value: 'Musterverein Hohenems' },
    });
    fireEvent.change(screen.getByLabelText('Kurzbeschreibung'), {
      target: { value: 'Wir planen ehrenamtliche Einsätze.' },
    });
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {
      target: { value: 'neu@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    await screen.findByText(/wurde noch kein Konto gefunden\./);

    expect(onContinue).toHaveBeenCalledWith({
      organizationName: 'Musterverein Hohenems',
      organizationDescription: 'Wir planen ehrenamtliche Einsätze.',
      email: 'neu@example.com',
    });

    fireEvent.click(screen.getByRole('button', { name: 'Zurück' }));

    const nameInput = screen.getByLabelText('Organisationsname');
    const descriptionInput = screen.getByLabelText('Kurzbeschreibung');
    const emailInput = screen.getByLabelText('E-Mail-Adresse');

    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error('Organisationsname-Feld ist kein Eingabefeld');
    }

    if (!(descriptionInput instanceof HTMLTextAreaElement)) {
      throw new Error('Kurzbeschreibung-Feld ist kein Textbereich');
    }

    if (!(emailInput instanceof HTMLInputElement)) {
      throw new Error('E-Mail-Feld ist kein Eingabefeld');
    }

    await waitFor(() => {
      expect(nameInput.value).toBe('Musterverein Hohenems');
    });
    expect(descriptionInput.value).toBe('Wir planen ehrenamtliche Einsätze.');
    expect(emailInput.value).toBe('neu@example.com');
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
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {
      target: { value: 'test@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    await screen.findAllByText(
      'Der Organisationsname "Testverein" ist nicht verfügbar. Bitte ändern Sie ihn leicht und versuchen Sie es erneut.'
    );

    const nameInput = screen.getByLabelText('Organisationsname');

    if (!(nameInput instanceof HTMLInputElement)) {
      throw new Error('Organisationsname-Feld ist kein Eingabefeld');
    }

    expect(
      screen.queryByText(/Für test@example.com wurde noch kein Konto gefunden\./)
    ).toBeNull();
    expect(nameInput.value).toBe('Testverein');
  });

  it('wechselt bei bestehender E-Mail in den Passwortmodus und authentifiziert darüber weiter', async () => {
    const onAuthenticateExistingUser = vi.fn().mockResolvedValue({
      ok: true,
    });

    render(
      <SelfServeSignupFlow
        onContinue={vi.fn().mockResolvedValue({
          status: 'account-mode-resolved' as const,
          accountMode: 'existing-account' as const,
          email: 'bestand@example.com',
        })}
        onAuthenticateExistingUser={onAuthenticateExistingUser}
      />
    );

    fireEvent.change(screen.getByLabelText('Organisationsname'), {
      target: { value: 'Testverein' },
    });
    fireEvent.change(screen.getByLabelText('E-Mail-Adresse'), {
      target: { value: 'bestand@example.com' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    await screen.findByText(/existiert bereits ein Konto\./);

    fireEvent.change(screen.getByLabelText('Passwort'), {
      target: { value: 'geheim123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Mit bestehendem Konto fortfahren' })
    );

    await screen.findByText(/Ihr bestehendes Konto wurde bestätigt\./);

    expect(onAuthenticateExistingUser).toHaveBeenCalledWith({
      email: 'bestand@example.com',
      password: 'geheim123',
    });
  });

  it('überspringt den Kontoschritt für bereits angemeldete Nutzer', async () => {
    render(
      <SelfServeSignupFlow
        authenticatedEmail="angemeldet@example.com"
        onContinue={vi.fn().mockResolvedValue({
          status: 'account-mode-resolved' as const,
          accountMode: 'authenticated-user' as const,
          email: 'angemeldet@example.com',
        })}
      />
    );

    fireEvent.change(screen.getByLabelText('Organisationsname'), {
      target: { value: 'Testverein' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));

    await screen.findByText(/Sie sind bereits angemeldet\./);
    expect(screen.queryByLabelText('Passwort')).toBeNull();
  });
});
