'use server';

import { revalidatePath } from 'next/cache';
import type { Template } from '@pdfme/common';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import prisma from '@/lib/prisma';
import { generateEinsatzPDF } from '@/features/pdf/pdf-action';
import { generatePdfmeDocument } from '@/features/pdf/pdfme-generate';
import { buildBookingConfirmationPdfInput } from './pdf-template-input';
import {
  createDefaultStoredPdfTemplate,
  createPdfTemplateName,
} from './pdf-template-default';
import {
  createPdfTemplateRecord,
  deletePdfTemplateRecord,
  findPdfTemplateById,
  findPdfTemplatesByOrganization,
  updatePdfTemplateRecord,
} from './pdf-template-dal';
import {
  normalizeStoredPdfTemplateDocument,
  serializeStoredPdfTemplateDocument,
} from './pdf-template-helpers';
import {
  PDF_TEMPLATE_DOCUMENT_TYPE,
  type PdfTemplateInput,
  type PdfTemplateListItem,
  type PdfTemplateRecord,
  type PrismaPdfTemplate,
} from './types';

function mapRowToRecord(row: PrismaPdfTemplate): PdfTemplateRecord {
  const document = normalizeStoredPdfTemplateDocument(row.contentJson);

  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    documentType: row.documentType,
    isActive: row.isActive,
    isDefault: document.meta?.isDefault ?? false,
    version: document.meta?.version ?? 1,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    template: document.template,
    sampleEinsatzId: document.meta?.sampleEinsatzId ?? null,
  };
}

function mapRowToListItem(row: PrismaPdfTemplate): PdfTemplateListItem {
  const record = mapRowToRecord(row);

  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    documentType: record.documentType,
    isActive: record.isActive,
    isDefault: record.isDefault,
    version: record.version,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function assertTemplatePermission(
  organizationId: string,
  action: 'templates:read' | 'templates:create' | 'templates:update' | 'templates:delete'
): Promise<void> {
  const { session } = await requireAuth();
  const allowed = await hasPermission(session, action, organizationId);

  if (!allowed) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }
}

async function assertEinsatzReadPermission(orgId: string): Promise<void> {
  const { session } = await requireAuth();
  const allowed = await hasPermission(session, 'einsaetze:read', orgId);

  if (!allowed) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }
}

function templateChanged(previousTemplate: Template, nextTemplate: Template): boolean {
  return JSON.stringify(previousTemplate) !== JSON.stringify(nextTemplate);
}

export async function createPdfTemplate(args: {
  organizationId: string;
  name?: string;
  documentType?: string;
  template?: Template;
  isActive?: boolean;
  isDefault?: boolean;
  sampleEinsatzId?: string | null;
}): Promise<PdfTemplateRecord> {
  await assertTemplatePermission(args.organizationId, 'templates:create');

  const defaultDocument = createDefaultStoredPdfTemplate();
  const created = await createPdfTemplateRecord({
    organizationId: args.organizationId,
    name: args.name?.trim() || createPdfTemplateName(),
    documentType: args.documentType ?? PDF_TEMPLATE_DOCUMENT_TYPE,
    isActive: args.isActive ?? true,
    contentJson: serializeStoredPdfTemplateDocument({
      template: args.template ?? defaultDocument.template,
      meta: {
        isDefault: args.isDefault ?? false,
        version: 1,
        sampleEinsatzId: args.sampleEinsatzId ?? null,
      },
    }),
  });

  if (args.isDefault) {
    await setDefaultPdfTemplate(created.id);
    const updated = await findPdfTemplateById(created.id);

    if (!updated) {
      throw new NotFoundError('Vorlage nicht gefunden');
    }

    revalidatePath('/settings/pdf-templates');
    return mapRowToRecord(updated);
  }

  revalidatePath('/settings/pdf-templates');
  return mapRowToRecord(created);
}

export async function updatePdfTemplate(args: {
  id: string;
  name?: string;
  template?: Template;
  isActive?: boolean;
  sampleEinsatzId?: string | null;
}): Promise<PdfTemplateRecord> {
  const existing = await findPdfTemplateById(args.id);

  if (!existing) {
    throw new NotFoundError('Vorlage nicht gefunden');
  }

  await assertTemplatePermission(existing.organizationId, 'templates:update');

  const current = mapRowToRecord(existing);
  const nextTemplate = args.template ?? current.template;
  const nextVersion = templateChanged(current.template, nextTemplate)
    ? current.version + 1
    : current.version;

  const updated = await updatePdfTemplateRecord(args.id, {
    name: args.name?.trim() ?? current.name,
    isActive: args.isActive ?? current.isActive,
    contentJson: serializeStoredPdfTemplateDocument({
      template: nextTemplate,
      meta: {
        isDefault: current.isDefault,
        version: nextVersion,
        sampleEinsatzId:
          args.sampleEinsatzId !== undefined
            ? args.sampleEinsatzId
            : current.sampleEinsatzId,
      },
    }),
  });

  revalidatePath('/settings/pdf-templates');
  revalidatePath(`/settings/pdf-templates/${args.id}/edit`);

  return mapRowToRecord(updated);
}

export async function getPdfTemplatesByOrganization(
  organizationId: string
): Promise<PdfTemplateListItem[]> {
  await assertTemplatePermission(organizationId, 'templates:read');

  const rows = await findPdfTemplatesByOrganization(organizationId);
  return rows.map(mapRowToListItem);
}

export async function getPdfTemplateById(id: string): Promise<PdfTemplateRecord | null> {
  const row = await findPdfTemplateById(id);

  if (!row) {
    return null;
  }

  await assertTemplatePermission(row.organizationId, 'templates:read');
  return mapRowToRecord(row);
}

export async function deletePdfTemplate(id: string): Promise<void> {
  const row = await findPdfTemplateById(id);

  if (!row) {
    throw new NotFoundError('Vorlage nicht gefunden');
  }

  await assertTemplatePermission(row.organizationId, 'templates:delete');
  await deletePdfTemplateRecord(id);

  revalidatePath('/settings/pdf-templates');
}

export async function duplicatePdfTemplate(id: string): Promise<PdfTemplateRecord> {
  const row = await findPdfTemplateById(id);

  if (!row) {
    throw new NotFoundError('Vorlage nicht gefunden');
  }

  await assertTemplatePermission(row.organizationId, 'templates:create');

  const current = mapRowToRecord(row);

  return createPdfTemplate({
    organizationId: current.organizationId,
    name: `${current.name} (Kopie)`,
    documentType: current.documentType,
    template: current.template,
    isActive: current.isActive,
    isDefault: false,
    sampleEinsatzId: current.sampleEinsatzId,
  });
}

export async function setDefaultPdfTemplate(id: string): Promise<PdfTemplateRecord> {
  const targetRow = await findPdfTemplateById(id);

  if (!targetRow) {
    throw new NotFoundError('Vorlage nicht gefunden');
  }

  await assertTemplatePermission(targetRow.organizationId, 'templates:update');

  await prisma.$transaction(async (tx) => {
    const relatedTemplates = await tx.pdfTemplate.findMany({
      where: {
        organizationId: targetRow.organizationId,
        documentType: targetRow.documentType,
      },
    });

    for (const template of relatedTemplates) {
      const document = normalizeStoredPdfTemplateDocument(template.contentJson);
      const shouldBeDefault = template.id === id;

      if ((document.meta?.isDefault ?? false) === shouldBeDefault) {
        continue;
      }

      await tx.pdfTemplate.update({
        where: { id: template.id },
        data: {
          contentJson: serializeStoredPdfTemplateDocument({
            template: document.template,
            meta: {
              isDefault: shouldBeDefault,
              version: document.meta?.version ?? 1,
              sampleEinsatzId: document.meta?.sampleEinsatzId ?? null,
            },
          }),
          updatedAt: new Date(),
        },
      });
    }
  });

  const updated = await findPdfTemplateById(id);

  if (!updated) {
    throw new NotFoundError('Vorlage nicht gefunden');
  }

  revalidatePath('/settings/pdf-templates');
  return mapRowToRecord(updated);
}

export async function getDefaultPdfTemplateByOrganization(
  organizationId: string,
  documentType = PDF_TEMPLATE_DOCUMENT_TYPE
): Promise<PdfTemplateRecord | null> {
  await assertTemplatePermission(organizationId, 'templates:read');

  const templates = await findPdfTemplatesByOrganization(organizationId);
  const activeDefault = templates
    .map(mapRowToRecord)
    .find(
      (template) =>
        template.documentType === documentType &&
        template.isActive &&
        template.isDefault
    );

  return activeDefault ?? null;
}

export async function getPdfTemplatePreviewData(args: {
  templateId: string;
  einsatzId?: string | null;
}): Promise<{
  template: Template;
  input: PdfTemplateInput;
  templateName: string;
  sampleEinsatzId: string | null;
}> {
  const template = await getPdfTemplateById(args.templateId);

  if (!template) {
    throw new NotFoundError('Vorlage nicht gefunden');
  }

  const previewEinsatzId = args.einsatzId ?? template.sampleEinsatzId;

  if (!previewEinsatzId) {
    return {
      template: template.template,
      templateName: template.name,
      sampleEinsatzId: null,
      input: {
        organisation_name: 'Beispielorganisation',
        organisation_email: 'office@example.org',
        einsatz_titel: 'Beispiel Einsatz',
        einsatz_start_datum_formatiert: '24.03.2026',
        einsatz_zeitraum_formatiert: '09:00 - 11:00',
        einsatz_preis_gesamt_formatiert: 'EUR 0,00',
      },
    };
  }

  const input = await buildBookingConfirmationPdfInput(previewEinsatzId);

  return {
    template: template.template,
    input,
    templateName: template.name,
    sampleEinsatzId: previewEinsatzId,
  };
}

export async function generateBookingConfirmationPdf(einsatzId: string): Promise<{
  success: boolean;
  data?: {
    pdf: string;
    filename: string;
    mimeType: string;
    source: 'pdfme' | 'legacy';
  };
  error?: string;
}> {
  try {
    const einsatz = await prisma.einsatz.findUnique({
      where: { id: einsatzId },
      select: {
        id: true,
        title: true,
        start: true,
        org_id: true,
      },
    });

    if (!einsatz) {
      return {
        success: false,
        error: 'Einsatz nicht gefunden',
      };
    }

    await assertEinsatzReadPermission(einsatz.org_id);

    const defaultTemplate = await getDefaultPdfTemplateByOrganization(
      einsatz.org_id,
      PDF_TEMPLATE_DOCUMENT_TYPE
    );

    if (!defaultTemplate) {
      const legacyResult = await generateEinsatzPDF(einsatzId);

      if (!legacyResult.success || !legacyResult.data) {
        return {
          success: false,
          error: legacyResult.error ?? 'PDF konnte nicht erzeugt werden',
        };
      }

      return {
        success: true,
        data: {
          ...legacyResult.data,
          source: 'legacy',
        },
      };
    }

    const input = await buildBookingConfirmationPdfInput(einsatzId);
    const pdfBytes = await generatePdfmeDocument({
      template: defaultTemplate.template,
      input,
    });

    const filenameTitle = einsatz.title
      .replace(/[^a-zA-Z0-9-_]+/g, '_')
      .replace(/^_+|_+$/g, '');
    const filenameDate = einsatz.start.toISOString().slice(0, 10);

    return {
      success: true,
      data: {
        pdf: Buffer.from(pdfBytes).toString('base64'),
        filename: `buchungsbestaetigung_${filenameTitle || 'einsatz'}_${filenameDate}.pdf`,
        mimeType: 'application/pdf',
        source: 'pdfme',
      },
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'PDF konnte nicht erzeugt werden',
    };
  }
}
