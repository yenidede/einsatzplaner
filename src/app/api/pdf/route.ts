export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import React from "react";
import { Document, renderToBuffer } from "@react-pdf/renderer";
import { validatePdfAccess } from "@/features/pdf/lib/utils/authorization";
import { BookingConfirmationPDF } from "@/features/pdf/components/BookingConfirmationPDF";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import { Einsatz } from "@/features/einsatz/types";
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user";
import { getOrganizationForPDF } from "@/features/settings/organization-action";

// ✅ Types
interface EinsatzCategory {
  id: string;
  value: string | null;
  label: string | null;
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

    const assignedUsers: AssignedUser[] = assignedUsersRaw
      .filter((user): user is NonNullable<typeof user> => user !== null)
      .map((user) => ({
        id: user.id,
        firstname: user.firstname,
        lastname: user.lastname,
        salutation: user.salutation
          ? {
              id: user.salutation.id,
              salutation: user.salutation.salutation,
            }
          : null,
      }));

    const organization = await getOrganizationForPDF(einsatz.org_id);

    console.log("📊 PDF Generation Data:", {
      einsatzId: einsatz.id,
      orgName: organization.name,
      addressesCount: organization.addresses.length,
      bankAccountsCount: organization.bankAccounts.length,
      hasDetails: !!organization.details,
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
