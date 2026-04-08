/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeAll, describe, expect, it, vi } from 'vitest';
import { SelfSignupForm } from '@/features/auth/self-signup/SelfSignupForm';

vi.mock('@/features/auth/self-signup/SelfSignupFileUpload', () => ({
  FileUpload: () => <div>Datei-Upload</div>,
}));

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

describe('SelfSignupForm', () => {
  it('wechselt im Testmodus auch mit kurzem Passwort zum nächsten Schritt', async () => {
    const { container } = render(<SelfSignupForm />);

    const organizationNameInput = container.querySelector<HTMLInputElement>(
      'input[name="orga-name"]'
    );
    const firstNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-vorname"]'
    );
    const lastNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-nachname"]'
    );
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="user-email"]'
    );
    const passwordInput = screen.getByPlaceholderText(
      'Mindestens 8 Zeichen'
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      'Bitte wiederholen Sie Ihr Passwort'
    ) as HTMLInputElement;

    fireEvent.change(organizationNameInput!, {
      target: { value: 'Jüdisches Museum Hohenems' },
    });
    fireEvent.change(firstNameInput!, { target: { value: 'David' } });
    fireEvent.change(lastNameInput!, { target: { value: 'Kathrein' } });
    fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
    fireEvent.change(passwordInput!, {
      target: { value: 'kurz' },
    });
    fireEvent.change(confirmPasswordInput!, {
      target: { value: 'kurz' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });
  });

  it('wechselt im Testmodus auch bei unterschiedlichen Passwörtern zum nächsten Schritt', async () => {
    const { container } = render(<SelfSignupForm />);

    const organizationNameInput = container.querySelector<HTMLInputElement>(
      'input[name="orga-name"]'
    );
    const firstNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-vorname"]'
    );
    const lastNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-nachname"]'
    );
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="user-email"]'
    );
    const passwordInput = screen.getByPlaceholderText(
      'Mindestens 8 Zeichen'
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      'Bitte wiederholen Sie Ihr Passwort'
    ) as HTMLInputElement;

    fireEvent.change(organizationNameInput!, {
      target: { value: 'Jüdisches Museum Hohenems' },
    });
    fireEvent.change(firstNameInput!, { target: { value: 'David' } });
    fireEvent.change(lastNameInput!, { target: { value: 'Kathrein' } });
    fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
    fireEvent.change(passwordInput!, {
      target: { value: 'geheimespasswort' },
    });
    fireEvent.change(confirmPasswordInput!, {
      target: { value: 'anderespasswort' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });
  });

  it('zeigt die Beschreibung nur auf der ersten Seite und den Testphasen-Hinweis erst im letzten Schritt', async () => {
    const { container } = render(<SelfSignupForm />);

    expect(
      screen.getByText(
        /Mit dieser Registrierung legen Sie eine neue Organisation an\./
      )
    ).toBeTruthy();
    expect(screen.getByText('*Pflichtfeld')).toBeTruthy();
    expect(
      screen.queryByText(
        /Mit Ihrer Registrierung startet eine kostenlose 14-tägige Testphase\./
      )
    ).toBeNull();
    expect(
      screen.queryByText(
        /Diese Testphase wird aktuell automatisch auf unbestimmte Zeit verlängert\./
      )
    ).toBeNull();
    expect(screen.getByText('*Pflichtfeld')).toBeTruthy();

    const organizationNameInput = container.querySelector<HTMLInputElement>(
      'input[name="orga-name"]'
    );
    const firstNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-vorname"]'
    );
    const lastNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-nachname"]'
    );
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="user-email"]'
    );
    const passwordInput = screen.getByPlaceholderText(
      'Mindestens 8 Zeichen'
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      'Bitte wiederholen Sie Ihr Passwort'
    ) as HTMLInputElement;

    expect(organizationNameInput).toBeTruthy();
    expect(firstNameInput).toBeTruthy();
    expect(lastNameInput).toBeTruthy();
    expect(emailInput).toBeTruthy();
    fireEvent.change(organizationNameInput!, {
      target: { value: 'Jüdisches Museum Hohenems' },
    });
    fireEvent.change(firstNameInput!, { target: { value: 'David' } });
    fireEvent.change(lastNameInput!, { target: { value: 'Kathrein' } });
    fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
    fireEvent.change(passwordInput!, {
      target: { value: 'geheimespasswort' },
    });
    fireEvent.change(confirmPasswordInput!, {
      target: { value: 'geheimespasswort' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });
    expect(
      screen.queryByText(
        /Mit dieser Registrierung legen Sie eine neue Organisation an\./
      )
    ).toBeNull();
    expect(
      screen.queryByText(
        /Mit Ihrer Registrierung startet eine kostenlose 14-tägige Testphase\./
      )
    ).toBeNull();
    expect(
      screen.queryByText(
        /Diese Testphase wird aktuell automatisch auf unbestimmte Zeit verlängert\./
      )
    ).toBeNull();
    expect(screen.getByText('*Pflichtfeld')).toBeTruthy();

    const otpInput = container.querySelector<HTMLInputElement>('#otp-e72');
    expect(otpInput).toBeTruthy();

    fireEvent.change(otpInput!, { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });
    fireEvent.click(
      screen.getByRole('checkbox', {
        name: /Datenschutzerklärung/,
      })
    );
    expect(
      screen.getByText(
        /Mit Ihrer Registrierung startet eine kostenlose 14-tägige Testphase\./
      )
    ).toBeTruthy();
    expect(
      screen.getByText(/Testphase.*unbestimmte Zeit.*verlängert/i)
    ).toBeTruthy();
  });

  it('ordnet die Navigationsbuttons rechts an, auch wenn Zurück sichtbar ist', async () => {
    const { container } = render(<SelfSignupForm />);

    const organizationNameInput = container.querySelector<HTMLInputElement>(
      'input[name="orga-name"]'
    );
    const firstNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-vorname"]'
    );
    const lastNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-nachname"]'
    );
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="user-email"]'
    );
    const passwordInput = screen.getByPlaceholderText(
      'Mindestens 8 Zeichen'
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      'Bitte wiederholen Sie Ihr Passwort'
    ) as HTMLInputElement;

    expect(organizationNameInput).toBeTruthy();
    expect(firstNameInput).toBeTruthy();
    expect(lastNameInput).toBeTruthy();
    expect(emailInput).toBeTruthy();
    fireEvent.change(organizationNameInput!, {
      target: { value: 'Jüdisches Museum Hohenems' },
    });
    fireEvent.change(firstNameInput!, { target: { value: 'David' } });
    fireEvent.change(lastNameInput!, { target: { value: 'Kathrein' } });
    fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
    fireEvent.change(passwordInput!, {
      target: { value: 'geheimespasswort' },
    });
    fireEvent.change(confirmPasswordInput!, {
      target: { value: 'geheimespasswort' },
    });
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /Zurück/ })).toBeTruthy();
    });

    const previousButton = screen.getByRole('button', { name: /Zurück/ });
    const actionsWrapper = previousButton.parentElement;
    const footer = actionsWrapper?.parentElement;

    expect(actionsWrapper?.className).toContain('justify-end');
    expect(footer?.className).toContain('justify-between');
  });

  it('konfiguriert den OTP-Input so, dass nur Zahlen akzeptiert werden', async () => {
    const { container } = render(<SelfSignupForm />);

    const organizationNameInput = container.querySelector<HTMLInputElement>(
      'input[name="orga-name"]'
    );
    const firstNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-vorname"]'
    );
    const lastNameInput = container.querySelector<HTMLInputElement>(
      'input[name="user-nachname"]'
    );
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="user-email"]'
    );
    const passwordInput = screen.getByPlaceholderText(
      'Mindestens 8 Zeichen'
    ) as HTMLInputElement;
    const confirmPasswordInput = screen.getByPlaceholderText(
      'Bitte wiederholen Sie Ihr Passwort'
    ) as HTMLInputElement;

    fireEvent.change(organizationNameInput!, {
      target: { value: 'Jüdisches Museum Hohenems' },
    });
    fireEvent.change(firstNameInput!, { target: { value: 'David' } });
    fireEvent.change(lastNameInput!, { target: { value: 'Kathrein' } });
    fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
    fireEvent.change(passwordInput!, {
      target: { value: 'geheimespasswort' },
    });
    fireEvent.change(confirmPasswordInput!, {
      target: { value: 'geheimespasswort' },
    });

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const otpBaseInput = container.querySelector<HTMLInputElement>(
      'input[data-input-otp="true"]'
    );

    expect(otpBaseInput).toBeTruthy();
    expect(otpBaseInput?.getAttribute('pattern')).toBe('^\\d+$');
    expect(otpBaseInput?.getAttribute('inputmode')).toBe('numeric');
  });
});
