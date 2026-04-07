import type { RoleType } from '@/components/Roles';
import type { OrganizationBase } from '@/features/settings/types';

const SETTINGS_ORG_SWITCH_CONFIRM_EVENT =
  'settings:confirm-organization-switch';

type SettingsOrganizationSwitchConfirmDetail = {
  markHandled: () => void;
  respond: (confirmed: boolean) => void;
};

function isSettingsOrganizationSwitchConfirmEvent(
  event: Event
): event is CustomEvent<SettingsOrganizationSwitchConfirmDetail> {
  return (
    event instanceof CustomEvent &&
    typeof event.detail === 'object' &&
    event.detail !== null &&
    'markHandled' in event.detail &&
    typeof event.detail.markHandled === 'function' &&
    'respond' in event.detail &&
    typeof event.detail.respond === 'function'
  );
}

export function isUserSettingsPath(pathname: string | null): boolean {
  return pathname === '/settings/user';
}

export function isOrganizationSettingsPath(pathname: string | null): boolean {
  if (!pathname) {
    return false;
  }

  return (
    pathname.startsWith('/settings/org/') ||
    pathname.startsWith('/settings/vorlage/')
  );
}

export function getOrganizationSettingsHref(orgId: string): string {
  return `/settings/org/${orgId}`;
}

export function isOrganizationManagementRole(role: RoleType): boolean {
  const normalizedName = role.name.trim().toLowerCase();
  const normalizedAbbreviation = role.abbreviation?.trim().toLowerCase();

  return (
    normalizedName === 'organisationsverwaltung' ||
    normalizedName === 'ov' ||
    normalizedName === 'superadmin' ||
    normalizedAbbreviation === 'ov'
  );
}

export function hasActiveOrganizationSettingsAccess(
  organizations: OrganizationBase[],
  activeOrgId: string | null | undefined
): boolean {
  if (!activeOrgId) {
    return false;
  }

  const activeOrganization = organizations.find(
    (organization) => organization.id === activeOrgId
  );

  if (!activeOrganization) {
    return false;
  }

  return activeOrganization.roles.some(isOrganizationManagementRole);
}

export function findOrganizationById(
  organizations: OrganizationBase[],
  organizationId: string | null | undefined
): OrganizationBase | null {
  if (!organizationId) {
    return null;
  }

  return (
    organizations.find((organization) => organization.id === organizationId) ??
    null
  );
}

export function registerOrganizationSwitchConfirmation(
  onConfirm: () => boolean | Promise<boolean>
): () => void {
  if (typeof window === 'undefined') {
    return () => undefined;
  }

  const handleConfirmationRequest = (event: Event) => {
    if (!isSettingsOrganizationSwitchConfirmEvent(event)) {
      return;
    }

    event.detail.markHandled();
    try {
      const confirmation = onConfirm();

      Promise.resolve(confirmation)
        .then((confirmed) => {
          event.detail.respond(confirmed);
        })
        .catch(() => {
          event.detail.respond(false);
        });
    } catch {
      event.detail.respond(false);
    }
  };

  window.addEventListener(
    SETTINGS_ORG_SWITCH_CONFIRM_EVENT,
    handleConfirmationRequest
  );

  return () => {
    window.removeEventListener(
      SETTINGS_ORG_SWITCH_CONFIRM_EVENT,
      handleConfirmationRequest
    );
  };
}

export function requestOrganizationSwitchConfirmation(): Promise<boolean> {
  if (typeof window === 'undefined') {
    return Promise.resolve(true);
  }

  return new Promise((resolve) => {
    let resolved = false;
    let handled = false;

    window.dispatchEvent(
      new CustomEvent<SettingsOrganizationSwitchConfirmDetail>(
        SETTINGS_ORG_SWITCH_CONFIRM_EVENT,
        {
          detail: {
            markHandled: () => {
              handled = true;
            },
            respond: (confirmed) => {
              if (resolved) {
                return;
              }
              resolved = true;
              resolve(confirmed);
            },
          },
        }
      )
    );

    queueMicrotask(() => {
      if (!resolved && !handled) {
        resolved = true;
        resolve(true);
      }
    });
  });
}
