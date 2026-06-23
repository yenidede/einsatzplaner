/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NavSwitchOrgSelect } from './switch-org';

const {
  mockUseSession,
  mockUseUserProfile,
  mockSwitchOrganization,
  mockRequestOrganizationSwitchConfirmation,
} = vi.hoisted(() => ({
  mockUseSession: vi.fn(),
  mockUseUserProfile: vi.fn(),
  mockSwitchOrganization: vi.fn(),
  mockRequestOrganizationSwitchConfirmation: vi.fn(),
}));

vi.mock('next-auth/react', () => ({
  useSession: () => mockUseSession(),
}));

vi.mock('@/features/settings/hooks/useUserProfile', () => ({
  useUserProfile: (userId: string | undefined) => mockUseUserProfile(userId),
}));

vi.mock('@/hooks/use-active-organization-switch', () => ({
  useActiveOrganizationSwitch: () => ({
    isSwitching: false,
    switchOrganization: mockSwitchOrganization,
  }),
}));

vi.mock('@/components/settings/settings-navigation.utils', () => ({
  requestOrganizationSwitchConfirmation: () =>
    mockRequestOrganizationSwitchConfirmation(),
}));

vi.mock('@/components/ui/select', async () => {
  const React = await import('react');

  const SelectContext = React.createContext<
    | {
        onValueChange?: (value: string) => void;
        disabled?: boolean;
      }
    | undefined
  >(undefined);

  function Select({
    children,
    onValueChange,
    disabled,
  }: React.PropsWithChildren<{
    onValueChange?: (value: string) => void;
    disabled?: boolean;
    value?: string;
    name?: string;
  }>) {
    return (
      <SelectContext.Provider value={{ onValueChange, disabled }}>
        <div
          data-testid="org-switch-root"
          data-disabled={disabled ? '' : undefined}
        >
          {children}
        </div>
      </SelectContext.Provider>
    );
  }

  function SelectTrigger({
    children,
    className,
  }: React.PropsWithChildren<{ className?: string }>) {
    return <div className={className}>{children}</div>;
  }

  function SelectValue({ placeholder }: { placeholder?: string }) {
    return <span>{placeholder}</span>;
  }

  function SelectContent({ children }: React.PropsWithChildren) {
    return <div>{children}</div>;
  }

  function SelectGroup({ children }: React.PropsWithChildren) {
    return <div>{children}</div>;
  }

  function SelectItem({
    children,
    value,
    disabled,
    title,
    className,
  }: React.PropsWithChildren<{
    value: string;
    disabled?: boolean;
    title?: string;
    className?: string;
  }>) {
    const context = React.useContext(SelectContext);

    return (
      <button
        type="button"
        className={className}
        disabled={context?.disabled || disabled}
        title={title}
        onClick={() => context?.onValueChange?.(value)}
      >
        {children}
      </button>
    );
  }

  return {
    Select,
    SelectContent,
    SelectGroup,
    SelectItem,
    SelectTrigger,
    SelectValue,
  };
});

describe('NavSwitchOrgSelect', () => {
  beforeEach(() => {
    mockUseSession.mockReset();
    mockUseUserProfile.mockReset();
    mockSwitchOrganization.mockReset();
    mockRequestOrganizationSwitchConfirmation.mockReset();

    mockUseSession.mockReturnValue({
      data: {
        user: {
          id: 'user-1',
          activeOrganization: {
            id: 'org-1',
            name: 'Aktiver Verein',
            logo_url: null,
          },
        },
      },
    });

    mockUseUserProfile.mockReturnValue({
      data: {
        organizations: [
          {
            id: 'org-1',
            name: 'Aktiver Verein',
            roles: [{ id: 'role-1', name: 'Helfer', abbreviation: 'H' }],
            hasGetMailNotification: true,
          },
          {
            id: 'org-2',
            name: 'Abgelaufener Verein',
            roles: [{ id: 'role-2', name: 'Helfer', abbreviation: 'H' }],
            hasGetMailNotification: true,
          },
        ],
      },
    });
  });

  it('rendert abgelaufene Organisationen deaktiviert mit helper-only Hinweis', () => {
    render(
      <NavSwitchOrgSelect
        organizations={[
          {
            id: 'org-1',
            name: 'Aktiver Verein',
            subscription_status: 'active',
            trial_ends_at: null,
          },
          {
            id: 'org-2',
            name: 'Abgelaufener Verein',
            subscription_status: 'expired',
            trial_ends_at: null,
          },
        ]}
      />
    );

    const expiredOrg = screen.getByRole('button', {
      name: 'Abgelaufener Verein',
    });

    expect(
      expiredOrg.getAttribute('disabled') !== null ||
        expiredOrg.matches(':disabled')
    ).toBe(true);
    expect(expiredOrg.getAttribute('title')).toBe(
      'Der Zugriff auf Abgelaufener Verein ist abgelaufen. Bitte wenden Sie sich an Ihre Organisationsverwaltung, um den Zugriff wieder freizuschalten.'
    );
  });

  it('rendert fuer nicht-helper-only den Kontakt-Hinweis mit E-Mail-Adresse', () => {
    mockUseUserProfile.mockReturnValue({
      data: {
        organizations: [
          {
            id: 'org-2',
            name: 'Abgelaufener Verein',
            roles: [
              {
                id: 'role-2',
                name: 'Organisationsverwaltung',
                abbreviation: 'OV',
              },
            ],
            hasGetMailNotification: true,
          },
        ],
      },
    });

    render(
      <NavSwitchOrgSelect
        organizations={[
          {
            id: 'org-1',
            name: 'Aktiver Verein',
            subscription_status: 'active',
            trial_ends_at: null,
          },
          {
            id: 'org-2',
            name: 'Abgelaufener Verein',
            subscription_status: 'expired',
            trial_ends_at: null,
          },
        ]}
      />
    );

    expect(
      screen
        .getByRole('button', { name: 'Abgelaufener Verein' })
        .getAttribute('title')
    ).toBe(
      'Der Zugriff auf Abgelaufener Verein ist abgelaufen. Bitte kontaktieren Sie Ihre Organisationsverwaltung oder schreiben Sie an hello@davidkathrein.at.'
    );
  });
});
