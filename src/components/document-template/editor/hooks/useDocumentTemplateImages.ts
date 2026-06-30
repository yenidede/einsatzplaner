import type { Dispatch, RefObject, SetStateAction } from 'react';
import type { DragEvent } from 'react';
import { isNodeSelection } from '@tiptap/core';
import type { Editor, JSONContent } from '@tiptap/react';
import { toast } from 'sonner';
import type {
  DocumentTemplateContent,
  DocumentTemplateFieldDefinition,
  DocumentTemplatePageSettings,
} from '@/features/document-template/types';
import { uploadDocumentTemplateImage } from '@/features/document-template/server/document-template.actions';
import type { TemplateImageProperties } from '../DocumentTemplateImagePropertiesPopover';
import type {
  EditableArea,
  PageBodyEditorHandle,
  PendingImageInsert,
} from '../types/documentTemplateEditorTypes';
import {
  DOCUMENT_BLOCK_DRAG_MIME,
  DOCUMENT_FIELD_DRAG_MIME,
} from '../utils/documentTemplateEditorConstants';
import { A4_EDITOR_WIDTH_PX } from '../utils/documentTemplateLayoutUtils';

export function useDocumentTemplateImages({
  activeArea,
  activeBodyPageIndex,
  activeEditor,
  bodyEditorsRef,
  bodyAreaHeightPx,
  fieldByKey,
  footerEditor,
  footerHeightPx,
  headerEditor,
  headerHeightPx,
  imageInputRef,
  hasSelectedImage,
  organizationId,
  organizationLogoUrl,
  pagePaddingLeftPx,
  pagePaddingRightPx,
  pendingImageInsert,
  replaceSelectedImageAfterUpload,
  setContent,
  setActiveArea,
  setImagePropertiesDialogOpen,
  setPendingImageInsert,
  setReplaceSelectedImageAfterUpload,
}: {
  activeArea: EditableArea;
  activeBodyPageIndex: number;
  activeEditor: Editor | null;
  bodyEditorsRef: RefObject<Map<number, PageBodyEditorHandle>>;
  bodyAreaHeightPx: number;
  fieldByKey: Map<string, DocumentTemplateFieldDefinition>;
  footerEditor: Editor | null;
  footerHeightPx: number;
  headerEditor: Editor | null;
  headerHeightPx: number;
  imageInputRef: RefObject<HTMLInputElement | null>;
  hasSelectedImage: boolean;
  organizationId: string;
  organizationLogoUrl: string | null;
  pagePaddingLeftPx: number;
  pagePaddingRightPx: number;
  pendingImageInsert: PendingImageInsert | null;
  replaceSelectedImageAfterUpload: boolean;
  setContent: Dispatch<SetStateAction<DocumentTemplateContent>>;
  setActiveArea: Dispatch<SetStateAction<EditableArea>>;
  setImagePropertiesDialogOpen: Dispatch<SetStateAction<boolean>>;
  setPendingImageInsert: Dispatch<SetStateAction<PendingImageInsert | null>>;
  setReplaceSelectedImageAfterUpload: Dispatch<SetStateAction<boolean>>;
}) {
  function updatePageSettings(
    updater: (page: DocumentTemplatePageSettings) => DocumentTemplatePageSettings
  ) {
    setContent((current) => ({
      ...current,
      page: updater(current.page),
    }));
  }

  function isCursorInTextBlock() {
    return activeEditor?.state.selection.$from.parent.isTextblock ?? false;
  }

  function insertField(field: DocumentTemplateFieldDefinition) {
    if (!activeEditor || !isCursorInTextBlock()) {
      toast.info(
        'Wählen Sie zuerst einen Textbereich, Kopfbereich oder Fußbereich aus.'
      );
      return;
    }

    activeEditor
      .chain()
      .focus()
      .insertContent({
        type: 'dynamicField',
        attrs: {
          fieldKey: field.key,
          label: field.label,
        },
      })
      .run();
  }

  function targetEditorForArea(targetArea: EditableArea) {
    return targetArea === 'header'
      ? headerEditor
      : targetArea === 'footer'
        ? footerEditor
        : (bodyEditorsRef.current.get(activeBodyPageIndex) ?? null);
  }

  function contentForDroppedBlock(kind: string): JSONContent | null {
    switch (kind) {
      case 'heading':
        return {
          type: 'heading',
          attrs: { level: 1 },
          content: [{ type: 'text', text: 'Abschnittsüberschrift' }],
        };
      case 'paragraph':
        return {
          type: 'paragraph',
          content: [
            {
              type: 'text',
              text: 'Ergänzen Sie hier Ihren Dokumenttext.',
            },
          ],
        };
      case 'infoBox':
        return {
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
        };
      case 'columns':
        return {
          type: 'paragraph',
          content: [
            { type: 'text', text: 'Spalte links: ' },
            { type: 'text', text: 'Inhalt links' },
            { type: 'hardBreak' },
            { type: 'text', text: 'Spalte rechts: Inhalt rechts' },
          ],
        };
      case 'signature':
        return {
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
        };
      case 'pageBreak':
        return { type: 'pageBreak' };
      default:
        return null;
    }
  }

  function insertDroppedBlock(
    kind: string,
    targetArea: EditableArea,
    position: number | null
  ) {
    if (kind === 'header') {
      updatePageSettings((page) => ({
        ...page,
        header: { ...page.header, enabled: true },
      }));
      toast.success('Kopfbereich wurde aktiviert.');
      return;
    }

    if (kind === 'footer') {
      updatePageSettings((page) => ({
        ...page,
        footer: { ...page.footer, enabled: true },
      }));
      toast.success('Fußbereich wurde aktiviert.');
      return;
    }

    if (kind === 'pageBreak' && targetArea !== 'body') {
      toast.info('Seitenumbrüche sind nur im Dokumentinhalt möglich.');
      return;
    }

    if ((kind === 'infoBox' || kind === 'table') && targetArea !== 'body') {
      toast.info('Dieser Baustein wird im Dokumentinhalt eingefügt.');
      targetArea = 'body';
    }

    if (kind === 'image') {
      setActiveArea(targetArea);
      setPendingImageInsert({ targetArea, position });
      imageInputRef.current?.click();
      return;
    }

    if (kind === 'logo') {
      insertOrganizationLogo(targetArea, position ?? undefined);
      return;
    }

    const targetEditor = targetEditorForArea(targetArea);
    if (!targetEditor) return;

    if (kind === 'divider') {
      targetEditor.chain().focus().setHorizontalRule().run();
      return;
    }

    if (kind === 'table') {
      targetEditor
        .chain()
        .focus()
        .insertTable({ rows: 3, cols: 2, withHeaderRow: true })
        .run();
      return;
    }

    const contentToInsert = contentForDroppedBlock(kind);
    if (!contentToInsert) return;

    const chain = targetEditor.chain().focus();
    if (typeof position === 'number') {
      chain.insertContentAt(position, contentToInsert).run();
      return;
    }

    chain.insertContent(contentToInsert).run();
  }

  function insertImageInEditor(args: {
    targetArea: EditableArea;
    src: string;
    alt: string;
    width?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
    position?: number;
  }) {
    const targetEditor =
      args.targetArea === 'header'
        ? headerEditor
        : args.targetArea === 'footer'
          ? footerEditor
          : (bodyEditorsRef.current.get(activeBodyPageIndex) ?? null);

    if (!targetEditor) {
      toast.info(
        'Wählen Sie zuerst einen Textbereich, Kopfbereich oder Fußbereich aus.'
      );
      return;
    }

    if (args.targetArea === 'header') {
      updatePageSettings((page) => ({
        ...page,
        header: { ...page.header, enabled: true },
      }));
    }

    if (args.targetArea === 'footer') {
      updatePageSettings((page) => ({
        ...page,
        footer: { ...page.footer, enabled: true },
      }));
    }

    const imageContent: JSONContent = {
      type: 'templateImage',
      attrs: {
        src: args.src,
        alt: args.alt,
        width: args.width ?? (args.targetArea === 'body' ? 220 : 130),
        height: args.height ?? (args.targetArea === 'body' ? 120 : 48),
        align: args.align ?? 'left',
        keepAspectRatio: true,
      },
    };

    const chain = targetEditor.chain().focus();
    if (typeof args.position === 'number') {
      chain.insertContentAt(args.position, imageContent).run();
      return;
    }

    chain.insertContent(imageContent).run();
  }

  function insertOrganizationLogo(
    targetArea: EditableArea = activeArea,
    position?: number
  ) {
    if (!organizationLogoUrl) {
      toast.info('Kein Organisationslogo hinterlegt.');
      return;
    }

    setActiveArea(targetArea);
    insertImageInEditor({
      targetArea,
      src: organizationLogoUrl,
      alt: 'Organisationslogo',
      width: targetArea === 'body' ? 180 : 120,
      height: targetArea === 'body' ? 80 : 42,
      align: 'left',
      position,
    });
    toast.success('Organisationslogo wurde eingefügt.');
  }

  async function handleImageUpload(file: File | undefined) {
    if (!file) {
      return;
    }

    try {
      const formData = new FormData();
      formData.append('organizationId', organizationId);
      formData.append('image', file);
      const result = await uploadDocumentTemplateImage(formData);

      if (
        replaceSelectedImageAfterUpload &&
        activeEditor?.isActive('templateImage')
      ) {
        updateSelectedImageAttribute({ src: result.url, alt: file.name });
        toast.success('Bild wurde ersetzt.');
        return;
      }

      const targetArea = pendingImageInsert?.targetArea ?? activeArea;

      insertImageInEditor({
        targetArea,
        src: result.url,
        alt: file.name,
        align: targetArea === 'footer' ? 'center' : 'left',
        position: pendingImageInsert?.position ?? undefined,
      });
      toast.success('Bild wurde eingefügt.');
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Das Bild konnte nicht hochgeladen werden.'
      );
    } finally {
      if (imageInputRef.current) {
        imageInputRef.current.value = '';
      }
      setPendingImageInsert(null);
      setReplaceSelectedImageAfterUpload(false);
    }
  }

  function updateSelectedImageAttribute(
    attrs: Partial<TemplateImageProperties & { src: string }>
  ) {
    if (!activeEditor?.isActive('templateImage')) {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    const currentAttrs = activeEditor.getAttributes('templateImage');
    const currentWidth =
      typeof currentAttrs.width === 'number' ? currentAttrs.width : 160;
    const currentHeight =
      typeof currentAttrs.height === 'number' ? currentAttrs.height : 80;
    const keepAspectRatio =
      typeof attrs.keepAspectRatio === 'boolean'
        ? attrs.keepAspectRatio
        : typeof currentAttrs.keepAspectRatio === 'boolean'
          ? currentAttrs.keepAspectRatio
          : true;
    const nextAttrs = { ...attrs };

    if (keepAspectRatio && typeof attrs.width === 'number' && !attrs.height) {
      nextAttrs.height = Math.max(
        16,
        Math.round((attrs.width / Math.max(currentWidth, 1)) * currentHeight)
      );
    }

    if (keepAspectRatio && typeof attrs.height === 'number' && !attrs.width) {
      nextAttrs.width = Math.max(
        24,
        Math.round((attrs.height / Math.max(currentHeight, 1)) * currentWidth)
      );
    }

    if (attrs.mode === 'free') {
      const areaWidth =
        A4_EDITOR_WIDTH_PX - pagePaddingLeftPx - pagePaddingRightPx;
      const areaHeight =
        activeArea === 'header'
          ? headerHeightPx
          : activeArea === 'footer'
            ? footerHeightPx
            : bodyAreaHeightPx;
      const nextWidth =
        typeof nextAttrs.width === 'number' ? nextAttrs.width : currentWidth;
      const nextHeight =
        typeof nextAttrs.height === 'number' ? nextAttrs.height : currentHeight;
      const align =
        currentAttrs.align === 'center' || currentAttrs.align === 'right'
          ? currentAttrs.align
          : 'left';
      const wasFree = currentAttrs.mode === 'free';
      nextAttrs.x =
        wasFree && typeof currentAttrs.x === 'number'
          ? currentAttrs.x
          : align === 'center'
            ? Math.max(0, Math.round((areaWidth - nextWidth) / 2))
            : align === 'right'
              ? Math.max(0, areaWidth - nextWidth)
              : 0;
      nextAttrs.y =
        wasFree && typeof currentAttrs.y === 'number'
          ? currentAttrs.y
          : Math.max(0, Math.round((areaHeight - nextHeight) / 2));
    }

    activeEditor
      .chain()
      .focus()
      .updateAttributes('templateImage', nextAttrs)
      .run();
  }

  function replaceSelectedImage() {
    if (!hasSelectedImage) {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    setReplaceSelectedImageAfterUpload(true);
    imageInputRef.current?.click();
  }

  function deleteSelectedImage() {
    if (!activeEditor?.isActive('templateImage')) {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    activeEditor.chain().focus().deleteSelection().run();
    setImagePropertiesDialogOpen(false);
  }

  function openSelectedImageProperties() {
    if (!hasSelectedImage) {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    setImagePropertiesDialogOpen(true);
  }

  function applySelectedImageProperties(attrs: TemplateImageProperties) {
    updateSelectedImageAttribute(attrs);
    setImagePropertiesDialogOpen(false);
  }

  function duplicateSelectedImage() {
    if (!activeEditor || !isNodeSelection(activeEditor.state.selection)) {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    const { selection } = activeEditor.state;
    if (selection.node.type.name !== 'templateImage') {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    activeEditor.view.dispatch(
      activeEditor.state.tr.insert(
        selection.from + selection.node.nodeSize,
        selection.node.copy(selection.node.content)
      )
    );
    activeEditor.view.focus();
  }

  function handleFieldDrop(
    event: DragEvent<HTMLDivElement>,
    targetArea: EditableArea
  ) {
    const blockKind = event.dataTransfer.getData(DOCUMENT_BLOCK_DRAG_MIME);
    if (blockKind) {
      event.preventDefault();
      const targetEditor = targetEditorForArea(targetArea);
      const position =
        targetEditor?.view.posAtCoords({
          left: event.clientX,
          top: event.clientY,
        }) ?? null;

      insertDroppedBlock(blockKind, targetArea, position?.pos ?? null);
      return;
    }

    const fieldKey = event.dataTransfer.getData(DOCUMENT_FIELD_DRAG_MIME);
    if (!fieldKey) return;

    event.preventDefault();
    const field = fieldByKey.get(fieldKey);
    const targetEditor =
      targetArea === 'header'
        ? headerEditor
        : targetArea === 'footer'
          ? footerEditor
          : (bodyEditorsRef.current.get(activeBodyPageIndex) ?? null);

    if (!field || !targetEditor) {
      toast.info(
        'Wählen Sie zuerst einen Textbereich, Kopfbereich oder Fußbereich aus.'
      );
      return;
    }

    const position = targetEditor.view.posAtCoords({
      left: event.clientX,
      top: event.clientY,
    });

    const contentToInsert = {
      type: 'dynamicField',
      attrs: {
        fieldKey: field.key,
        label: field.label,
      },
    };

    if (!position) {
      toast.info(
        'Legen Sie das Feld direkt in einem Textbereich, Kopfbereich oder Fußbereich ab.'
      );
      return;
    }

    targetEditor
      .chain()
      .focus()
      .insertContentAt(position.pos, contentToInsert)
      .run();
  }

  return {
    applySelectedImageProperties,
    deleteSelectedImage,
    duplicateSelectedImage,
    handleFieldDrop,
    handleImageUpload,
    insertField,
    insertOrganizationLogo,
    openSelectedImageProperties,
    replaceSelectedImage,
    updateSelectedImageAttribute,
  };
}
