'use server';

import { revalidatePath } from 'next/cache';
import { createClient } from '@supabase/supabase-js';
import prisma from '@/lib/prisma';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';
import { ForbiddenError, NotFoundError } from '@/lib/errors';
import {
  DOCUMENT_TEMPLATE_DOCUMENT_TYPE,
  type DocumentTemplateContent,
  type DocumentTemplateListItem,
  type DocumentTemplateRecord,
  type PrismaDocumentTemplate,
} from '@/features/document-template/types';
import {
  createDocumentTemplateRecord,
  deleteDocumentTemplateRecord,
  findDocumentTemplateById,
  findDocumentTemplatesByOrganization,
  updateDocumentTemplateRecord,
} from './document-template.dal';
import {
  normalizeDocumentTemplateContent,
  serializeDocumentTemplateContent,
} from '@/features/document-template/lib/document-template-storage';
import { createDefaultDocumentTemplateContent } from '@/features/document-template/lib/document-template-defaults';
import { getDocumentTemplateFieldDefinitions } from '@/features/document-template/lib/document-template-fields';
import { resolveDocumentTemplateFields } from '@/features/document-template/lib/document-field-resolver';
import { renderDocumentTemplateDocx } from '@/features/document-template/lib/document-docx-exporter';
import { renderDocumentTemplatePdf } from '@/features/document-template/lib/document-pdf-exporter';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

const supabaseStorage =
  supabaseUrl && supabaseServiceRoleKey
    ? createClient(supabaseUrl, supabaseServiceRoleKey, {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      })
    : null;

function mapRowToRecord(row: PrismaDocumentTemplate): DocumentTemplateRecord {
  const content = normalizeDocumentTemplateContent(row.contentJson);

  return {
    id: row.id,
    organizationId: row.organizationId,
    name: row.name,
    description: content.meta.description,
    isActive: row.isActive,
    isDefault: content.meta.isDefault,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    content,
  };
}

function mapRowToListItem(
  row: PrismaDocumentTemplate
): DocumentTemplateListItem {
  const record = mapRowToRecord(row);

  return {
    id: record.id,
    organizationId: record.organizationId,
    name: record.name,
    description: record.description,
    isActive: record.isActive,
    isDefault: record.isDefault,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

async function assertTemplatePermission(
  organizationId: string,
  action:
    | 'templates:read'
    | 'templates:create'
    | 'templates:update'
    | 'templates:delete'
) {
  const { session } = await requireAuth();
  if (!(await hasPermission(session, action, organizationId))) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }
}

async function assertEinsatzReadPermission(organizationId: string) {
  const { session } = await requireAuth();
  if (!(await hasPermission(session, 'einsaetze:read', organizationId))) {
    throw new ForbiddenError('Fehlende Berechtigung');
  }
}

function revalidateDocumentTemplatePaths(organizationId: string, id?: string) {
  revalidatePath(`/settings/org/${organizationId}`);
  revalidatePath(`/settings/org/${organizationId}/document-templates`);
  if (id) {
    revalidatePath(
      `/settings/org/${organizationId}/document-templates/${id}/edit`
    );
  }
}

function filenamePart(value: string) {
  return value
    .replace(/[^a-zA-Z0-9-_]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .slice(0, 80);
}

export async function getDocumentTemplatesByOrganization(
  organizationId: string
): Promise<DocumentTemplateListItem[]> {
  await assertTemplatePermission(organizationId, 'templates:read');
  const rows = await findDocumentTemplatesByOrganization(organizationId);
  return rows.map(mapRowToListItem);
}

export async function getDocumentTemplateById(
  id: string
): Promise<DocumentTemplateRecord | null> {
  const row = await findDocumentTemplateById(id);
  if (!row) {
    return null;
  }

  await assertTemplatePermission(row.organizationId, 'templates:read');
  return mapRowToRecord(row);
}

export async function getDocumentTemplateFields(organizationId: string) {
  await assertTemplatePermission(organizationId, 'templates:read');
  return getDocumentTemplateFieldDefinitions(organizationId);
}

export async function getOrganizationDocumentTemplateLogoUrl(
  organizationId: string
): Promise<string | null> {
  await assertTemplatePermission(organizationId, 'templates:read');

  const organization = await prisma.organization.findUnique({
    where: { id: organizationId },
    select: {
      logo_url: true,
      small_logo_url: true,
    },
  });

  return organization?.logo_url ?? organization?.small_logo_url ?? null;
}

export async function createDocumentTemplate(data: {
  organizationId: string;
  name: string;
  description: string;
  content?: DocumentTemplateContent;
  isDefault?: boolean;
}): Promise<DocumentTemplateRecord> {
  await assertTemplatePermission(data.organizationId, 'templates:create');

  const content = data.content ?? createDefaultDocumentTemplateContent();
  const created = await createDocumentTemplateRecord({
    organizationId: data.organizationId,
    name: data.name.trim() || 'Neue Dokumentvorlage',
    isActive: true,
    contentJson: serializeDocumentTemplateContent({
      ...content,
      meta: {
        ...content.meta,
        description: data.description,
        isDefault: data.isDefault ?? false,
      },
    }),
  });

  if (data.isDefault) {
    return setDefaultDocumentTemplate(created.id);
  }

  revalidateDocumentTemplatePaths(data.organizationId, created.id);
  return mapRowToRecord(created);
}

export async function updateDocumentTemplate(data: {
  id: string;
  name: string;
  description: string;
  content: DocumentTemplateContent;
  isActive?: boolean;
}): Promise<DocumentTemplateRecord> {
  const existing = await findDocumentTemplateById(data.id);
  if (!existing) {
    throw new NotFoundError('Dokumentvorlage nicht gefunden');
  }

  await assertTemplatePermission(existing.organizationId, 'templates:update');
  const current = mapRowToRecord(existing);
  const updated = await updateDocumentTemplateRecord(data.id, {
    name: data.name.trim() || current.name,
    isActive: data.isActive ?? current.isActive,
    contentJson: serializeDocumentTemplateContent({
      ...data.content,
      meta: {
        ...data.content.meta,
        description: data.description,
        isDefault: current.isDefault,
      },
    }),
  });

  revalidateDocumentTemplatePaths(existing.organizationId, data.id);
  return mapRowToRecord(updated);
}

export async function duplicateDocumentTemplate(
  id: string
): Promise<DocumentTemplateRecord> {
  const existing = await findDocumentTemplateById(id);
  if (!existing) {
    throw new NotFoundError('Dokumentvorlage nicht gefunden');
  }

  await assertTemplatePermission(existing.organizationId, 'templates:create');
  const current = mapRowToRecord(existing);
  return createDocumentTemplate({
    organizationId: current.organizationId,
    name: `${current.name} (Kopie)`,
    description: current.description,
    content: {
      ...current.content,
      meta: {
        ...current.content.meta,
        isDefault: false,
      },
    },
    isDefault: false,
  });
}

export async function deleteDocumentTemplate(id: string): Promise<void> {
  const existing = await findDocumentTemplateById(id);
  if (!existing) {
    throw new NotFoundError('Dokumentvorlage nicht gefunden');
  }

  await assertTemplatePermission(existing.organizationId, 'templates:delete');
  await deleteDocumentTemplateRecord(id);
  revalidateDocumentTemplatePaths(existing.organizationId, id);
}

export async function setDefaultDocumentTemplate(
  id: string
): Promise<DocumentTemplateRecord> {
  const target = await findDocumentTemplateById(id);
  if (!target) {
    throw new NotFoundError('Dokumentvorlage nicht gefunden');
  }

  await assertTemplatePermission(target.organizationId, 'templates:update');

  await prisma.$transaction(async (tx) => {
    const rows = await tx.pdfTemplate.findMany({
      where: {
        organizationId: target.organizationId,
        documentType: DOCUMENT_TEMPLATE_DOCUMENT_TYPE,
      },
    });

    for (const row of rows) {
      const content = normalizeDocumentTemplateContent(row.contentJson);
      const shouldBeDefault = row.id === id;
      if (content.meta.isDefault === shouldBeDefault) {
        continue;
      }

      await tx.pdfTemplate.update({
        where: { id: row.id },
        data: {
          contentJson: serializeDocumentTemplateContent({
            ...content,
            meta: {
              ...content.meta,
              isDefault: shouldBeDefault,
            },
          }),
          updatedAt: new Date(),
        },
      });
    }
  });

  const updated = await findDocumentTemplateById(id);
  if (!updated) {
    throw new NotFoundError('Dokumentvorlage nicht gefunden');
  }

  revalidateDocumentTemplatePaths(target.organizationId, id);
  return mapRowToRecord(updated);
}

export async function getDefaultDocumentTemplate(
  organizationId: string
): Promise<DocumentTemplateRecord | null> {
  await assertTemplatePermission(organizationId, 'templates:read');
  const rows = await findDocumentTemplatesByOrganization(organizationId);
  return (
    rows
      .map(mapRowToRecord)
      .find((template) => template.isDefault && template.isActive) ?? null
  );
}

export async function getDocumentTemplatePreview(args: {
  templateId: string;
  einsatzId?: string | null;
}) {
  const template = await getDocumentTemplateById(args.templateId);
  if (!template) {
    throw new NotFoundError('Dokumentvorlage nicht gefunden');
  }

  const fields = await resolveDocumentTemplateFields({
    organizationId: template.organizationId,
    einsatzId: args.einsatzId ?? template.content.meta.sampleEinsatzId,
  });

  return {
    template,
    fields,
  };
}

export async function exportDocumentTemplateForAssignment(args: {
  assignmentId: string;
  templateId?: string | null;
  format: 'docx' | 'pdf';
}): Promise<{
  success: boolean;
  data?: {
    file: string;
    filename: string;
    mimeType: string;
  };
  error?: string;
}> {
  try {
    const assignment = await prisma.einsatz.findUnique({
      where: { id: args.assignmentId },
      select: {
        id: true,
        title: true,
        start: true,
        org_id: true,
      },
    });

    if (!assignment) {
      return { success: false, error: 'Einsatz nicht gefunden' };
    }

    await assertEinsatzReadPermission(assignment.org_id);

    const template = args.templateId
      ? await getDocumentTemplateById(args.templateId)
      : await getDefaultDocumentTemplate(assignment.org_id);

    if (!template || template.organizationId !== assignment.org_id) {
      return {
        success: false,
        error: 'Dokumentvorlage nicht gefunden',
      };
    }

    const fields = await resolveDocumentTemplateFields({
      organizationId: assignment.org_id,
      einsatzId: assignment.id,
    });
    const buffer =
      args.format === 'docx'
        ? await renderDocumentTemplateDocx({
            templateName: template.name,
            content: template.content,
            fields,
          })
        : await renderDocumentTemplatePdf({
            content: template.content,
            fields,
          });
    const date = assignment.start.toISOString().slice(0, 10);
    const baseName = filenamePart(template.name || assignment.title);
    const extension = args.format;

    return {
      success: true,
      data: {
        file: buffer.toString('base64'),
        filename: `${baseName || 'dokument'}_${date}.${extension}`,
        mimeType:
          args.format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf',
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Dokument konnte nicht erzeugt werden',
    };
  }
}

export async function exportDocumentTemplatePreview(args: {
  organizationId: string;
  name: string;
  content: DocumentTemplateContent;
  format: 'docx' | 'pdf';
}): Promise<{
  success: boolean;
  data?: {
    file: string;
    filename: string;
    mimeType: string;
  };
  error?: string;
}> {
  try {
    await assertTemplatePermission(args.organizationId, 'templates:read');
    const fields = await resolveDocumentTemplateFields({
      organizationId: args.organizationId,
      einsatzId: args.content.meta.sampleEinsatzId,
    });
    const buffer =
      args.format === 'docx'
        ? await renderDocumentTemplateDocx({
            templateName: args.name,
            content: args.content,
            fields,
          })
        : await renderDocumentTemplatePdf({
            content: args.content,
            fields,
          });

    return {
      success: true,
      data: {
        file: buffer.toString('base64'),
        filename: `${filenamePart(args.name || 'dokumentvorlage')}.${args.format}`,
        mimeType:
          args.format === 'docx'
            ? 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
            : 'application/pdf',
      },
    };
  } catch (error) {
    return {
      success: false,
      error:
        error instanceof Error
          ? error.message
          : 'Dokument konnte nicht erzeugt werden',
    };
  }
}

export async function uploadDocumentTemplateImage(formData: FormData): Promise<{
  url: string;
}> {
  const organizationId = formData.get('organizationId');
  const file = formData.get('image');

  if (typeof organizationId !== 'string' || !organizationId) {
    throw new Error('Organisation fehlt.');
  }

  if (!(file instanceof File)) {
    throw new Error('Bitte wählen Sie eine Bilddatei aus.');
  }

  await assertTemplatePermission(organizationId, 'templates:create');

  if (!file.type.startsWith('image/')) {
    throw new Error('Bitte wählen Sie eine Bilddatei aus.');
  }

  const allowedTypes = new Set([
    'image/png',
    'image/jpeg',
    'image/jpg',
    'image/webp',
  ]);

  if (!allowedTypes.has(file.type)) {
    throw new Error('Unterstützt werden PNG, JPG/JPEG und WebP.');
  }

  if (file.size > 5 * 1024 * 1024) {
    throw new Error('Das Bild darf maximal 5 MB groß sein.');
  }

  if (!supabaseStorage) {
    const buffer = Buffer.from(await file.arrayBuffer());
    return {
      url: `data:${file.type};base64,${buffer.toString('base64')}`,
    };
  }

  const extension = file.name.split('.').pop()?.toLowerCase() ?? 'png';
  const filePath = `document-templates/${organizationId}/${crypto.randomUUID()}.${extension}`;
  const buffer = await file.arrayBuffer();

  const { error } = await supabaseStorage.storage
    .from('logos')
    .upload(filePath, buffer, {
      contentType: file.type,
      cacheControl: '3600',
      upsert: false,
    });

  if (error) {
    throw new Error(`Bild konnte nicht hochgeladen werden: ${error.message}`);
  }

  const { data } = supabaseStorage.storage.from('logos').getPublicUrl(filePath);

  return {
    url: data.publicUrl,
  };
}
