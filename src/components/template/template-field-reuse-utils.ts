import type { TemplateFieldReuseCandidate } from '@/features/template/template-dal';

export function normalizeTemplateFieldSearchValue(value: string): string {
  return value
    .trim()
    .toLocaleLowerCase('de-AT')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

export function getTemplateFieldSearchParts(
  candidate: TemplateFieldReuseCandidate
): string[] {
  return [
    candidate.name,
    candidate.description ?? '',
    candidate.typeName ?? '',
    candidate.datatype ?? '',
    candidate.linkedTemplateNames.join(' '),
  ];
}
