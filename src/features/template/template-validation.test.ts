import { describe, expect, it } from 'vitest';

import {
  TEMPLATE_DESCRIPTION_MAX_LENGTH,
  getTemplateDescriptionLength,
  normalizeTemplateDescription,
  templateDescriptionSchema,
} from './template-validation';

describe('template validation', () => {
  it('akzeptiert eine Beschreibung mit maximal 120 Zeichen', () => {
    const description = 'a'.repeat(TEMPLATE_DESCRIPTION_MAX_LENGTH);

    expect(templateDescriptionSchema.parse(description)).toBe(description);
  });

  it('lehnt eine Beschreibung mit mehr als 120 Zeichen ab', () => {
    const description = 'a'.repeat(TEMPLATE_DESCRIPTION_MAX_LENGTH + 1);

    expect(() => templateDescriptionSchema.parse(description)).toThrow(
      'Die Beschreibung darf höchstens 120 Zeichen lang sein.'
    );
  });

  it('trimmt die Beschreibung und wandelt Leerwerte in null um', () => {
    expect(normalizeTemplateDescription('  Beschreibung  ')).toBe(
      'Beschreibung'
    );
    expect(normalizeTemplateDescription('   ')).toBeNull();
    expect(normalizeTemplateDescription(undefined)).toBeUndefined();
  });

  it('misst die normalisierte Länge der Beschreibung', () => {
    expect(getTemplateDescriptionLength('  Beschreibung  ')).toBe(12);
    expect(getTemplateDescriptionLength('   ')).toBe(0);
    expect(getTemplateDescriptionLength(undefined)).toBe(0);
  });
});
