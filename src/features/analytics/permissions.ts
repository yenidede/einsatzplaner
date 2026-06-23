type RoleLike = {
  role: {
    name: string;
    abbreviation: string | null;
  };
};

function isRoleMatch(
  role: RoleLike['role'],
  options: {
    names: string[];
    abbreviations?: string[];
  }
) {
  const roleName = role.name.toLowerCase();
  const roleAbbreviation = role.abbreviation?.toLowerCase();

  return (
    options.names.some((name) => roleName === name.toLowerCase()) ||
    options.abbreviations?.some((abbreviation) => {
      return roleAbbreviation === abbreviation.toLowerCase();
    }) === true
  );
}

export function hasAnalyticsAccessInOrgRoles(
  roles: RoleLike[] | null | undefined
) {
  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.some(({ role }) =>
    isRoleMatch(role, {
      names: ['Superadmin', 'Einsatzverwaltung', 'Organisationsverwaltung'],
      abbreviations: ['EV', 'OV'],
    })
  );
}

export function isAnalyticsSuperadminInOrgRoles(
  roles: RoleLike[] | null | undefined
) {
  if (!roles || roles.length === 0) {
    return false;
  }

  return roles.some(({ role }) =>
    isRoleMatch(role, {
      names: ['Superadmin'],
    })
  );
}
