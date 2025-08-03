"use server"

import Prisma from "@/lib/prisma";

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
  }});
  
  console.log("Found users:", users.length, users);
  return users;
}