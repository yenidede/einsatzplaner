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
  is_paused?: boolean;
  participant_count_default?: number | null;
  participant_count_placeholder?: number | null;
  price_person_default?: number | null;
  price_person_placeholder?: number | null;
  helpers_needed_default?: number | null;
  helpers_needed_placeholder?: number | null;
  all_day_default?: boolean | null;
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
        include: {
          field: {
            include: {
              type: { select: { datatype: true } },
            },
          },
        },
      },
    },
  });
  console.log(templates.map(t => t.anmerkung_default));
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
        include: {
          field: {
            include: {
              type: { select: { datatype: true } },
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

export async function deleteTemplate(id: string) {
  const { session } = await requireAuth();

  const template = await prisma.einsatz_template.findUnique({
    where: { id },
    select: { org_id: true },
  });

  if (!template?.org_id) {
    throw new Error('Vorlage nicht gefunden.');
  }

  if (!session.user.orgIds.includes(template.org_id)) {
    throw new Error('Keine Berechtigung, diese Vorlage zu löschen.');
  }

  return prisma.einsatz_template.delete({
    where: { id },
  });
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
    is_paused: input.is_paused,
    participant_count_default: input.participant_count_default,
    participant_count_placeholder: input.participant_count_placeholder,
    price_person_default: input.price_person_default,
    price_person_placeholder: input.price_person_placeholder,
    helpers_needed_default: input.helpers_needed_default,
    helpers_needed_placeholder: input.helpers_needed_placeholder,
    all_day_default: input.all_day_default,
  });
}

export async function deleteTemplateAction(templateId: string) {
  return deleteTemplate(templateId);
}

export type UpdateTemplateFieldInput = CreateTemplateFieldInput;

async function checkTemplateFieldAccess(
  templateId: string,
  fieldId: string
): Promise<{ orgId: string }> {
  const { session } = await requireAuth();

  const template = await prisma.einsatz_template.findUnique({
    where: { id: templateId },
    select: { org_id: true },
  });

  if (!template?.org_id) {
    throw new Error('Vorlage nicht gefunden.');
  }

  if (!session.user.orgIds.includes(template.org_id)) {
    throw new Error(
      'Keine Berechtigung, Felder dieser Vorlage zu bearbeiten oder zu löschen.'
    );
  }

  const link = await prisma.template_field.findFirst({
    where: { template_id: templateId, field_id: fieldId },
  });

  if (!link) {
    throw new Error('Feld gehört nicht zu dieser Vorlage.');
  }

  return { orgId: template.org_id };
}

export async function updateTemplateField(
  templateId: string,
  fieldId: string,
  input: UpdateTemplateFieldInput
) {
  await checkTemplateFieldAccess(templateId, fieldId);

  const typeId = await ensureTypeExists(input.datatype);

  return prisma.field.update({
    where: { id: fieldId },
    data: {
      name: input.name,
      type_id: typeId,
      is_required: input.isRequired,
      placeholder: input.placeholder ?? null,
      default_value: input.defaultValue ?? null,
      is_multiline: input.isMultiline ?? null,
      min: input.min ?? null,
      max: input.max ?? null,
      allowed_values: input.allowedValues ?? [],
    },
  });
}

export async function deleteTemplateField(
  templateId: string,
  fieldId: string
): Promise<void> {
  await checkTemplateFieldAccess(templateId, fieldId);

  await prisma.template_field.deleteMany({
    where: { template_id: templateId, field_id: fieldId },
  });

  await prisma.field.delete({
    where: { id: fieldId },
  });
}

export async function createTemplateFieldAction(
  templateId: string,
  config: PropertyConfig
) {
  const fieldInput = propertyConfigToFieldInput(config);
  return createTemplateField(templateId, fieldInput);
}

export async function updateTemplateFieldAction(
  templateId: string,
  fieldId: string,
  config: PropertyConfig
) {
  const fieldInput = propertyConfigToFieldInput(config);
  return updateTemplateField(templateId, fieldId, fieldInput);
}

export async function deleteTemplateFieldAction(
  templateId: string,
  fieldId: string
): Promise<void> {
  return deleteTemplateField(templateId, fieldId);
}
