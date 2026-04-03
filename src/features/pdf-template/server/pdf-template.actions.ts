'use server';

import type { Template } from '@pdfme/common';
import type {
  PdfTemplateFooterConfig,
  PdfTemplateListItem,
  PdfTemplateRecord,
} from '@/features/pdf-template/types';
import {
  createPdfTemplate as createPdfTemplateService,
  deletePdfTemplate as deletePdfTemplateService,
  duplicatePdfTemplate as duplicatePdfTemplateService,
  generateBookingConfirmationPdf,
  getDefaultPdfTemplateByOrganization,
  getPdfTemplateById as getPdfTemplateByIdService,
  getPdfTemplatePreviewData,
  getPdfTemplatesByOrganization as getPdfTemplatesByOrganizationService,
  setDefaultPdfTemplate as setDefaultPdfTemplateService,
  updatePdfTemplate as updatePdfTemplateService,
} from '@/features/pdf-template/server/pdf-template.service';
import {
  getBookingConfirmationPreviewOptions,
  buildBookingConfirmationPdfInput,
} from '@/features/pdf-template/lib/pdf-template-inputs';
import { PDF_TEMPLATE_DOCUMENT_TYPE } from '@/features/pdf-template/types';

export async function createPdfTemplate(data: {
  organizationId: string;
  name?: string;
  template?: Template;
  isDefault?: boolean;
  isActive?: boolean;
  sampleEinsatzId?: string | null;
  footer?: PdfTemplateFooterConfig | null;
}): Promise<PdfTemplateRecord> {
  return createPdfTemplateService({
    organizationId: data.organizationId,
    name: data.name,
    template: data.template,
    documentType: PDF_TEMPLATE_DOCUMENT_TYPE,
    isDefault: data.isDefault,
    isActive: data.isActive,
    sampleEinsatzId: data.sampleEinsatzId,
    footer: data.footer,
  });
}

export async function updatePdfTemplate(
  id: string,
  data: {
    name?: string;
    template?: Template;
    isActive?: boolean;
    sampleEinsatzId?: string | null;
    footer?: PdfTemplateFooterConfig | null;
  }
): Promise<PdfTemplateRecord> {
  return updatePdfTemplateService({
    id,
    name: data.name,
    template: data.template,
    isActive: data.isActive,
    sampleEinsatzId: data.sampleEinsatzId,
    footer: data.footer,
  });
}

export async function getPdfTemplatesByOrganization(
  organizationId: string
): Promise<PdfTemplateListItem[]> {
  return getPdfTemplatesByOrganizationService(organizationId);
}

export async function getPdfTemplates(
  organizationId: string
): Promise<Array<{ id: string; name: string }>> {
  const templates = await getPdfTemplatesByOrganizationService(organizationId);

  return templates
    .filter((template) => template.isActive)
    .map((template) => ({
      id: template.id,
      name: template.name,
    }));
}

export async function getPdfTemplateById(
  id: string
): Promise<PdfTemplateRecord | null> {
  return getPdfTemplateByIdService(id);
}

export async function deletePdfTemplate(id: string): Promise<void> {
  return deletePdfTemplateService(id);
}

export async function duplicatePdfTemplate(
  id: string
): Promise<PdfTemplateRecord> {
  return duplicatePdfTemplateService(id);
}

export async function setDefaultPdfTemplate(
  id: string
): Promise<PdfTemplateRecord> {
  return setDefaultPdfTemplateService(id);
}

export async function getDefaultOrganizationPdfTemplate(
  organizationId: string
): Promise<PdfTemplateRecord | null> {
  return getDefaultPdfTemplateByOrganization(organizationId);
}

export async function generatePdfForAssignment(
  assignmentId: string,
  templateId?: string | null
): Promise<{
  success: boolean;
  data?: {
    pdf: string;
    filename: string;
    mimeType: string;
    source: 'pdfme' | 'legacy';
  };
  error?: string;
}> {
  return generateBookingConfirmationPdf(assignmentId, templateId ?? undefined);
}

export async function getPdfTemplatePreview(
  templateId: string,
  einsatzId?: string | null
) {
  return getPdfTemplatePreviewData({
    templateId,
    einsatzId,
  });
}

export async function getPdfPreviewAssignments(
  organizationId: string,
  preferredEinsatzId?: string | null
) {
  return getBookingConfirmationPreviewOptions(
    organizationId,
    preferredEinsatzId
  );
}

export async function getPdfPreviewInput(einsatzId?: string | null) {
  if (!einsatzId) {
    return {
      organisation_name: 'Beispielorganisation',
      organisation_email: 'office@example.org',
      organisation_adressen:
        'Musterstraße 1, 1010 Wien, Österreich',
      organisation_bankkonten:
        'Musterbank, AT12 3456 7890 1234 5678, ABCDATWW',
      organisation_adressen_tabelle: [
        ['Hauptstandort', 'Musterstraße 1, 1010 Wien, Österreich'],
      ],
      organisation_bankkonten_tabelle: [
        ['Musterbank', 'AT12 3456 7890 1234 5678', 'ABCDATWW'],
      ],
      einsatz_titel: 'Beispiel Einsatz',
      einsatz_start_datum_formatiert: '24.03.2026',
      einsatz_zeitraum_formatiert: '09:00 - 11:00',
      einsatz_preis_gesamt_formatiert: 'EUR 0,00',
    };
  }

  return buildBookingConfirmationPdfInput(einsatzId);
}
