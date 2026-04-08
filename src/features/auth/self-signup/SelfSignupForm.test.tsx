/**
 * @vitest-environment jsdom
 */

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { Session } from 'next-auth';
import { signIn, useSession } from 'next-auth/react';
import type { PropsWithChildren } from 'react';
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { SelfSignupForm } from '@/features/auth/self-signup/SelfSignupForm';

const {
  mockGetSelfSignupAccountStatusAction,
  mockSendOneTimePasswordAction,
  mockVerifyOneTimePasswordAction,
  mockCreateSelfSignupAction,
  mockRouterPush,
  mockUpdateSession,
} = vi.hoisted(() => ({
  mockGetSelfSignupAccountStatusAction: vi.fn(),
  mockSendOneTimePasswordAction: vi.fn(),
  mockVerifyOneTimePasswordAction: vi.fn(),
  mockCreateSelfSignupAction: vi.fn(),
  mockRouterPush: vi.fn(),
  mockUpdateSession: vi.fn(),
}));

vi.mock('@/features/auth/actions', () => ({
  getSelfSignupAccountStatusAction: mockGetSelfSignupAccountStatusAction,
  sendOneTimePasswordAction: mockSendOneTimePasswordAction,
  verifyOneTimePasswordAction: mockVerifyOneTimePasswordAction,
  createSelfSignupAction: mockCreateSelfSignupAction,
}));

vi.mock('next-auth/react', () => ({
  signIn: vi.fn(),
  useSession: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockRouterPush,
  }),
}));

function renderWithQueryClient() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
      mutations: {
        retry: false,
      },
    },
  });

  const wrapper = ({ children }: PropsWithChildren) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );

  return render(<SelfSignupForm />, { wrapper });
}

function createAuthenticatedSession(email: string): Session {
  return {
    user: {
      id: 'user-1',
      email,
      firstname: 'Bestehend',
      lastname: 'Benutzer',
      picture_url: null,
      phone: null,
      salutationId: null,
      hasLogoinCalendar: false,
      orgIds: ['org-1'],
      roleIds: ['role-1'],
      activeOrganization: null,
    },
    token: {
      accessToken: 'token',
      refreshToken: 'refresh-token',
      accessTokenExpires: Date.now() + 60_000,
      refreshTokenExpires: Date.now() + 60_000,
    },
    expires: new Date(Date.now() + 60_000).toISOString(),
  };
}

async function fillAccountStep(container: HTMLElement) {
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
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-kuerzel"]')!,
    {
      target: { value: 'JMH' },
    }
  );
  fireEvent.change(firstNameInput!, { target: { value: 'David' } });
  fireEvent.change(lastNameInput!, { target: { value: 'Kathrein' } });
  fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
  fireEvent.blur(emailInput!);
  await waitFor(() => {
    expect(mockGetSelfSignupAccountStatusAction).toHaveBeenCalledWith({
      email: 'david@example.com',
    });
  });
  fireEvent.change(passwordInput!, {
    target: { value: 'geheimespasswort' },
  });
  fireEvent.change(confirmPasswordInput!, {
    target: { value: 'geheimespasswort' },
  });

  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: 'Weiter',
      })
    ).toBeTruthy();
  });
}

async function fillOptionalStep(container: HTMLElement) {
  await waitFor(() => {
    expect(
      container.querySelector<HTMLInputElement>('input[name="orga-phone"]')
    ).toBeTruthy();
  });

  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-phone"]')!,
    {
      target: { value: '+436601234567' },
    }
  );
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-website"]')!,
    {
      target: { value: 'https://www.jm-hohenems.at' },
    }
  );
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-helfer-singular"]')!,
    {
      target: { value: 'Vermittler:in' },
    }
  );
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-helfer-plural"]')!,
    {
      target: { value: 'Vermittler:innen' },
    }
  );
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-einsatz-singular"]')!,
    {
      target: { value: 'Führung' },
    }
  );
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-einsatz-plural"]')!,
    {
      target: { value: 'Führungen' },
    }
  );
  fireEvent.click(
    screen.getByRole('checkbox', {
      name: /Datenschutzerklärung/,
    })
  );
}

async function fillExistingAccountStep(container: HTMLElement) {
  const organizationNameInput = container.querySelector<HTMLInputElement>(
    'input[name="orga-name"]'
  );
  const emailInput = container.querySelector<HTMLInputElement>(
    'input[name="user-email"]'
  );

  fireEvent.change(organizationNameInput!, {
    target: { value: 'Jüdisches Museum Hohenems' },
  });
  fireEvent.change(emailInput!, { target: { value: 'david@example.com' } });
  fireEvent.blur(emailInput!);

  await waitFor(() => {
    expect(mockGetSelfSignupAccountStatusAction).toHaveBeenCalledWith({
      email: 'david@example.com',
    });
  });

  await waitFor(() => {
    expect(
      screen.getByPlaceholderText('Bitte geben Sie Ihr Passwort ein')
    ).toBeTruthy();
  });

  fireEvent.change(
    screen.getByPlaceholderText('Bitte geben Sie Ihr Passwort ein'),
    {
      target: { value: 'geheimespasswort' },
    }
  );

  await waitFor(() => {
    expect(
      screen.getByRole('button', {
        name: 'Weiter',
      })
    ).toBeTruthy();
  });
}

async function fillLoggedInAccountStep(container: HTMLElement) {
  fireEvent.change(
    container.querySelector<HTMLInputElement>('input[name="orga-name"]')!,
    {
      target: { value: 'Jüdisches Museum Hohenems' },
    }
  );
}

beforeAll(() => {
  class ResizeObserverMock {
    observe() {}
    unobserve() {}
    disconnect() {}
  }

  globalThis.ResizeObserver = ResizeObserverMock as typeof ResizeObserver;
});

describe('SelfSignupForm', () => {
  beforeEach(() => {
    vi.mocked(signIn).mockReset();
    vi.mocked(useSession).mockReset();
    mockGetSelfSignupAccountStatusAction.mockReset();
    mockSendOneTimePasswordAction.mockReset();
    mockVerifyOneTimePasswordAction.mockReset();
    mockCreateSelfSignupAction.mockReset();
    mockRouterPush.mockReset();
    mockUpdateSession.mockReset();

    vi.mocked(useSession).mockReturnValue({
      data: null,
      status: 'unauthenticated',
      update: mockUpdateSession,
    });

    mockGetSelfSignupAccountStatusAction.mockResolvedValue({
      data: {
        accountExists: false,
      },
    });

    mockSendOneTimePasswordAction.mockResolvedValue({
      data: {
        challengeId: 'challenge-1',
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 2_000).toISOString(),
      },
    });

    mockVerifyOneTimePasswordAction.mockResolvedValue({
      data: {
        challengeId: 'challenge-1',
        verified: true,
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
      },
    });

    mockCreateSelfSignupAction.mockResolvedValue({
      data: {
        success: true,
        message:
          'Vielen Dank für Ihre Anmeldung. Ihre Angaben wurden erfasst und geprüft.',
      },
    });

    mockUpdateSession.mockResolvedValue(undefined);

    vi.mocked(signIn).mockResolvedValue({
      ok: true,
      error: null,
      status: 200,
      url: '/',
    });
  });

  it('sendet den Bestätigungscode erst beim Wechsel in Schritt 2', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);

    expect(mockSendOneTimePasswordAction).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledWith({
        email: 'david@example.com',
      });
    });
  });

  it('rendert keine vorausgefüllten Produktionswerte', () => {
    const { container } = renderWithQueryClient();

    expect(
      container.querySelector<HTMLInputElement>('input[name="orga-name"]')?.value
    ).toBe('');
    expect(
      container.querySelector<HTMLInputElement>('input[name="user-email"]')?.value
    ).toBe('');
    expect(
      screen.queryByDisplayValue('hello@davidkathrein.at')
    ).toBeNull();
  });

  it('wechselt bei bestehender E-Mail-Adresse auf den Login-Pfad ohne Passwortbestätigung', async () => {
    mockGetSelfSignupAccountStatusAction.mockResolvedValue({
      data: {
        accountExists: true,
      },
    });

    const { container } = renderWithQueryClient();

    fireEvent.change(
      container.querySelector<HTMLInputElement>('input[name="orga-name"]')!,
      {
        target: { value: 'Jüdisches Museum Hohenems' },
      }
    );
    fireEvent.change(
      container.querySelector<HTMLInputElement>('input[name="user-email"]')!,
      {
        target: { value: 'david@example.com' },
      }
    );
    fireEvent.blur(
      container.querySelector<HTMLInputElement>('input[name="user-email"]')!
    );

    await waitFor(() => {
      expect(
        screen.getByText(/Zu dieser E-Mail-Adresse existiert bereits ein Konto\./)
      ).toBeTruthy();
    });

    expect(screen.queryByText('Passwort erneut eingeben')).toBeNull();
    expect(
      screen.getByPlaceholderText('Bitte geben Sie Ihr Passwort ein')
    ).toBeTruthy();
  });

  it('blendet für bereits eingeloggte Benutzer E-Mail und Passwort aus', () => {
    vi.mocked(useSession).mockReturnValue({
      data: createAuthenticatedSession('bestehend@example.com'),
      status: 'authenticated',
      update: mockUpdateSession,
    });

    renderWithQueryClient();

    expect(
      screen.getByText(/Sie sind bereits als bestehend@example.com angemeldet\./)
    ).toBeTruthy();
    expect(screen.queryByLabelText('Ihre E-Mail-Adresse')).toBeNull();
    expect(screen.queryByLabelText('Passwort für Ihr Konto')).toBeNull();
  });

  it('zeigt beim Wechsel in Schritt 2 einen Loading-Zustand auf dem Weiter-Button, während die E-Mail gesendet wird', async () => {
    let resolveSend!: (value: {
      data: {
        challengeId: string;
        expiresAt: string;
        resendAvailableAt: string;
      };
    }) => void;

    mockSendOneTimePasswordAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveSend = resolve;
        })
    );

    const { container } = renderWithQueryClient();

    await fillAccountStep(container);

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      const nextButton = screen.getByRole('button', {
        name: 'E-Mail wird gesendet ...',
      });

      expect(nextButton.getAttribute('disabled')).not.toBeNull();
    });

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledTimes(1);
    });

    resolveSend({
      data: {
        challengeId: 'challenge-1',
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 2_000).toISOString(),
      },
    });

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });
  });

  it('sendet beim ersten Wechsel in Schritt 2 auch dann eine E-Mail, wenn alter OTP-Status im Query-Cache liegt', async () => {
    const queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
        mutations: {
          retry: false,
        },
      },
    });

    queryClient.setQueryData(
      ['auth', 'one-time-password', 'status', 'david@example.com'],
      {
        challengeId: 'stale-challenge',
        expiresAt: new Date(Date.now() + 10 * 60_000).toISOString(),
        resendAvailableAt: new Date(Date.now() + 2_000).toISOString(),
        verified: false,
      }
    );

    const wrapper = ({ children }: PropsWithChildren) => (
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    );

    const { container } = render(<SelfSignupForm />, { wrapper });

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledWith({
        email: 'david@example.com',
      });
    });
  });

  it('zeigt im Verifizierungsschritt Countdown und Resend-Zustand an', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledTimes(1);
    });

    screen.getByRole('button', {
      name: 'Code erneut senden',
    });

    await new Promise((resolve) => {
      setTimeout(resolve, 2100);
    });

    await waitFor(() => {
      expect(
        screen.getByText(/Sie können jetzt einen neuen Code anfordern\./)
      ).toBeTruthy();
    });
  });

  it('zeigt die optionalen Organisationsangaben im dritten Schritt an', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const otpInputs = container.querySelectorAll<HTMLInputElement>(
      'input[data-otp-index]'
    );
    otpInputs.forEach((input, index) => {
      fireEvent.change(input, {
        target: { value: String(index + 1) },
      });
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });

    await waitFor(() => {
      expect(
        container.querySelector<HTMLInputElement>('input[name="orga-phone"]')
      ).toBeTruthy();
      expect(
        container.querySelector<HTMLInputElement>('input[name="orga-website"]')
      ).toBeTruthy();
      expect(
        container.querySelector<HTMLInputElement>(
          'input[name="orga-helfer-singular"]'
        )
      ).toBeTruthy();
    });
  });

  it('leitet nach korrektem Bestätigungscode automatisch zum nächsten Schritt weiter', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const otpInputs = container.querySelectorAll<HTMLInputElement>(
      'input[data-otp-index]'
    );

    otpInputs.forEach((input, index) => {
      fireEvent.change(input, {
        target: { value: String(index + 1) },
      });
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalledWith({
        email: 'david@example.com',
        code: '123456',
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });
  });

  it('leitet nach Zurück nicht erneut automatisch weiter, wenn der Code bereits verifiziert ist', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const otpInputs = container.querySelectorAll<HTMLInputElement>(
      'input[data-otp-index]'
    );

    otpInputs.forEach((input, index) => {
      fireEvent.change(input, {
        target: { value: String(index + 1) },
      });
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });
  });

  it('übergibt die optionalen Angaben beim Abschluss der Registrierung', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const otpInputs = container.querySelectorAll<HTMLInputElement>(
      'input[data-otp-index]'
    );
    otpInputs.forEach((input, index) => {
      fireEvent.change(input, {
        target: { value: String(index + 1) },
      });
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalled();
    });

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });

    await fillOptionalStep(container);
    fireEvent.click(
      screen.getByRole('button', { name: 'Registrierung abschließen' })
    );

    await waitFor(() => {
      expect(mockCreateSelfSignupAction).toHaveBeenCalledWith({
        accountMode: 'new',
        organizationName: 'Jüdisches Museum Hohenems',
        organizationAbbreviation: 'JMH',
        organizationPhone: '+436601234567',
        organizationWebsite: 'https://www.jm-hohenems.at',
        helperSingular: 'Vermittler:in',
        helperPlural: 'Vermittler:innen',
        einsatzSingular: 'Führung',
        einsatzPlural: 'Führungen',
        firstName: 'David',
        lastName: 'Kathrein',
        email: 'david@example.com',
        password: 'geheimespasswort',
        challengeId: 'challenge-1',
      });
    });

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'david@example.com',
        password: 'geheimespasswort',
        redirect: false,
        callbackUrl: '/',
      });
    });
  });

  it('überspringt bei bestehendem Konto die OTP-Verifizierung und meldet mit dem bestehenden Passwort an', async () => {
    mockGetSelfSignupAccountStatusAction.mockResolvedValue({
      data: {
        accountExists: true,
      },
    });

    const { container } = renderWithQueryClient();

    await fillExistingAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });

    expect(mockSendOneTimePasswordAction).not.toHaveBeenCalled();

    await fillOptionalStep(container);
    fireEvent.click(
      screen.getByRole('button', { name: 'Registrierung abschließen' })
    );

    await waitFor(() => {
      expect(mockCreateSelfSignupAction).toHaveBeenCalledWith({
        accountMode: 'existing',
        organizationName: 'Jüdisches Museum Hohenems',
        organizationAbbreviation: undefined,
        organizationPhone: '+436601234567',
        organizationWebsite: 'https://www.jm-hohenems.at',
        helperSingular: 'Vermittler:in',
        helperPlural: 'Vermittler:innen',
        einsatzSingular: 'Führung',
        einsatzPlural: 'Führungen',
        email: 'david@example.com',
        password: 'geheimespasswort',
      });
    });

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        email: 'david@example.com',
        password: 'geheimespasswort',
        redirect: false,
        callbackUrl: '/',
      });
    });
  });

  it('legt für eingeloggte Benutzer die Organisation ohne erneute Zugangsdaten an', async () => {
    vi.mocked(useSession).mockReturnValue({
      data: createAuthenticatedSession('bestehend@example.com'),
      status: 'authenticated',
      update: mockUpdateSession,
    });

    const { container } = renderWithQueryClient();

    await fillLoggedInAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Weitere Angaben' })).toBeTruthy();
    });

    await fillOptionalStep(container);
    fireEvent.click(
      screen.getByRole('button', { name: 'Registrierung abschließen' })
    );

    await waitFor(() => {
      expect(mockCreateSelfSignupAction).toHaveBeenCalledWith({
        accountMode: 'logged_in',
        organizationName: 'Jüdisches Museum Hohenems',
        organizationAbbreviation: undefined,
        organizationPhone: '+436601234567',
        organizationWebsite: 'https://www.jm-hohenems.at',
        helperSingular: 'Vermittler:in',
        helperPlural: 'Vermittler:innen',
        einsatzSingular: 'Führung',
        einsatzPlural: 'Führungen',
      });
    });

    await waitFor(() => {
      expect(mockUpdateSession).toHaveBeenCalled();
      expect(mockRouterPush).toHaveBeenCalledWith('/');
    });

    expect(mockUpdateSession).toHaveBeenCalledWith({
      user: expect.objectContaining({
        id: 'user-1',
        email: 'bestehend@example.com',
        orgIds: ['org-1'],
        roleIds: ['role-1'],
      }),
    });

    expect(signIn).not.toHaveBeenCalled();
    expect(mockGetSelfSignupAccountStatusAction).not.toHaveBeenCalled();
  });

  it('startet nach Zurück und erneutem Weiter keine neue Challenge automatisch', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    await waitFor(() => {
      expect(mockSendOneTimePasswordAction).toHaveBeenCalledTimes(1);
    });

    fireEvent.click(screen.getByRole('button', { name: /Zurück/ }));

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Registrierung' })).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    expect(mockSendOneTimePasswordAction).toHaveBeenCalledTimes(1);
  });

  it('ordnet die Navigationsbuttons rechts an, auch wenn Zurück sichtbar ist', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const previousButton = screen.getByRole('button', { name: /Zurück/ });
    const actionsWrapper = previousButton.parentElement;

    expect(actionsWrapper?.className).toContain('ml-auto');
    expect(actionsWrapper?.className).toContain('justify-end');

    expect(container.querySelector('button[type="button"]')?.textContent).toBeTruthy();
  });

  it('blockiert die Registrierung ohne verifizierte Challenge im Verifizierungsschritt', async () => {
    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    expect(
      screen.getByRole('heading', { name: 'E-Mail bestätigen' })
    ).toBeTruthy();
    expect(mockCreateSelfSignupAction).not.toHaveBeenCalled();
    expect(
      screen.getByText(
        'Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse mit dem Bestätigungscode.'
      )
    ).toBeTruthy();

    const otpInputs = container.querySelectorAll<HTMLInputElement>(
      'input[data-otp-index]'
    );

    expect(otpInputs).toHaveLength(6);
    expect(otpInputs[0]?.getAttribute('inputmode')).toBe('numeric');
  });

  it('zeigt bei falschem Code eine Fehlermeldung an und leert die OTP-Eingabe', async () => {
    mockVerifyOneTimePasswordAction.mockResolvedValue({
      serverError: 'Ungültiger Code. Bitte versuchen Sie es erneut.',
    });

    const { container } = renderWithQueryClient();

    await fillAccountStep(container);
    fireEvent.click(screen.getByRole('button', { name: /Weiter/ }));

    await waitFor(() => {
      expect(
        screen.getByRole('heading', { name: 'E-Mail bestätigen' })
      ).toBeTruthy();
    });

    const otpInputs = container.querySelectorAll<HTMLInputElement>(
      'input[data-otp-index]'
    );

    otpInputs.forEach((input, index) => {
      fireEvent.change(input, {
        target: { value: String(index + 1) },
      });
    });

    await waitFor(() => {
      expect(mockVerifyOneTimePasswordAction).toHaveBeenCalledWith({
        email: 'david@example.com',
        code: '123456',
      });
    });

    await waitFor(() => {
      expect(
        screen.getByText(
          'Ungültiger Code. Bitte versuchen Sie es erneut.'
        )
      ).toBeTruthy();
    });

    otpInputs.forEach((input) => {
      expect(input.value).toBe('');
    });

    otpInputs.forEach((input) => {
      expect(input.getAttribute('aria-invalid')).toBe('true');
    });
  });

  it('prüft den Kontostatus der E-Mail-Adresse erst beim Verlassen des Felds', async () => {
    const { container } = renderWithQueryClient();
    const emailInput = container.querySelector<HTMLInputElement>(
      'input[name="user-email"]'
    );

    fireEvent.change(emailInput!, {
      target: { value: 'david@example.com' },
    });

    expect(mockGetSelfSignupAccountStatusAction).not.toHaveBeenCalled();

    fireEvent.blur(emailInput!);

    await waitFor(() => {
      expect(mockGetSelfSignupAccountStatusAction).toHaveBeenCalledWith({
        email: 'david@example.com',
      });
    });
  });

});
