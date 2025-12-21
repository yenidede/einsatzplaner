"use server"

import Prisma from "@/lib/prisma";
import { actionClient } from "@/lib/safe-action";
import { formSchema as registerFormSchema } from "../../app/(pages)/(auth)/signup/register-schema";

export async function getAllUsersWithRolesByOrgIds(org_ids: string[], role: string | null = null) {
  const roleFilter = role ? { role: { name: role } } : {};

  const users = await Prisma.user.findMany({
    where: {
      user_organization_role: {
        some: {
          org_id: { in: org_ids },
          ...roleFilter,
        }
      },
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      user_organization_role: {
        where: {
          org_id: { in: org_ids },
          ...roleFilter,
        },
        select: {
          id: true,
          role: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            }
          },
        },
      },
    }
  });
  return users;
}

export async function getAllUsersWithRolesByOrgId(org_id: string, role: string | null = null) {


  const roleFilter = role ? { role: { name: role } } : {};

  const users = await Prisma.user.findMany({
    where: {
      user_organization_role: {
        some: {
          org_id: org_id,
          ...roleFilter,
        }
      },
    },
    select: {
      id: true,
      firstname: true,
      lastname: true,
      email: true,
      user_organization_role: {
        where: {
          org_id: org_id,
          ...roleFilter,
        },
        select: {
          id: true,
          role: {
            select: {
              id: true,
              name: true,
              abbreviation: true,
            }
          },
        },
      },
    }
  });
  return users;
}

export async function setUserActiveOrganization(userId: string, orgId: string) {
  try {
    const user = await Prisma.user.update({
      where: {
        id: userId,
      },
      data: {
        active_org: orgId,
      },
    });
    return user;
  } catch (error: Error | unknown) {
    console.error("Error updating user's active organization:", error);
  }
}

export const serverAction = actionClient
  .inputSchema(registerFormSchema)
  .action(async ({ parsedInput }) => {
    // do something with the data
    console.log(parsedInput);
    return {
      success: true,
      message: "Form submitted successfully",
    };
  });