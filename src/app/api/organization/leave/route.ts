import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

export async function POST(req: Request) {
  try {
    const { userId, organizationId } = await req.json();
    if (!userId || !organizationId) {
      return NextResponse.json({ error: "userId und organizationId sind erforderlich" }, { status: 400 });
    }

    await prisma.user_organization_role.deleteMany({
      where: {
        user_id: userId,
        org_id: organizationId, // du hast bestätigt: org_id ist korrekt
      },
    });

    return NextResponse.json({ message: "Organisation erfolgreich verlassen" });
  } catch (err) {
    console.error("leave org error:", err);
    return NextResponse.json({ error: "Fehler beim Verlassen der Organisation" }, { status: 500 });
  }
}