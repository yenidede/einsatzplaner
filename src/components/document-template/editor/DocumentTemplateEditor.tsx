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
}: {
  organizationId: string;
  template?: DocumentTemplateRecord | null;
  fields: DocumentTemplateFieldDefinition[];
}) {
  const controller = useDocumentTemplateEditorController({
    organizationId,
    template,
    fields,
  });

  return <DocumentTemplateEditorView controller={controller} />;
}
