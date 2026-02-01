'use server';

import React from 'react';
import { renderToBuffer } from '@react-pdf/renderer';
import { BookingConfirmationPDF_Group } from './components/PDF_BookingConfirmation_Group';
import { BookingConfirmationPDF_School } from './components/PDF_BookingConfirmation_School';
import { BookingConfirmationPDF_Fluchtwege_School } from './components/PDF_BookingConfirmation_Fluchtwege_School';
import { validatePdfAccess } from './lib/utils/authorization';
import { getEinsatzWithDetailsById } from '@/features/einsatz/dal-einsatz';
import { getUserByIdWithOrgAndRole } from '@/DataAccessLayer/user';
import { getOrganizationForPDF } from '@/features/settings/organization-action';
import type { Einsatz, EinsatzDetailed } from '@/features/einsatz/types';
import type { PDFActionResult } from './types/types';
import { getEinsatzCategoriesForPDF } from './category-action';
import prisma from '@/lib/prisma';
import { ForbiddenError, NotFoundError } from '@/lib/errors';

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

type PDFTemplateType = 'gruppe' | 'schule' | 'fluchtwege';

async function determinePDFTemplate(
  einsatz: Einsatz,
  categories: EinsatzCategory[]
): Promise<PDFTemplateType> {
  const categoryValues = categories.map(
    (cat) => cat.value?.toLowerCase() || ''
  );

  const hasTitleSchule = einsatz.title.toLowerCase().includes('schule');

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

      hasSchulstufeField = fields.some(
        (f) =>
          f.name?.toLowerCase().includes('schulstufe') ||
          f.name?.toLowerCase().includes('schule')
      );
    }
  }

  const hasFluchtwegCategory = categoryValues.some(
    (val) => val.includes('fluchtweg') || val.includes('fluchtwege')
  );

  let templateType: PDFTemplateType;

  if (hasFluchtwegCategory && (hasSchulstufeField || hasTitleSchule)) {
    templateType = 'fluchtwege';
  } else if (hasSchulstufeField || hasTitleSchule) {
    templateType = 'schule';
  } else {
    templateType = 'gruppe';
  }

  return templateType;
}

function generateFilename(
  einsatz: Einsatz,
  templateType: PDFTemplateType
): string {
  const date = new Date(einsatz.start).toLocaleDateString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: '2-digit',
  });
  const startTime = new Date(einsatz.start)
    .toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' })
    .replace(':', '-');

  const prefix = {
    fluchtwege: 'Fuehrungsbestaetigung_Fluchtwege_Schule',
    schule: 'Fuehrungsbestaetigung_Schule_Vlbg',
    gruppe: 'Fuehrungsbestaetigung_Gruppe',
  }[templateType];

  return `${prefix}-${date}-${startTime}.pdf`;
}

export async function generateEinsatzPDF(
  einsatzId: string,
  options?: PDFOptions
): Promise<PDFActionResult> {
  try {
    if (!einsatzId) {
      console.error('Missing einsatzId');
      return {
        success: false,
        error: 'einsatzId is required',
      };
    }

    const authResult = await validatePdfAccess(einsatzId);
    if (!authResult.authorized) {
      console.error('Access denied:', authResult.error);
      return {
        success: false,
        error: authResult.error || 'Nicht autorisiert',
      };
    }

    const currentUser = authResult.userId
      ? await getUserByIdWithOrgAndRole(authResult.userId)
      : null;

    let einsatz: EinsatzDetailed | null;
    try {
      const result = await getEinsatzWithDetailsById(einsatzId);

      // Handle Response object
      if (result && typeof result === 'object' && 'status' in result) {
        return {
          success: false,
          error: 'Fehler beim Laden des Einsatzes',
        };
      }

      einsatz = result;
    } catch (err) {
      if (err instanceof ForbiddenError) {
        return {
          success: false,
          error: 'Nicht autorisiert',
        };
      }
      if (err instanceof NotFoundError) {
        return {
          success: false,
          error: 'Einsatz nicht gefunden',
        };
      }
      console.error('Error while loading Einsatz:', err);
      return {
        success: false,
        error:
          err instanceof Error
            ? err.message
            : 'Fehler beim Laden des Einsatzes',
      };
    }

    if (!einsatz) {
      return {
        success: false,
        error: 'Einsatz nicht gefunden',
      };
    }

    const einsatzCategories = await getEinsatzCategoriesForPDF(einsatzId);

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

    const templateType = await determinePDFTemplate(einsatz, einsatzCategories);

    const PDFComponent = {
      fluchtwege: BookingConfirmationPDF_Fluchtwege_School,
      schule: BookingConfirmationPDF_School,
      gruppe: BookingConfirmationPDF_Group,
    }[templateType];

    const { Document } = await import('@react-pdf/renderer');
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

    const base64 = Buffer.from(pdfBuffer).toString('base64');
    const filename = generateFilename(einsatz, templateType);

    return {
      success: true,
      data: {
        pdf: base64,
        filename,
        mimeType: 'application/pdf',
      },
    };
  } catch (error) {
    console.error('❌ ========== PDF GENERATION FAILED ==========');
    console.error('Error:', error);
    console.error(
      'Stack:',
      error instanceof Error ? error.stack : 'No stack trace'
    );
    console.error('==============================================\n');

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate PDF',
    };
  }
}
