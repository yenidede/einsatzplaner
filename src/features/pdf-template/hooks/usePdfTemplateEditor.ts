'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getPdfPreviewInput } from '@/features/pdf-template/server/pdf-template.actions';
import { pdfTemplateQueryKeys } from '@/features/pdf-template/lib/queryKeys';
import type { PdfTemplateInput } from '@/features/pdf-template/types';

export const MOCK_PREVIEW_EINSATZ_ID = 'mock';

interface UsePdfTemplateEditorOptions {
  initialSampleEinsatzId: string | null;
  emptyPreviewInput: PdfTemplateInput;
}

export function usePdfTemplateEditor({
  initialSampleEinsatzId,
  emptyPreviewInput,
}: UsePdfTemplateEditorOptions) {
  const [selectedPreviewEinsatzId, setSelectedPreviewEinsatzId] = useState(
    initialSampleEinsatzId ?? MOCK_PREVIEW_EINSATZ_ID
  );
  const previewAssignmentId =
    selectedPreviewEinsatzId === MOCK_PREVIEW_EINSATZ_ID
      ? null
      : selectedPreviewEinsatzId;

  const previewInputQuery = useQuery<PdfTemplateInput>({
    queryKey: pdfTemplateQueryKeys.previewInput(previewAssignmentId),
    queryFn: () => getPdfPreviewInput(previewAssignmentId),
    placeholderData: (previousData) => previousData,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  return {
    previewAssignmentId,
    previewInput: previewInputQuery.data ?? emptyPreviewInput,
    previewInputQuery,
    selectedPreviewEinsatzId,
    setSelectedPreviewEinsatzId,
  };
}
