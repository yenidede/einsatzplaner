"use server";

import prisma from "@/lib/prisma";
import type { einsatz_status as EinsatzStatus } from "@/generated/prisma";

let cachedStatuses: EinsatzStatus[] | null = null;

async function GetStatuses() {
    if (!cachedStatuses) {
        const statuses = await prisma.einsatz_status.findMany();
        cachedStatuses = statuses;
    }
    return cachedStatuses;
}

export async function GetStatusById(id: string) {
    const statuses = await GetStatuses();
    return statuses.find(status => status.id === id) || null;
}