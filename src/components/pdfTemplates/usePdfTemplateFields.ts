'use client';

import { useMemo, useState } from 'react';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFieldGroup,
} from '@/features/pdf-templates/types';

export interface PdfTemplateFieldGroupDefinition {
  id: PdfTemplateFieldGroup;
  label: string;
  fields: PdfTemplateFieldDefinition[];
  count: number;
}

const GROUP_ORDER: PdfTemplateFieldGroup[] = [
  'organization',
  'einsatz',
  'contact_person',
  'participants',
  'custom',
];

const GROUP_LABELS: Record<PdfTemplateFieldGroup, string> = {
  organization: 'Organisation',
  einsatz: 'Einsatz',
  contact_person: 'Kontaktperson',
  participants: 'Teilnehmer',
  custom: 'Eigene Felder',
};

export function usePdfTemplateFields(fields: PdfTemplateFieldDefinition[]) {
  const [query, setQuery] = useState('');

  const filteredGroups = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();
    const groupedFields = new Map<PdfTemplateFieldGroup, PdfTemplateFieldDefinition[]>();

    for (const group of GROUP_ORDER) {
      groupedFields.set(group, []);
    }

    for (const field of fields) {
      const matchesQuery =
        normalizedQuery.length === 0 ||
        field.searchText.includes(normalizedQuery) ||
        GROUP_LABELS[field.group].toLowerCase().includes(normalizedQuery);

      if (!matchesQuery) {
        continue;
      }

      groupedFields.get(field.group)?.push(field);
    }

    return GROUP_ORDER.map((group) => {
      const groupFields = groupedFields.get(group) ?? [];

      const sortedFields = [...groupFields].sort((left, right) => {
        if (left.group === 'custom' && right.group === 'custom') {
          const subgroupOrder =
            (left.subgroup ?? '').localeCompare(right.subgroup ?? '', 'de');

          if (subgroupOrder !== 0) {
            return subgroupOrder;
          }
        }

        return left.label.localeCompare(right.label, 'de');
      });

      return {
        id: group,
        label: GROUP_LABELS[group],
        fields: sortedFields,
        count: sortedFields.length,
      };
    }).filter((group) => group.count > 0);
  }, [fields, query]);

  return {
    query,
    setQuery,
    filteredGroups,
    hasActiveQuery: query.trim().length > 0,
  };
}
