'use client';

import { useMemo, useState } from 'react';
import type { PdfTemplateFieldDefinition } from '@/features/pdf-templates/types';

export function usePdfTemplateFields(fields: PdfTemplateFieldDefinition[]) {
  const [query, setQuery] = useState('');

  const filteredFields = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    if (!normalizedQuery) {
      return fields;
    }

    return fields.filter((field) => {
      return (
        field.label.toLowerCase().includes(normalizedQuery) ||
        field.key.toLowerCase().includes(normalizedQuery)
      );
    });
  }, [fields, query]);

  return {
    query,
    setQuery,
    filteredFields,
  };
}

