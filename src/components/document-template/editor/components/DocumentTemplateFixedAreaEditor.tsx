import type { PointerEvent } from 'react';
import type { Editor } from '@tiptap/react';
import { EditorContent } from '@tiptap/react';
import {
  horizontalAlignmentFromPosition,
  placeCursorInFixedArea,
} from '../utils/documentTemplateEditorUtils';

const EDITABLE_CONTENT_SELECTOR =
  'p, h1, h2, h3, li, td, th, img, .document-field-chip, .document-template-image-wrapper';

export function DocumentTemplateFixedAreaEditor({
  editor,
}: {
  editor: Editor | null;
}) {
  function handlePointerDown(event: PointerEvent<HTMLDivElement>) {
    if (!editor) return;

    const target = event.target;
    if (
      target instanceof Element &&
      target.closest(EDITABLE_CONTENT_SELECTOR)
    ) {
      return;
    }

    const bounds = event.currentTarget.getBoundingClientRect();
    const textAlign = horizontalAlignmentFromPosition(
      event.clientX,
      bounds.left,
      bounds.width
    );

    event.preventDefault();
    placeCursorInFixedArea(editor, textAlign);
  }

  return (
    <div
      className="min-h-0 w-full flex-1 px-[8px] pt-[16px]"
      onPointerDown={handlePointerDown}
    >
      <EditorContent editor={editor} className="h-full" />
    </div>
  );
}
