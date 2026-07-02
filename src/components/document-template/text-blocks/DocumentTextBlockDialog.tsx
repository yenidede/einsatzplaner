'use client';

import { useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { EditorContent, useEditor } from '@tiptap/react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';
import type { DocumentTextBlock } from '@/features/document-text-block/types';
import { createEditorExtensions, toRichTextNode } from '../editor/utils/documentTemplateEditorUtils';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

const formSchema = z.object({
  name: z.string().trim().min(1, 'Bitte geben Sie einen Namen ein.'),
  description: z.string().max(500),
  category: z.string().max(80),
});

type FormValues = z.infer<typeof formSchema>;

const emptyDocument: DocumentTemplateRichTextNode = {
  type: 'doc',
  content: [{ type: 'paragraph' }],
};

export function DocumentTextBlockDialog({
  open,
  textBlock,
  initialDocument,
  title = textBlock ? 'Textbaustein bearbeiten' : 'Neuer Textbaustein',
  onOpenChange,
  onSubmit,
}: {
  open: boolean;
  textBlock?: DocumentTextBlock | null;
  initialDocument?: DocumentTemplateRichTextNode | null;
  title?: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (values: FormValues & { document: DocumentTemplateRichTextNode }) => Promise<void>;
}) {
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: { name: '', description: '', category: '' },
  });
  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content: emptyDocument,
    editorProps: {
      attributes: {
        class: 'document-template-prose min-h-40 rounded-md border p-3 outline-none',
      },
    },
  });

  useEffect(() => {
    if (!open) return;
    form.reset({
      name: textBlock?.name ?? '',
      description: textBlock?.description ?? '',
      category: textBlock?.category ?? '',
    });
    editor?.commands.setContent(
      textBlock?.document ?? initialDocument ?? emptyDocument,
      { emitUpdate: false }
    );
  }, [editor, form, initialDocument, open, textBlock]);

  async function handleSubmit(values: FormValues) {
    if (!editor || editor.getText().trim().length === 0) {
      form.setError('name', {
        type: 'validate',
        message: 'Der Inhalt des Textbausteins darf nicht leer sein.',
      });
      return;
    }
    await onSubmit({ ...values, document: toRichTextNode(editor.getJSON()) });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Der Inhalt wird als bearbeitbare Kopie in Dokumentvorlagen eingefügt.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={form.handleSubmit(handleSubmit)}>
          <FieldGroup>
            <Field data-invalid={Boolean(form.formState.errors.name)}>
              <FieldLabel htmlFor="text-block-name">Name</FieldLabel>
              <Input
                id="text-block-name"
                aria-invalid={Boolean(form.formState.errors.name)}
                {...form.register('name')}
              />
              <FieldError errors={[form.formState.errors.name]} />
            </Field>
            <Field>
              <FieldLabel htmlFor="text-block-description">Beschreibung</FieldLabel>
              <Textarea id="text-block-description" {...form.register('description')} />
            </Field>
            <Field>
              <FieldLabel htmlFor="text-block-category">Kategorie</FieldLabel>
              <Input
                id="text-block-category"
                placeholder="z. B. Einführung oder Hinweis"
                {...form.register('category')}
              />
            </Field>
            <Field>
              <FieldLabel>Inhalt</FieldLabel>
              <EditorContent editor={editor} />
            </Field>
          </FieldGroup>
          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Abbrechen
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              Speichern
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
