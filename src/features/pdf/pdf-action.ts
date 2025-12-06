"use server";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BookingConfirmationPDF } from "./components/BookingConfirmationPDF";
import { validatePdfAccess } from "./lib/utils/authorization";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user";
import { getOrganizationForPDF } from "@/features/settings/organization-action";
import type { Einsatz } from "@/features/einsatz/types";
import type { PDFActionResult } from "./types";

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

interface PDFOptions {
  includeSignature?: boolean;
  includeDetails?: boolean;
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

export async function generateEinsatzPDF(
  einsatzId: string,
  options?: PDFOptions
): Promise<PDFActionResult> {
  try {
    if (!einsatzId) {
      return {
        success: false,
        error: "einsatzId is required",
      };
    }

    const authResult = await validatePdfAccess(einsatzId);
    if (!authResult.authorized) {
      return {
        success: false,
        error: authResult.error || "Nicht autorisiert",
      };
    }

    const einsatz = await getEinsatzWithDetailsById(einsatzId);
    if (!einsatz) {
      return {
        success: false,
        error: "Einsatz not found",
      };
    }
    if (einsatz instanceof Response) {
      return {
        success: false,
        error: "Einsatz not found",
      };
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

    /*     console.log(" PDF Generation Data:", {
      einsatzId: einsatz.id,
      orgName: organization.name,
      addressesCount: organization.addresses.length,
      bankAccountsCount: organization.bankAccounts.length,
      hasDetails: !!organization.details,
      assignedUsersCount: assignedUsers.length,
      categoriesCount: einsatzCategories.length,
    }); */

    const { Document } = await import("@react-pdf/renderer");
    const pdfBuffer = await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(BookingConfirmationPDF, {
          einsatz,
          einsatzCategories,
          organization,
          assignedUsers,
        })
      )
    );

    const base64 = Buffer.from(pdfBuffer).toString("base64");

    const filename = generateFilename(einsatz);

    return {
      success: true,
      data: {
        pdf: base64,
        filename,
        mimeType: "application/pdf",
      },
    };
  } catch (error) {
    console.error("❌ PDF Generation Error:", error);

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
