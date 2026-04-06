export function isHelperOnlyOrganizationRole(roleNames: string[]): boolean {
  return roleNames.length > 0 && roleNames.every((roleName) => roleName === 'Helfer');
}
