'use server';

import prisma from '@/lib/prisma';
import type { einsatz_template as Template } from '@/generated/prisma';
import type { PropertyConfig } from '@/features/user_properties/types';
import { propertyConfigToFieldInput } from '@/features/user_properties/utils/config-to-field-input';
import { hasPermission, requireAuth } from '@/lib/auth/authGuard';

export type CreateTemplateInput = {
  org_id: string;
  name: string;
  icon_id: string;
  description?: string | null;
};

export type UpdateTemplateInput = {
  name?: string | null;
  icon_id?: string;
  description?: string | null;
};

export async function getAllTemplatesByIds(ids: string[]) {
  const templates = await prisma.einsatz_template.findMany({
    where: { id: { in: ids } },
  });
  return templates;
}

export async function getAllTemplatesByOrgIds(org_ids: string[]) {
  const templates = await prisma.einsatz_template.findMany({
    where: { org_id: { in: org_ids } },
  });
  return templates;
}

export async function getAllTemplatesWithIconByOrgId(org_id: string) {
  const templates = await prisma.einsatz_template.findMany({
    where: { org_id },
    include: {
      template_icon: {
        select: {
          icon_url: true,
        },
      },
      template_field: {
        select: {
          field: {
            select: {
              id: true,
              name: true,
              type: {
                select: {
                  datatype: true,
                },
              },
              is_required: true,
              placeholder: true,
              default_value: true,
              group_name: true,
              is_multiline: true,
              min: true,
              max: true,
              allowed_values: true,
            },
          },
        },
      },
    },
  });
  return templates;
}

export async function getTemplateById(id: string) {
  const template = await prisma.einsatz_template.findUnique({
    where: { id },
    include: {
      template_icon: {
        select: {
          icon_url: true,
        },
      },
      template_field: {
        select: {
          field: {
            select: {
              id: true,
              name: true,
              type: {
                select: {
                  datatype: true,
                },
              },
              is_required: true,
              placeholder: true,
              default_value: true,
              group_name: true,
              is_multiline: true,
              min: true,
              max: true,
              allowed_values: true,
            },
          },
        },
      },
    },
  });
  return template;
}

// TODO: auth
export async function createTemplate(data: Template) {
  const { session, userIds } = await requireAuth();

  if (!hasPermission(session, 'templates:create', userIds.orgId)) {
    throw new Error("Fehlende Berechtigungen zum Erstellen der Vorlage.")
  }

  const template = await prisma.einsatz_template.create({
    data,
  });
  return template;
}

// TODO: auth
export async function updateTemplate(
  id: string,
  data: Partial<Omit<Template, 'id' | 'created_at'>>
) {
  const { session, userIds } = await requireAuth();

  if (!hasPermission(session, 'templates:update', userIds.orgId)) {
    throw new Error('Fehlende Berechtigungen zum Aktualisieren der Vorlage.');
  }

  const template = await prisma.einsatz_template.update({
    where: { id },
    data,
  });
  return template;
}

// TODO: auth
export async function deleteTemplate(id: string) {
  const template = await prisma.einsatz_template.delete({
    where: { id },
  });
  return template;
}

export async function getAllTemplateIcons() {
  return prisma.template_icon.findMany({
    orderBy: { id: 'asc' },
  });
}

export type CreateTemplateFieldInput = {
  name: string;
  description?: string;
  datatype: 'text' | 'number' | 'boolean' | 'select';
  isRequired: boolean;
  placeholder?: string;
  defaultValue?: string;
  isMultiline?: boolean;
  min?: number;
  max?: number;
  allowedValues?: string[];
};

async function ensureTypeExists(datatype: string): Promise<string> {
  let type = await prisma.type.findFirst({
    where: { datatype },
  });

  if (!type) {
    type = await prisma.type.create({
      data: {
        name: datatype,
        datatype: datatype,
        description: `Auto-generated type for ${datatype}`,
      },
    });
  }

  return type.id;
}

export async function createTemplateField(
  templateId: string,
  input: CreateTemplateFieldInput
) {
  const { session } = await requireAuth();

  const template = await prisma.einsatz_template.findUnique({
    where: { id: templateId },
    select: { org_id: true },
  });

  if (!template) {
    throw new Error('Vorlage nicht gefunden.');
  }

  const orgId = template.org_id;
  if (!orgId || !session.user.orgIds.includes(orgId)) {
    throw new Error('Keine Berechtigung, Felder zu dieser Vorlage hinzuzufügen.');
  }

  const typeId = await ensureTypeExists(input.datatype);

  const field = await prisma.field.create({
    data: {
      name: input.name,
      type_id: typeId,
      is_required: input.isRequired,
      placeholder: input.placeholder,
      default_value: input.defaultValue,
      is_multiline: input.isMultiline,
      min: input.min,
      max: input.max,
      allowed_values: input.allowedValues ?? [],
    },
  });

  await prisma.template_field.create({
    data: {
      template_id: templateId,
      field_id: field.id,
    },
  });

  return field;
}

export async function createTemplateAction(input: CreateTemplateInput) {
  const { session, userIds } = await requireAuth();

  if (!hasPermission(session, 'templates:create', userIds.orgId)) {
    throw new Error('Fehlende Berechtigungen zum Erstellen der Vorlage.');
  }

  return prisma.einsatz_template.create({
    data: {
      org_id: input.org_id,
      name: input.name,
      icon_id: input.icon_id,
      description: input.description ?? null,
    },
  });
}

export async function updateTemplateAction(
  templateId: string,
  input: UpdateTemplateInput
) {
  return updateTemplate(templateId, {
    name: input.name ?? undefined,
    icon_id: input.icon_id,
    description: input.description ?? undefined,
  });
}

export async function createTemplateFieldAction(
  templateId: string,
  config: PropertyConfig
) {
  const fieldInput = propertyConfigToFieldInput(config);
  return createTemplateField(templateId, fieldInput);
}
