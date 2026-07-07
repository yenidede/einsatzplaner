import { describe, expect, it } from 'vitest';
import { documentTemplateBlockGroups } from './document-template-block-groups';

describe('Dokumentbaustein-Gruppen', () => {
  it('ordnet bestehende und fachliche Bausteine den UX-Gruppen zu', () => {
    const groups = new Map(
      documentTemplateBlockGroups.map((group) => [
        group.label,
        group.items.map((item) => item.id),
      ])
    );

    expect(groups.get('Text')).toEqual(['heading', 'paragraph']);
    expect(groups.get('Struktur / Layout')).toEqual(
      expect.arrayContaining([
        'dataOverview',
        'table',
        'columns',
        'infoBox',
        'divider',
        'spacer',
        'pageBreak',
      ])
    );
    expect(groups.has('Einsatzplaner')).toBe(false);
    expect(groups.get('Abschluss')).toEqual(['signature']);
    expect(
      documentTemplateBlockGroups.flatMap((group) =>
        group.items.map((item) => item.id)
      )
    ).not.toEqual(expect.arrayContaining(['header', 'footer', 'pageNumber']));
    expect(groups.get('Medien')).toEqual(['image', 'logo']);
  });
});
