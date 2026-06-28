'use client';

import type {
  DocumentTemplateFieldDefinition,
  DocumentTemplateRecord,
} from '@/features/document-template/types';
import { DocumentTemplateEditorView } from './components/DocumentTemplateEditorView';
import { useDocumentTemplateEditorController } from './hooks/useDocumentTemplateEditorController';

export function DocumentTemplateEditor({
  organizationId,
  template,
  fields,
  einsatzNameSingular,
}: {
  organizationId: string;
  template?: DocumentTemplateRecord | null;
  fields: DocumentTemplateFieldDefinition[];
  einsatzNameSingular?: string;
}) {
  const controller = useDocumentTemplateEditorController({
    organizationId,
    template,
    fields,
    einsatzNameSingular,
  });

  return <DocumentTemplateEditorView controller={controller} />;
}
