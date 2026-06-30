import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { MouseEvent as ReactMouseEvent } from 'react';
import { isNodeSelection } from '@tiptap/core';
import type { Editor } from '@tiptap/react';
import { toast } from 'sonner';
import type {
  DocumentTemplateContent,
  DocumentTemplateFieldDefinition,
  DocumentTemplatePageSettings,
} from '@/features/document-template/types';
import type {
  ContextMenuTarget,
  SelectedDynamicField,
} from '../types/documentTemplateEditorTypes';
import { updateNearestDocumentBlockAttributes } from '../utils/documentTemplateEditorUtils';

export function useDocumentTemplateFormatting({
  activeEditor,
  addManualPage,
  fieldByKey,
  imageInputRef,
  insertOrganizationLogo,
  markDirty,
  selectedDynamicField,
  setContent,
  setContextMenuTarget,
  setFontFamily,
  setFontSize,
  setLineHeight,
  setSelectedDynamicField,
  setSpacingBottom,
  setSpacingTop,
  setTextColor,
}: {
  activeEditor: Editor | null;
  addManualPage: () => void;
  fieldByKey: Map<string, DocumentTemplateFieldDefinition>;
  imageInputRef: RefObject<HTMLInputElement | null>;
  insertOrganizationLogo: () => void;
  markDirty: () => void;
  selectedDynamicField: SelectedDynamicField | null;
  setContent: Dispatch<SetStateAction<DocumentTemplateContent>>;
  setContextMenuTarget: Dispatch<SetStateAction<ContextMenuTarget>>;
  setFontFamily: Dispatch<SetStateAction<string>>;
  setFontSize: Dispatch<SetStateAction<string>>;
  setLineHeight: Dispatch<SetStateAction<string>>;
  setSelectedDynamicField: Dispatch<
    SetStateAction<SelectedDynamicField | null>
  >;
  setSpacingBottom: Dispatch<SetStateAction<string>>;
  setSpacingTop: Dispatch<SetStateAction<string>>;
  setTextColor: Dispatch<SetStateAction<string>>;
}) {
  function updateCurrentBlockSpacing(
    attribute: 'spacingTop' | 'spacingBottom',
    value: string
  ) {
    const numericValue = Number(value);
    const nextValue = Number.isFinite(numericValue) ? numericValue : 0;

    if (activeEditor) {
      updateNearestDocumentBlockAttributes(activeEditor, {
        [attribute]: nextValue,
      });
    }
  }

  function deleteSelectedDynamicField() {
    if (
      !activeEditor ||
      !isNodeSelection(activeEditor.state.selection) ||
      activeEditor.state.selection.node.type.name !== 'dynamicField'
    ) {
      return;
    }

    activeEditor.commands.deleteSelection();
    activeEditor.view.focus();
    setSelectedDynamicField(null);
  }

  function showSelectedDynamicFieldInformation() {
    if (!selectedDynamicField) return;

    const knownField = fieldByKey.get(selectedDynamicField.fieldKey);
    toast.info(
      knownField
        ? `${knownField.label}: ${knownField.description}`
        : `${selectedDynamicField.label}: ${selectedDynamicField.fieldKey}`
    );
  }

  function handleEditorContextMenu(event: ReactMouseEvent<HTMLElement>) {
    if (!(event.target instanceof Element)) {
      setSelectedDynamicField(null);
      setContextMenuTarget('editor');
      return;
    }

    if (event.target.closest('[data-template-image-node]')) {
      setContextMenuTarget('image');
      setSelectedDynamicField(null);
      return;
    }

    if (event.target.closest('[data-dynamic-field]')) {
      setContextMenuTarget('dynamicField');
      return;
    }

    if (!event.target.closest('[data-dynamic-field]')) {
      setSelectedDynamicField(null);
    }
    setContextMenuTarget('editor');
  }

  function updatePageSettings(
    updater: (
      page: DocumentTemplatePageSettings
    ) => DocumentTemplatePageSettings
  ) {
    markDirty();
    setContent((current) => ({
      ...current,
      page: updater(current.page),
    }));
  }

  function updateHeaderBlock(
    blockId: string,
    updater: (
      block: DocumentTemplatePageSettings['header']['blocks'][number]
    ) => DocumentTemplatePageSettings['header']['blocks'][number]
  ) {
    updatePageSettings((page) => ({
      ...page,
      header: {
        ...page.header,
        blocks: page.header.blocks.map((block) =>
          block.id === blockId ? updater(block) : block
        ),
      },
    }));
  }

  function updateFooterBlock(
    blockId: string,
    updater: (
      block: DocumentTemplatePageSettings['footer']['blocks'][number]
    ) => DocumentTemplatePageSettings['footer']['blocks'][number]
  ) {
    updatePageSettings((page) => ({
      ...page,
      footer: {
        ...page.footer,
        blocks: page.footer.blocks.map((block) =>
          block.id === blockId ? updater(block) : block
        ),
      },
    }));
  }

  function setBlockSpacing(attribute: 'spacingTop' | 'spacingBottom') {
    return (value: string) => {
      if (attribute === 'spacingTop') {
        setSpacingTop(value);
      } else {
        setSpacingBottom(value);
      }

      updateCurrentBlockSpacing(attribute, value);
    };
  }

  function applyFontSize(value: string) {
    setFontSize(value);
    const numericValue = Number(value);
    if (!Number.isFinite(numericValue) || numericValue < 6) return;

    activeEditor?.chain().focus().setFontSize(`${numericValue}px`).run();
  }

  function applyTextColor(value: string) {
    setTextColor(value);
    activeEditor?.chain().focus().setColor(value).run();
  }

  function applyFontFamily(value: string) {
    setFontFamily(value);
    activeEditor?.chain().focus().setFontFamily(value).run();
  }

  function applyLineHeight(value: string) {
    setLineHeight(value);
    const numericValue = Number(value);
    if (!activeEditor || !Number.isFinite(numericValue)) return;

    updateNearestDocumentBlockAttributes(activeEditor, {
      lineHeight: numericValue,
    });
  }

  function isCursorInTextBlock() {
    if (!activeEditor) return false;
    return activeEditor.state.selection.$from.parent.isTextblock;
  }

  function currentBlockRange() {
    if (!activeEditor) return null;

    const { $from } = activeEditor.state.selection;
    if ($from.depth < 1) return null;

    const depth = 1;
    const node = $from.node(depth);
    const from = $from.before(depth);
    const to = $from.after(depth);

    return { node, from, to };
  }

  function deleteCurrentBlock() {
    if (!activeEditor) return;
    const range = currentBlockRange();
    if (!range) return;

    activeEditor.view.dispatch(
      activeEditor.state.tr.delete(range.from, range.to)
    );
    activeEditor.view.focus();
  }

  function duplicateCurrentBlock() {
    if (!activeEditor) return;
    const range = currentBlockRange();
    if (!range) return;

    activeEditor.view.dispatch(
      activeEditor.state.tr.insert(
        range.to,
        range.node.copy(range.node.content)
      )
    );
    activeEditor.view.focus();
  }

  function moveCurrentBlock(direction: 'up' | 'down') {
    if (!activeEditor) return;
    const range = currentBlockRange();
    if (!range) return;

    const doc = activeEditor.state.doc;
    const siblingPosition = direction === 'up' ? range.from - 1 : range.to + 1;
    const sibling =
      siblingPosition >= 0 && siblingPosition <= doc.content.size
        ? doc.resolve(siblingPosition)
        : null;

    if (!sibling || sibling.depth < 1) return;

    const siblingFrom = sibling.before(1);
    const siblingTo = sibling.after(1);
    const siblingNode = sibling.node(1);

    if (direction === 'up') {
      activeEditor.view.dispatch(
        activeEditor.state.tr
          .delete(range.from, range.to)
          .insert(siblingFrom, range.node.copy(range.node.content))
      );
      activeEditor.view.focus();
      return;
    }

    activeEditor.view.dispatch(
      activeEditor.state.tr
        .delete(siblingFrom, siblingTo)
        .insert(range.from, siblingNode.copy(siblingNode.content))
    );
    activeEditor.view.focus();
  }

  function insertBlock(kind: string) {
    if (kind === 'pageBreak') {
      addManualPage();
      return;
    }

    if (!activeEditor) return;

    const chain = activeEditor.chain().focus();
    switch (kind) {
      case 'heading':
        chain
          .insertContent({
            type: 'heading',
            attrs: { level: 1 },
            content: [{ type: 'text', text: 'Abschnittsüberschrift' }],
          })
          .run();
        return;
      case 'paragraph':
        chain
          .insertContent({
            type: 'paragraph',
            content: [
              {
                type: 'text',
                text: 'Ergänzen Sie hier Ihren Dokumenttext.',
              },
            ],
          })
          .run();
        return;
      case 'divider':
        chain.setHorizontalRule().run();
        return;
      case 'infoBox':
        chain
          .insertContent({
            type: 'infoBox',
            content: [
              {
                type: 'paragraph',
                content: [
                  {
                    type: 'text',
                    text: 'Hinweis oder wichtige Information für die Buchung.',
                  },
                ],
              },
            ],
          })
          .run();
        return;
      case 'table':
        activeEditor
          .chain()
          .focus()
          .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
          .run();
        return;
      case 'columns':
        chain
          .insertContent({
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Spalte links: ' },
              { type: 'text', text: 'Inhalt links' },
              { type: 'hardBreak' },
              { type: 'text', text: 'Spalte rechts: Inhalt rechts' },
            ],
          })
          .run();
        return;
      case 'header':
        updatePageSettings((page) => ({
          ...page,
          header: {
            ...page.header,
            enabled: true,
          },
        }));
        toast.success('Kopfbereich wurde aktiviert.');
        return;
      case 'footer':
        updatePageSettings((page) => ({
          ...page,
          footer: {
            ...page.footer,
            enabled: true,
          },
        }));
        toast.success('Fußbereich wurde aktiviert.');
        return;
      case 'logo':
        insertOrganizationLogo();
        return;
      case 'image':
        imageInputRef.current?.click();
        return;
      case 'pageNumber':
        updatePageSettings((page) => ({
          ...page,
          footer: {
            ...page.footer,
            enabled: true,
            blocks: page.footer.blocks.map((block, index) =>
              index === 0
                ? {
                    ...block,
                    showPageNumber: true,
                  }
                : block
            ),
          },
        }));
        toast.success('Seitenzahl wurde im Fußbereich aktiviert.');
        return;
      case 'signature':
        chain
          .insertContent({
            type: 'paragraph',
            content: [
              { type: 'text', text: 'Mit herzlichem Gruß' },
              { type: 'hardBreak' },
              {
                type: 'dynamicField',
                attrs: {
                  fieldKey: 'administrationName',
                  label: 'Verwaltung Name',
                },
              },
              { type: 'hardBreak' },
              {
                type: 'dynamicField',
                attrs: {
                  fieldKey: 'administrationFunction',
                  label: 'Verwaltung Funktion',
                },
              },
            ],
          })
          .run();
        return;
    }
  }

  return {
    applyFontFamily,
    applyFontSize,
    applyLineHeight,
    applyTextColor,
    deleteCurrentBlock,
    deleteSelectedDynamicField,
    duplicateCurrentBlock,
    handleEditorContextMenu,
    insertBlock,
    moveCurrentBlock,
    setBlockSpacing,
    showSelectedDynamicFieldInformation,
    updateFooterBlock,
    updateHeaderBlock,
    updatePageSettings,
  };
}
