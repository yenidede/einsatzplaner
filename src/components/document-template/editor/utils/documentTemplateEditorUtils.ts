import { isNodeSelection } from '@tiptap/core';
import type { Editor, JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyleKit } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import type {
  DocumentTemplateContent,
  DocumentTemplateBlock,
  DocumentTemplateFieldDefinition,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import { createEmptyRichTextDocument } from '@/features/document-template/lib/document-template-pages';
import { DocumentKeyboardShortcutsExtension } from '../DocumentKeyboardShortcutsExtension';
import { TemplateImageNode } from '../TemplateImageNode';
import {
  DocumentBlockStyleExtension,
  DynamicFieldNode,
  InfoBoxNode,
  PageBreakNode,
} from '../tiptap/document-template-nodes';
import type {
  EditableArea,
  SelectedDynamicField,
} from '../types/documentTemplateEditorTypes';
import { MINIMAL_TIPTAP_FOR_ENTER_DEBUG } from './documentTemplateEditorConstants';

export function richTextFromBlockText(
  text: string | undefined,
  textAlign: 'left' | 'center' | 'right' = 'left'
): DocumentTemplateRichTextNode {
  if (!text) {
    return createEmptyRichTextDocument();
  }

  const content: DocumentTemplateRichTextNode[] = [];
  const pattern = /\{\{([^}]+)\}\}/g;
  let lastIndex = 0;
  let match = pattern.exec(text);

  while (match) {
    if (match.index > lastIndex) {
      content.push({ type: 'text', text: text.slice(lastIndex, match.index) });
    }

    const fieldKey = match[1]?.trim() ?? '';
    content.push({
      type: 'dynamicField',
      attrs: {
        fieldKey,
        label: fieldKey,
      },
    });
    lastIndex = match.index + match[0].length;
    match = pattern.exec(text);
  }

  if (lastIndex < text.length) {
    content.push({ type: 'text', text: text.slice(lastIndex) });
  }

  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        attrs: { textAlign, spacingBottom: 0 },
        content,
      },
    ],
  };
}

export function getAreaTextBlock(
  blocks: DocumentTemplateContent['page']['header']['blocks'],
  fallbackType: 'header' | 'footer'
) {
  return (
    blocks.find((block) => block.type !== 'image') ??
    blocks[0] ?? {
      id: createEditorBlockId(fallbackType),
      type: fallbackType,
      text: '',
      align: fallbackType === 'footer' ? 'center' : 'right',
    }
  );
}

export function upsertAreaTextBlock(
  blocks: DocumentTemplateBlock[],
  textBlock: DocumentTemplateBlock,
  richText: DocumentTemplateRichTextNode
): DocumentTemplateBlock[] {
  const nextBlock = { ...textBlock, richText };
  const blockExists = blocks.some((block) => block.id === textBlock.id);

  return blockExists
    ? blocks.map((block) =>
        block.id === textBlock.id ? { ...block, richText } : block
      )
    : [...blocks, nextBlock];
}

export function updateNearestDocumentBlockAttributes(
  editor: Editor,
  attributes: Record<string, string | number | null>
): boolean {
  const { $from } = editor.state.selection;
  const supportedNodeTypes = new Set(['paragraph', 'heading', 'infoBox']);

  for (let depth = $from.depth; depth > 0; depth -= 1) {
    const node = $from.node(depth);
    if (!supportedNodeTypes.has(node.type.name)) {
      continue;
    }

    const position = $from.before(depth);
    editor.view.dispatch(
      editor.state.tr.setNodeMarkup(position, undefined, {
        ...node.attrs,
        ...attributes,
      })
    );
    editor.view.focus();
    return true;
  }

  return false;
}

export function setEditorFontSize(editor: Editor, fontSize: string): boolean {
  const applied = editor.chain().focus().setFontSize(fontSize).run();
  if (!applied || !editor.state.selection.empty) return applied;

  const textStyle = editor.schema.marks.textStyle;
  if (!textStyle) return applied;

  const attributes = editor.getAttributes('textStyle');
  editor.view.dispatch(
    editor.state.tr.addStoredMark(
      textStyle.create({
        ...attributes,
        fontSize,
      })
    )
  );
  editor.view.focus();
  return true;
}

export function horizontalAlignmentFromPosition(
  clientX: number,
  left: number,
  width: number
): 'left' | 'center' | 'right' {
  const relativePosition = width > 0 ? (clientX - left) / width : 0;

  if (relativePosition < 1 / 3) return 'left';
  if (relativePosition < 2 / 3) return 'center';
  return 'right';
}

export function placeCursorInFixedArea(
  editor: Editor,
  textAlign: 'left' | 'center' | 'right'
): boolean {
  const lastNode = editor.state.doc.lastChild;
  const lastNodeIsEmptyTextBlock =
    lastNode?.isTextblock === true && lastNode.content.size === 0;

  if (lastNodeIsEmptyTextBlock) {
    return editor.chain().focus('end').setTextAlign(textAlign).run();
  }

  return editor
    .chain()
    .insertContentAt(editor.state.doc.content.size, {
      type: 'paragraph',
      attrs: { textAlign, spacingBottom: 0 },
    })
    .focus('end')
    .run();
}

export function createEditorExtensions() {
  const baseExtensions = [
    StarterKit.configure({
      horizontalRule: {},
    }),
    TextStyleKit.configure({
      backgroundColor: false,
      lineHeight: false,
    }),
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Placeholder.configure({
      placeholder: 'Beginnen Sie mit Ihrer Dokumentvorlage...',
    }),
  ];

  if (MINIMAL_TIPTAP_FOR_ENTER_DEBUG) {
    return baseExtensions;
  }

  return [
    ...baseExtensions,
    DocumentBlockStyleExtension,
    DocumentKeyboardShortcutsExtension,
    Table.configure({
      resizable: true,
    }),
    TableRow,
    TableHeader,
    TableCell,
    DynamicFieldNode,
    InfoBoxNode,
    PageBreakNode,
    TemplateImageNode,
  ];
}

export const groupLabels: Record<
  DocumentTemplateFieldDefinition['group'],
  string
> = {
  general: 'Allgemein',
  contact: 'Kontakt',
  event: 'Führung / Veranstaltung',
  staff: 'Personal',
  administration: 'Verwaltung',
  custom: 'Eigene Felder',
};

export function sampleValueForField(field: DocumentTemplateFieldDefinition) {
  switch (field.key) {
    case 'assignmentName':
      return 'Führung im Museum';
    case 'assignmentDate':
      return '16.06.2026';
    case 'assignmentStartTime':
      return '10:00 Uhr';
    case 'assignmentEndTime':
      return '11:30 Uhr';
    case 'contactPerson':
      return 'Maria Muster';
    case 'location':
      return 'Museum Wien';
    case 'participantCount':
      return '24';
    case 'totalPrice':
      return '300,00 €';
    case 'organizationName':
      return 'Museum Wien';
    case 'organizationEmail':
      return 'office@example.org';
    case 'organizationPhone':
      return '+43 1 234 56 78';
    case 'organizationAddress':
      return 'Musterstraße 1, 1010 Wien, Österreich';
    case 'pageNumber':
      return '1';
    default:
      return field.label;
  }
}

export function createSampleResolvedFields(
  fields: DocumentTemplateFieldDefinition[]
): ResolvedDocumentTemplateFields {
  return Object.fromEntries(
    fields.map((field) => [
      field.key,
      {
        definition: field,
        rawValue: null,
        formattedValue: sampleValueForField(field),
      },
    ])
  );
}

export function getSelectedDynamicField(
  editor: Editor | null,
  area: EditableArea
): SelectedDynamicField | null {
  if (!editor) return null;

  const { selection } = editor.state;
  if (
    !isNodeSelection(selection) ||
    selection.node.type.name !== 'dynamicField'
  ) {
    return null;
  }

  const fieldKey =
    typeof selection.node.attrs.fieldKey === 'string'
      ? selection.node.attrs.fieldKey
      : '';
  const label =
    typeof selection.node.attrs.label === 'string'
      ? selection.node.attrs.label
      : 'Dynamisches Feld';

  return { area, fieldKey, label };
}

export function toRichTextNode(
  value: JSONContent
): DocumentTemplateRichTextNode {
  return {
    type: value.type ?? 'doc',
    text: value.text,
    attrs: normalizeAttrs(value.attrs),
    marks: value.marks?.map((mark) => ({
      type: mark.type,
      attrs: normalizeAttrs(mark.attrs),
    })),
    content: value.content?.map(toRichTextNode),
  };
}

export function normalizeAttrs(value: unknown) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return undefined;
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string | number | boolean | null] =>
        typeof entry[1] === 'string' ||
        typeof entry[1] === 'number' ||
        typeof entry[1] === 'boolean' ||
        entry[1] === null
    )
  );
}

export function downloadBase64File(
  base64: string,
  mimeType: string,
  filename: string
) {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  const blob = new Blob([bytes], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function createEditorBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}
