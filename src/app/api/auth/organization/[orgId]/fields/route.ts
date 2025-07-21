import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

/* // Felder einer Organisation
export async function GET(req: Request, { params }: { params: { orgId: string } }) {
    const fields = await prisma.custom_field.findMany({
        where: { : params.orgId }
    });
    return NextResponse.json(fields);
} */