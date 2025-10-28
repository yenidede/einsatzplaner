import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "@/features/invitations/services/InvitationService";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  const token = await params.token
  try {
    const invitation = await InvitationService.validateInvitation(token);
    return NextResponse.json(invitation);
  } catch (error) {
    console.error("Error validating invitation:", error);
    
    if (error instanceof Error) {
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Fehler beim Validieren der Einladung" },
      { status: 500 }
    );
  }
}