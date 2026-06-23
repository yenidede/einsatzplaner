export function isHelperOnlyOrganizationRole(roleNames: string[]): boolean {
  return (
    roleNames.length > 0 && roleNames.every((roleName) => roleName === 'Helfer')
  );
}

export const EXPIRED_ORGANIZATION_CONTACT_EMAIL = 'hello@davidkathrein.at';

export function getExpiredOrganizationSupportText(roleNames: string[]): string {
  if (isHelperOnlyOrganizationRole(roleNames)) {
    return 'Bitte wenden Sie sich an Ihre Organisationsverwaltung, um den Zugriff wieder freizuschalten.';
  }

  return `Bitte kontaktieren Sie Ihre Organisationsverwaltung oder schreiben Sie an ${EXPIRED_ORGANIZATION_CONTACT_EMAIL}.`;
}
