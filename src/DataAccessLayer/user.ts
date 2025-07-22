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
    return prisma.user.findUnique({
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
              },
            },
            user_role_assignment: {
              include: {
                roles: {
                  select: {
                    id: true,
                    name: true,
                    abbreviation: true,
                  },
                },
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
    return prisma.user.findUnique({
      where: { id: userId },
      include: {
        user_organization_role: {
          include: {
            organization: true,
            user_role_assignment: {
              include: {
                roles: true,
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
    return prisma.user.create({
      data: {
        email: data.email,
        firstname: data.firstname,
        lastname: data.lastname,
        password: data.password,
        phone: data.phone,
        user_organization_role: {
          create: [
            {
              org_id: data.orgId,
              user_role_assignment: {
                connect: data.roleIds.map((id) => ({ id })),
              },
            },
          ],
        },
      },
      include: {
        user_organization_role: {
          include: {
            organization: {
              select: {
                name: true,
                helper_name_singular: true,
                helper_name_plural: true,
              },
            },
            user_role_assignment: {
              include: {
                roles: {
                  select: { name: true },
                },
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
            organization: {
              id: orgId,
            },
          },
        },
      },
      include: {
        user_organization_role: {
          include: {
            organization: {
              select: { id: true, name: true },
            },
            user_role_assignment: {
              include: {
                roles: true,
              },
            },
          },
        },
      },
    });
  } catch (error: any) {
    throw new Error(
      `Failed to retrieve users by organization ID: ${error.message}`
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
    return prisma.user.update({
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
    return prisma.user.findFirst({
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
  } catch (error) {
    throw new Error(`Failed to update user settings: ${error.message}`);
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

    const updateData = {
      hasGetMailNotification:
        body.getMailFromOrganization ?? currentUserOrg.hasGetMailNotification,
    };

    return prisma.user_organization_role.update({
      where: { id: userOrgId },
      data: updateData,
    });
  } catch (error) {
    throw new Error(
      `Failed to update user organization settings: ${error.message}`
    );
  }
}
//#endregion
