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
  einsatzNamePlural,
}: {
  organizationId: string;
  template?: DocumentTemplateRecord | null;
  fields: DocumentTemplateFieldDefinition[];
  einsatzNamePlural?: string;
}) {
  const controller = useDocumentTemplateEditorController({
    organizationId,
    template,
    fields,
    einsatzNamePlural,
  });

  return <DocumentTemplateEditorView controller={controller} />;
}
