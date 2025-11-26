import { NextRequest, NextResponse } from "next/server";
import { InvitationService } from "@/features/invitations/services/InvitationService";

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    console.log("Starting invitation cleanup and reminder cron job...");

    const cleanedCount = await InvitationService.cleanupExpiredInvitations();

    const remindersSent = await InvitationService.sendReminderEmails();

    console.log("Invitation cron job completed successfully");

    return NextResponse.json(
      {
        success: true,
        cleanedCount,
        remindersSent,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("Invitation cron job failed:", error);

    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 500 }
    );
  }
}
