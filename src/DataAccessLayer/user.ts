import prisma from "@/lib/prisma";

type UserSettingsUpdate = {
  email?: string;
  firstname?: string;
  lastname?: string;
  hasLogoinCalendar?: boolean;
  updated_at?: Date;
  phone?: string;
};

type UserOrgSettingsUpdate = {
  getMailFromOrganization?: boolean;
};

//#region User Retrieval
export async function getUserByEmail(email: string) {
  try {
    return await prisma.user.findUnique({
      where: { email },
      include: {
        user_organization_role: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                helper_name_singular: true,
                helper_name_plural: true,
                einsatz_name_singular: true,
                einsatz_name_plural: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
        },
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to retrieve user by email: ${error.message}`);
  }
}

export async function getUserByIdWithOrgAndRole(userId: string) {
  try {
    return await prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_organization_role: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                helper_name_singular: true,
                helper_name_plural: true,
                einsatz_name_singular: true,
                einsatz_name_plural: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
        },
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to retrieve user by ID: ${error.message}`);
  }
}
//#endregion

//#region User Creation
export async function createUserWithOrgAndRoles(data: {
  email: string;
  firstname?: string;
  lastname?: string;
  password: string;
  phone?: string;
  orgId: string;
  roleIds: string[];
}) {
  try {
    // Ein User kann mehrere Rollen pro Organisation haben
    if (!data.roleIds || data.roleIds.length === 0) {
      throw new Error('Mindestens eine Rolle muss zugewiesen werden.');
    }
    
    return prisma.user.create({
      data: {
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        password: data.password,
        phone: data.phone,
        user_organization_role: {
          create: data.roleIds.map(roleId => ({
            org_id: data.orgId,
            role_id: roleId,
          })),
        },
      },
      include: {
        user_organization_role: {
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                helper_name_singular: true,
                helper_name_plural: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
        },
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to create user: ${error.message}`);
  }
}
//#endregion

//#region Organization Management
export async function getOrCreateOrganizationByName(name: string) {
  try {
    let organization = await prisma.organization.findFirst({
      where: { name },
    });

    if (!organization) {
      organization = await prisma.organization.create({
        data: { name },
      });
    }

    return organization;
  } catch (error: any) {
    throw new Error(`Failed to get or create organization: ${error.message}`);
  }
}

export async function getUsersWithRolesByOrgId(orgId: string) {
  try {
    return prisma.user.findMany({
      where: {
        user_organization_role: {
          some: {
            org_id: orgId,
          },
        },
      },
      include: {
        user_organization_role: {
          where: {
            org_id: orgId,
          },
          include: {
            organization: {
              select: { 
                id: true, 
                name: true,
                helper_name_singular: true,
                helper_name_plural: true,
                einsatz_name_singular: true,
                einsatz_name_plural: true,
              },
            },
            role: {
              select: {
                id: true,
                name: true,
                abbreviation: true,
              },
            },
          },
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to retrieve users by organization ID: ${errorMessage}`
    );
  }
}
//#endregion

//#region User Updates
export async function updateLastLogin(userId: string) {
  try {
    return prisma.user.update({
      where: { id: userId },
      data: {
        last_login: new Date(),
        updated_at: new Date(),
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to update last login: ${error.message}`);
  }
}

export async function updateUserResetToken(
  email: string,
  resetToken: string,
  resetTokenExpiry: Date
) {
  try {
    return await prisma.user.update({
      where: { email },
      data: {
        resetToken,
        resetTokenExpires: resetTokenExpiry,
        updated_at: new Date(),
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to update reset token: ${error.message}`);
  }
}

export async function getUserWithValidResetToken(token: string) {
  try {
    return await prisma.user.findFirst({
      where: {
        resetToken: token,
        resetTokenExpires: {
          gt: new Date(),
        },
      },
    });
  } catch (error: any) {
    throw new Error(
      `Failed to retrieve user with valid reset token: ${error.message}`
    );
  }
}

export async function resetUserPassword(
  user: { id: string },
  hashedPassword: string
) {
  try {
    return prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        updated_at: new Date(),
        resetToken: null,
        resetTokenExpires: null,
      },
    });
  } catch (error: any) {
    throw new Error(`Failed to reset user password: ${error.message}`);
  }
}
//#endregion

//#region User Settings
export async function updateUserSettings(
  userId: string,
  body: UserSettingsUpdate
) {
  try {
    const currentUser = await prisma.user.findUnique({
      where: { id: userId },
    });

    if (!currentUser) {
      throw new Error("User not found");
    }

    const updateData = {
      email: body.email || currentUser.email,
      firstname: body.firstname || currentUser.firstname || undefined,
      lastname: body.lastname || currentUser.lastname || undefined,
      hasLogoinCalendar:
        body.hasLogoinCalendar ?? currentUser.hasLogoinCalendar,
      updated_at: new Date(),
      phone: body.phone ?? (currentUser.phone || undefined),
    };

    return prisma.user.update({
      where: { id: userId },
      data: updateData,
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to update user settings: ${errorMessage}`);
  }
}

export async function updateUserOrgSettings(
  userOrgId: string,
  body: UserOrgSettingsUpdate
) {
  try {
    const currentUserOrg = await prisma.user_organization_role.findUnique({
      where: { id: userOrgId },
    });

    if (!currentUserOrg) {
      throw new Error("UserOrg not found");
    }

    // Note: hasGetMailNotification field does not exist in current schema
    // This function is kept for future extensions
    console.warn('updateUserOrgSettings called but no updatable fields exist in current schema');
    
    return currentUserOrg;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(
      `Failed to update user organization settings: ${errorMessage}`
    );
  }
}

//#region Multi-Role Support Functions
/**
 * Fügt einem User zusätzliche Rollen in einer Organisation hinzu
 */
export async function addUserRolesToOrganization(
  userId: string,
  orgId: string,
  roleIds: string[]
) {
  try {
    // Prüfe welche Rollen der User bereits in dieser Organisation hat
    const existingRoles = await prisma.user_organization_role.findMany({
      where: {
        user_id: userId,
        org_id: orgId,
      },
      select: { role_id: true },
    });

    const existingRoleIds = existingRoles.map(r => r.role_id);
    const newRoleIds = roleIds.filter(roleId => !existingRoleIds.includes(roleId));

    if (newRoleIds.length === 0) {
      return { message: 'User already has all specified roles in this organization' };
    }

    // Erstelle neue Rollenverknüpfungen
    const newRoles = await prisma.user_organization_role.createMany({
      data: newRoleIds.map(roleId => ({
        user_id: userId,
        org_id: orgId,
        role_id: roleId,
      })),
    });

    return newRoles;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to add user roles to organization: ${errorMessage}`);
  }
}

/**
 * Entfernt spezifische Rollen eines Users aus einer Organisation
 */
export async function removeUserRolesFromOrganization(
  userId: string,
  orgId: string,
  roleIds: string[]
) {
  try {
    const deletedRoles = await prisma.user_organization_role.deleteMany({
      where: {
        user_id: userId,
        org_id: orgId,
        role_id: { in: roleIds },
      },
    });

    return deletedRoles;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to remove user roles from organization: ${errorMessage}`);
  }
}

/**
 * Holt alle Rollen eines Users in einer spezifischen Organisation
 */
export async function getUserRolesInOrganization(
  userId: string,
  orgId: string
) {
  try {
    return await prisma.user_organization_role.findMany({
      where: {
        user_id: userId,
        org_id: orgId,
      },
      include: {
        role: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
        organization: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get user roles in organization: ${errorMessage}`);
  }
}

/**
 * Holt alle Organisationen eines Users mit ihren jeweiligen Rollen
 */
export async function getUserOrganizationsWithRoles(userId: string) {
  try {
    const userOrgRoles = await prisma.user_organization_role.findMany({
      where: { user_id: userId },
      include: {
        organization: {
          select: {
            id: true,
            name: true,
            helper_name_singular: true,
            helper_name_plural: true,
            einsatz_name_singular: true,
            einsatz_name_plural: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
    });

    // Gruppiere nach Organisation
    const organizationsMap = new Map();
    
    userOrgRoles.forEach(userOrgRole => {
      const orgId = userOrgRole.organization.id;
      
      if (!organizationsMap.has(orgId)) {
        organizationsMap.set(orgId, {
          organization: userOrgRole.organization,
          roles: [],
        });
      }
      
      organizationsMap.get(orgId).roles.push(userOrgRole.role);
    });

    return Array.from(organizationsMap.values());
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get user organizations with roles: ${errorMessage}`);
  }
}

/**
 * Entfernt einen User komplett aus einer Organisation (alle Rollen)
 */
export async function removeUserFromOrganization(
  userId: string,
  orgId: string
) {
  try {
    const deletedRoles = await prisma.user_organization_role.deleteMany({
      where: {
        user_id: userId,
        org_id: orgId,
      },
    });

    return deletedRoles;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to remove user from organization: ${errorMessage}`);
  }
}

/**
 * Prüft ob ein User eine spezifische Rolle in einer Organisation hat
 */
export async function userHasRoleInOrganization(
  userId: string,
  orgId: string,
  roleId: string
): Promise<boolean> {
  try {
    const userOrgRole = await prisma.user_organization_role.findFirst({
      where: {
        user_id: userId,
        org_id: orgId,
        role_id: roleId,
      },
    });

    return !!userOrgRole;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to check user role in organization: ${errorMessage}`);
  }
}

/**
 * Holt alle User einer Organisation mit ihren Rollen (optimiert für Multi-Role)
 */
export async function getUsersWithRolesByOrgIdOptimized(orgId: string) {
  try {
    const userOrgRoles = await prisma.user_organization_role.findMany({
      where: { org_id: orgId },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstname: true,
            lastname: true,
            phone: true,
          },
        },
        role: {
          select: {
            id: true,
            name: true,
            abbreviation: true,
          },
        },
      },
    });

    // Gruppiere nach User
    const usersMap = new Map();
    
    userOrgRoles.forEach(userOrgRole => {
      const userId = userOrgRole.user.id;
      
      if (!usersMap.has(userId)) {
        usersMap.set(userId, {
          user: userOrgRole.user,
          roles: [],
        });
      }
      
      usersMap.get(userId).roles.push(userOrgRole.role);
    });

    return Array.from(usersMap.values());
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    throw new Error(`Failed to get users with roles by org ID: ${errorMessage}`);
  }
}
//#endregion
