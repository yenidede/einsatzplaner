import { useCallback, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import type {
  DocumentTemplateContent,
  DocumentTemplateRecord,
} from '@/features/document-template/types';
import {
  createDocumentTemplate,
  updateDocumentTemplate,
} from '@/features/document-template/server/document-template.actions';
import type { SaveStatus } from '../types/documentTemplateEditorTypes';

export function useDocumentTemplateSave({
  organizationId,
  template,
  name,
  description,
  currentContent,
}: {
  organizationId: string;
  template?: DocumentTemplateRecord | null;
  name: string;
  description: string;
  currentContent: () => DocumentTemplateContent;
}) {
  const router = useRouter();
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');

  const markDirty = useCallback(() => {
    setSaveStatus((current) => (current === 'saving' ? current : 'dirty'));
  }, []);

  async function handleSave() {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const saved = template
        ? await updateDocumentTemplate({
            id: template.id,
            name,
            description,
            content: currentContent(),
          })
        : await createDocumentTemplate({
            organizationId,
            name,
            description,
            content: currentContent(),
          });

      toast.success('Dokumentvorlage wurde gespeichert.');
      setSaveStatus('saved');
      router.push(
        `/settings/org/${organizationId}/document-templates/${saved.id}/edit`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Die Dokumentvorlage konnte nicht gespeichert werden.'
      );
      setSaveStatus('dirty');
    } finally {
      setIsSaving(false);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return { handleSave, isSaving, markDirty, saveStatus };
}
