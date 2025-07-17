import prisma from '@/lib/prisma';
import { hash } from 'crypto';

export async function getUserByEmail(email: string) {
    return await prisma.user.findUnique({
        where: { email },
        include: {
            user_organization_role: {
                include: {
                    roles: true,
                    organization: true
                }
            }
        }
    });
}

export async function createUserWithOrgAndRole(data: {
  email: string;
  firstname?: string;
  lastname?: string;
  password: string;
  phone?: string;
  orgId: string;
  roleId: string;
}) {
  return prisma.user.create({
    data: {
      email: data.email,
      firstname: data.firstname,
      lastname: data.lastname,
      password: data.password,
      phone: data.phone,
      user_organization_role: {
        create: [{
          organization: { connect: { id: data.orgId } },
          roles: { connect: { id: data.roleId } },
        }],
      },
    },
    include: {
      user_organization_role: {
        include: {
          organization: true,
          roles: true,
        },
      },
    },
  });
}

export async function getUserByIdWithOrgAndRole(userId: string) {
    return await prisma.user.findUnique({
        where: { id: userId },
        include: {
            user_organization_role: {
                include: {
                    organization: true,
                    roles: true,
                },
            },
        },
    });
}
export async function getOrCreateOrganizationByName(name: string) {
    let organization = await prisma.organization.findFirst({
        where: { name }
    });
    if (!organization) {
        organization = await prisma.organization.create({
            data: { name }
        });
    }
    return organization;
}

export async function getOrCreateRoleByName(name: string) {
    let role = await prisma.roles.findFirst({
        where: { name }
    });
    if (!role) {
        role = await prisma.roles.create({
            data: { name }
        });
    }
    return role;

}

export async function updateLastLogin(userId: string) {
    return await prisma.user.update({
        where: { id: userId },
        data: {
            last_login: new Date(),
            updated_at: new Date(),
        },
    });
  }

//#region Reset Password DAL
export async function updateUserResetToken(email: string, resetToken: string, resetTokenExpiry: Date) {
    return await prisma.user.update({
        where: { email },
        data: {
            resetToken,
            resetTokenExpires: resetTokenExpiry,
            updated_at: new Date(),
        },
    });
}


export async function getUserWithValidResetToken(token: string) {
    return await prisma.user.findFirst({
        where: {
            resetToken: token,
            resetTokenExpires: {
                gt: new Date()
            }
        }
    });
}

export async function resetUserPassword(user: { id: string }, hashedPassword: string) {
    return await prisma.user.update({
        where: { id: user.id },
        data: {
            password: hashedPassword,
            updated_at: new Date(),
            resetToken: null,
            resetTokenExpires: null
        }
    });
}
//#endregion