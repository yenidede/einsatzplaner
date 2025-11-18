export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { Document, renderToBuffer } from "@react-pdf/renderer";
import { validatePdfAccess } from "@/features/pdf/lib/utils/authorization";
import { BookingConfirmationPDF } from "@/features/pdf/components/BookingConfirmationPDF";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import { Einsatz } from "@/features/einsatz/types";
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user";
import { getOrganizationById } from "@/features/settings/organization-action";
import { getOneSalutationAction } from "@/features/settings/settings-action";

// ✅ Types
interface EinsatzCategory {
  id: string;
  value: string | null;
  label: string | null;
}

interface Organization {
  id: string;
  name: string;
  logo_url: string | null;
  email: string | null;
  website?: string | null;
  phone?: string | null;
}

interface AssignedUser {
  id: string;
  firstname: string | null;
  lastname: string | null;
  salutation?: {
    id: string;
    salutation: string;
  } | null;
}

// ✅ Filename Generator
function generateFilename(einsatz: Einsatz): string {
  const date = new Date(einsatz.start).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const startTime = new Date(einsatz.start)
    .toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "-");

  return `Fuehrungsbestaetigung-${date}-${startTime}.pdf`;
}

export async function POST(request: NextRequest) {
  try {
    const { einsatzId, options } = await request.json();

    if (!einsatzId) {
      return NextResponse.json(
        { error: "einsatzId is required" },
        { status: 400 }
      );
    }

    const authResult = await validatePdfAccess(einsatzId);
    if (!authResult.authorized) {
      return NextResponse.json(
        { error: authResult.error },
        { status: authResult.status }
      );
    }

    const einsatz = await getEinsatzWithDetailsById(einsatzId);
    if (!einsatz) {
      return NextResponse.json({ error: "Einsatz not found" }, { status: 404 });
    }

    const einsatzCategories: EinsatzCategory[] = Array.isArray(
      einsatz.categories
    )
      ? einsatz.categories.map((cat: string) => ({
          id: cat,
          value: cat,
          label: cat,
        }))
      : [];

    const assignedUsersRaw = await Promise.all(
      einsatz.assigned_users?.map((userId: string) =>
        getUserByIdWithOrgAndRole(userId)
      ) || []
    );
    //console.log("🔍 Assigned Users Raw:", assignedUsersRaw);

    const assignedUsers: AssignedUser[] = await Promise.all(
      assignedUsersRaw
        .filter((user): user is NonNullable<typeof user> => user !== null)
        .map(async (user) => ({
          id: user.id,
          firstname: user.firstname,
          lastname: user.lastname,
          salutation: user.salutationId
            ? await getOneSalutationAction(user.salutationId)
            : null,
        }))
    );
    //console.log("✅ Assigned Users Loaded:", assignedUsers);

    const organizationData = await getOrganizationById(einsatz.org_id);

    if (!organizationData) {
      console.error("❌ Organization not found for org_id:", einsatz.org_id);
      return NextResponse.json(
        { error: "Organization not found" },
        { status: 404 }
      );
    }

    const organization: Organization = {
      id: organizationData.id,
      name: organizationData.name,
      logo_url: organizationData.logo_url,
      email: organizationData.email,
      // TODO (Ömer): Website für Organisation in der DB erstellen
      website: organizationData.website ?? null,
      phone: organizationData.phone ?? null,
    };

    console.log("📊 PDF Generation Data:", {
      einsatzId: einsatz.id,
      orgName: organization.name,
      assignedUsersCount: assignedUsers.length,
      categoriesCount: einsatzCategories.length,
    });

    const documentElement = React.createElement(
      Document,
      null,
      React.createElement(BookingConfirmationPDF, {
        einsatz,
        einsatzCategories,
        organization,
        assignedUsers,
        options,
      })
    );

    const pdfBuffer = await renderToBuffer(documentElement);
    //console.log("✅ PDF Buffer generated:", pdfBuffer.byteLength, "bytes");

    const filename = generateFilename(einsatz);

    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Length": pdfBuffer.byteLength.toString(),
      },
    });
  } catch (error) {
    console.error("❌ PDF Generation Error:", error);

    return NextResponse.json(
      {
        error: "Failed to generate PDF",
        message: error instanceof Error ? error.message : "Unknown error",
        stack:
          process.env.NODE_ENV === "development" && error instanceof Error
            ? error.stack
            : undefined,
      },
      { status: 500 }
    );
  }
}
