import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "@/features/invitations/services/InvitationService";

type RouteContext = {
  params: Promise<{ token: string }>;
};

export async function GET(request: NextRequest, context: RouteContext) {
  const token = (await context.params).token;
  try {
    const invitation = await InvitationService.validateInvitation(token);
    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error validating invitation:", error);

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Fehler beim Validieren der Einladung" },
      { status: 500 }
    );
  }
}
