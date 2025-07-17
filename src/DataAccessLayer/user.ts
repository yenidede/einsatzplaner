import prisma from '@/lib/prisma';

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