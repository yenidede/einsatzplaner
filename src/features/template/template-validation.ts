import { z } from 'zod';

export const TEMPLATE_DESCRIPTION_MAX_LENGTH = 120;

export const templateDescriptionSchema = z.preprocess(
  (val) => {
    if (val === undefined || val === null) return null;
    if (typeof val === 'string') {
      const trimmed = val.trim();
      return trimmed === '' ? null : trimmed;
    }
    return val;
  },
  z.union([
    z
      .string()
      .max(
        TEMPLATE_DESCRIPTION_MAX_LENGTH,
        `Die Beschreibung darf höchstens ${TEMPLATE_DESCRIPTION_MAX_LENGTH} Zeichen lang sein.`
      ),
    z.null(),
  ])
);

export function normalizeTemplateDescription(
  value: string | null | undefined
): string | null | undefined {
  if (value === undefined) return undefined;
  if (value === null) return null;

  const trimmed = value.trim();
  if (trimmed === '') return null;

  if (trimmed.length > TEMPLATE_DESCRIPTION_MAX_LENGTH) {
    throw new Error(
      `Die Beschreibung darf höchstens ${TEMPLATE_DESCRIPTION_MAX_LENGTH} Zeichen lang sein.`
    );
  }

  return trimmed;
}

export function getTemplateDescriptionLength(
  value: string | null | undefined
): number {
  if (typeof value !== 'string') {
    return 0;
  }

  return value.trim().length;
}
