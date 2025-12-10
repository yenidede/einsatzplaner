"use server";

import React from "react";
import { renderToBuffer } from "@react-pdf/renderer";
import { BookingConfirmationPDF_Group } from "./components/PDF_BookingConfirmation_Group";
import { BookingConfirmationPDF_School } from "./components/PDF_BookingConfirmation_School";
import { BookingConfirmationPDF_Fluchtwege_School } from "./components/PDF_BookingConfirmation_Fluchtwege_School";
import { validatePdfAccess } from "./lib/utils/authorization";
import { getEinsatzWithDetailsById } from "@/features/einsatz/dal-einsatz";
import { getUserByIdWithOrgAndRole } from "@/DataAccessLayer/user";
import { getOrganizationForPDF } from "@/features/settings/organization-action";
import type { Einsatz } from "@/features/einsatz/types";
import type { PDFActionResult } from "./types";
import { getEinsatzCategoriesForPDF } from "./category-action";
import prisma from "@/lib/prisma";

interface EinsatzCategory {
  id: string;
  value: string | null;
  abbreviation: string | null;
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
  showLogos?: boolean;
}

type PDFTemplateType = "gruppe" | "schule" | "fluchtwege";

async function determinePDFTemplate(
  einsatz: Einsatz,
  categories: EinsatzCategory[]
): Promise<PDFTemplateType> {
  const categoryValues = categories.map(
    (cat) => cat.value?.toLowerCase() || ""
  );

  // Prüfe ob Template-Feld "Schulstufe" existiert
  let hasSchulstufeField = false;

  if (
    (einsatz as any).einsatz_fields &&
    Array.isArray((einsatz as any).einsatz_fields)
  ) {
    const fieldIds = ((einsatz as any).einsatz_fields as any[]).map(
      (ef) => ef.field_id
    );

    if (fieldIds.length > 0) {
      const fields = await prisma.field.findMany({
        where: {
          id: { in: fieldIds },
        },
        select: {
          id: true,
          name: true,
        },
      });

      console.log(
        "Loaded field names:",
        fields.map((f) => f.name)
      );

      hasSchulstufeField = fields.some((f) =>
        f.name?.toLowerCase().includes("schulstufe")
      );
    }
  }

  // Prüfe auf Fluchtweg-Kategorie
  const hasFluchtwegCategory = categoryValues.some(
    (val) => val.includes("fluchtweg") || val.includes("fluchtwege")
  );

  console.log("PDF Template Detection - Start:", {
    einsatzId: einsatz.id,
    einsatzTitle: einsatz.title,
    categories: categories.map((c) => c.value),
    categoryValues,
    fields: (einsatz as any).einsatz_fields,
    checks: {
      hasSchulstufeField,
      hasFluchtwegCategory,
    },
  });

  let templateType: PDFTemplateType;
  let reason: string;

  // 1. Kategorie "Fluchtwege" + Feld "Schulstufe" → Fluchtwege-Schule-PDF
  if (hasFluchtwegCategory && hasSchulstufeField) {
    templateType = "fluchtwege";
    reason = 'Hat Kategorie "Fluchtwege" UND Template-Feld "Schulstufe"';
  }
  // 2. Nur Feld "Schulstufe" → Standard-Schul-PDF
  else if (hasSchulstufeField) {
    templateType = "schule";
    reason = 'Hat Template-Feld "Schulstufe" (ohne Fluchtweg-Kategorie)';
  }
  // 3. Standard → Gruppen-PDF
  else {
    templateType = "gruppe";
    reason = "Standard (keine Schulstufe, keine Fluchtwege)";
  }

  console.log("PDF Template Selection:", {
    templateType,
    reason,
    pdfComponent: {
      fluchtwege: "BookingConfirmationPDF_Fluchtwege_School",
      schule: "BookingConfirmationPDF_School",
      gruppe: "BookingConfirmationPDF_Group",
    }[templateType],
    filename: `${templateType}_template`,
  });

  return templateType;
}

function generateFilename(
  einsatz: Einsatz,
  templateType: PDFTemplateType
): string {
  const date = new Date(einsatz.start).toLocaleDateString("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
  const startTime = new Date(einsatz.start)
    .toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" })
    .replace(":", "-");

  const prefix = {
    fluchtwege: "Fuehrungsbestaetigung_Fluchtwege_Schule",
    schule: "Fuehrungsbestaetigung_Schule_Vlbg",
    gruppe: "Fuehrungsbestaetigung_Gruppe",
  }[templateType];

  return `${prefix}-${date}-${startTime}.pdf`;
}

export async function generateEinsatzPDF(
  einsatzId: string,
  options?: PDFOptions
): Promise<PDFActionResult> {
  console.log("\nPDF GENERATION STARTED ================");
  console.log("Input:", { einsatzId, options });

  try {
    if (!einsatzId) {
      console.error("Missing einsatzId");
      return {
        success: false,
        error: "einsatzId is required",
      };
    }

    console.log("Validating access...");
    const authResult = await validatePdfAccess(einsatzId);
    if (!authResult.authorized) {
      console.error("Access denied:", authResult.error);
      return {
        success: false,
        error: authResult.error || "Nicht autorisiert",
      };
    }
    console.log("Access granted");

    // Lade den aktuellen User (der das PDF erstellt)
    console.log("Loading current user...");
    const currentUser = authResult.userId
      ? await getUserByIdWithOrgAndRole(authResult.userId)
      : null;
    console.log(
      "Current user:",
      currentUser
        ? `${currentUser.firstname} ${currentUser.lastname}`
        : "Unknown"
    );

    console.log("Loading Einsatz data...");
    const einsatz = await getEinsatzWithDetailsById(einsatzId);
    if (!einsatz) {
      console.error("Einsatz not found");
      return {
        success: false,
        error: "Einsatz not found",
      };
    }
    if (einsatz instanceof Response) {
      console.error("Einsatz returned Response object");
      return {
        success: false,
        error: "Einsatz not found",
      };
    }
    console.log("Einsatz loaded:", {
      id: einsatz.id,
      title: einsatz.title,
      start: einsatz.start,
    });

    console.log("Processing categories...");
    const einsatzCategories = await getEinsatzCategoriesForPDF(einsatzId);

    console.log(
      "Categories:",
      einsatzCategories.map((c) => `${c.value} (${c.id})`)
    );

    console.log("👥 Loading assigned users...");
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
    console.log(
      "Assigned users:",
      assignedUsers.map((u) => `${u.firstname} ${u.lastname}`)
    );

    console.log("Loading organization...");
    const organization = await getOrganizationForPDF(einsatz.org_id);
    console.log("Organization:", organization?.name);

    const templateType = await determinePDFTemplate(einsatz, einsatzCategories);

    const PDFComponent = {
      fluchtwege: BookingConfirmationPDF_Fluchtwege_School,
      schule: BookingConfirmationPDF_School,
      gruppe: BookingConfirmationPDF_Group,
    }[templateType];

    console.log("Rendering PDF component...");
    const { Document } = await import("@react-pdf/renderer");
    const pdfBuffer = await renderToBuffer(
      React.createElement(
        Document,
        null,
        React.createElement(PDFComponent, {
          einsatz,
          einsatzCategories,
          organization,
          assignedUsers,
          currentUser: currentUser
            ? {
                id: currentUser.id,
                firstname: currentUser.firstname,
                lastname: currentUser.lastname,
                salutation: currentUser.salutation
                  ? {
                      id: currentUser.salutation.id,
                      salutation: currentUser.salutation.salutation,
                    }
                  : null,
              }
            : null,
          options,
        })
      )
    );
    console.log("PDF rendered, buffer size:", pdfBuffer.length, "bytes");

    const base64 = Buffer.from(pdfBuffer).toString("base64");
    const filename = generateFilename(einsatz, templateType);

    console.log("PDF Generation Success!");
    console.log("Filename:", filename);
    console.log("Base64 size:", base64.length, "characters");
    console.log("========== PDF GENERATION END ==========\n");

    return {
      success: true,
      data: {
        pdf: base64,
        filename,
        mimeType: "application/pdf",
      },
    };
  } catch (error) {
    console.error("❌ ========== PDF GENERATION FAILED ==========");
    console.error("Error:", error);
    console.error(
      "Stack:",
      error instanceof Error ? error.stack : "No stack trace"
    );
    console.error("==============================================\n");

    return {
      success: false,
      error: error instanceof Error ? error.message : "Failed to generate PDF",
    };
  }
}
