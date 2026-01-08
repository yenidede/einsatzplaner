'use server';

import { getTemplateById } from '@/features/template/template-dal';
import {
  generateDynamicSchema,
  mapFieldsForSchema,
} from '@/components/event-calendar/utils';
import { EinsatzCreate } from './types';

async function ValidateDynamicFormFields(templateId: string) {
  const template = await getTemplateById(templateId);
  if (!template) {
    throw new Error('Template not found');
  }
  const fields = template.template_field;

  const mappedFields = mapFieldsForSchema(fields);
  const schema = generateDynamicSchema(mappedFields);

  try {
    return schema.parse(FormData);
  } catch (error) {
    throw new Error(`Validation failed: ${error}`);
  }
}

export async function ValidateEinsatzCreate(einsatz: EinsatzCreate) {
  const errors: Record<string, string[]> = {};
}
