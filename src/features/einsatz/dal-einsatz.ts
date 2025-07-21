"use server";

import prisma from "@/lib/prisma";
import type { einsatz as Einsatz } from "@/generated/prisma";



export async function getEinsatzByIdFromDb(id: string, org_id: string): Promise<Einsatz | null> {
  return prisma.einsatz.findUnique({
    where: { id, org_id },
    include: {
      user: true,
    },
  });
}

export async function getAllEinsaetzeFromDb(): Promise<Einsatz[]> {
  return prisma.einsatz.findMany({
    include: {
      user: true,
    },
  });
}
