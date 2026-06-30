'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { useEditor, type Editor } from '@tiptap/react';
import type {
  DocumentTemplateContent,
  DocumentTemplateFieldDefinition,
  DocumentTemplateRecord,
} from '@/features/document-template/types';
import { getOrganizationDocumentTemplateLogoUrl } from '@/features/document-template/server/document-template.actions';
import { createDefaultDocumentTemplateContent } from '@/features/document-template/lib/document-template-defaults';
import type { TemplateImageProperties } from '../DocumentTemplateImagePropertiesPopover';
import { documentTemplateBlockGroups } from '../document-template-block-groups';
import type {
  ContextMenuTarget,
  EditableArea,
  PendingImageInsert,
  SelectedDynamicField,
  SidebarResizeSide,
  SidebarResizeState,
} from '../types/documentTemplateEditorTypes';
import {
  A4_EDITOR_HEIGHT_PX,
  A4_EDITOR_WIDTH_PX,
  clampSidebarWidth,
  COLLAPSED_SIDEBAR_WIDTH_PX,
  mmToPx,
  readStoredBoolean,
  readStoredNumber,
  SIDEBAR_STORAGE_KEYS,
  SIDEBAR_WIDTH,
} from '../utils/documentTemplateLayoutUtils';
import { TEXT_COLOR_OPTIONS } from '../utils/documentTemplateEditorConstants';
import { splitDocumentIntoPages } from '../utils/documentTemplateDebugUtils';
import {
  createEditorExtensions,
  createSampleResolvedFields,
  getAreaTextBlock,
  getSelectedDynamicField,
  groupLabels,
  richTextFromBlockText,
  toRichTextNode,
  upsertAreaTextBlock,
} from '../utils/documentTemplateEditorUtils';
import { useDocumentTemplateExport } from './useDocumentTemplateExport';
import { useDocumentTemplateEditorState } from './useDocumentTemplateEditorState';
import { useDocumentTemplateDebug } from './useDocumentTemplateDebug';
import { useDocumentTemplateFormatting } from './useDocumentTemplateFormatting';
import { useDocumentTemplateFields } from './useDocumentTemplateFields';
import { useDocumentTemplateImages } from './useDocumentTemplateImages';
import { useDocumentTemplatePages } from './useDocumentTemplatePages';
import { useDocumentTemplateSave } from './useDocumentTemplateSave';
import { useDocumentTemplateZoom } from './useDocumentTemplateZoom';

export function useDocumentTemplateEditorController({
  organizationId,
  template,
  fields,
  einsatzNameSingular = 'Einsatz',
}: {
  organizationId: string;
  template?: DocumentTemplateRecord | null;
  fields: DocumentTemplateFieldDefinition[];
  einsatzNameSingular?: string | null;
}) {
  const {
    mode,
    setMode,
    name,
    setName,
    description,
    setDescription,
    content,
    setContent,
    fieldSearch,
    setFieldSearch,
    blockSearch,
    setBlockSearch,
    fontSize,
    setFontSize,
    fontFamily,
    setFontFamily,
    textColor,
    setTextColor,
    lineHeight,
    setLineHeight,
    spacingTop,
    setSpacingTop,
    spacingBottom,
    setSpacingBottom,
    zoom,
    setZoom,
    activeArea,
    setActiveArea,
    leftSidebarCollapsed,
    setLeftSidebarCollapsed,
    rightSidebarCollapsed,
    setRightSidebarCollapsed,
    leftSidebarWidth,
    setLeftSidebarWidth,
    rightSidebarWidth,
    setRightSidebarWidth,
    sidebarStorageReady,
    setSidebarStorageReady,
    resizingSidebar,
    setResizingSidebar,
    selectedDynamicField,
    setSelectedDynamicField,
    contextMenuTarget,
    setContextMenuTarget,
    selectionRevision,
    setSelectionRevision,
    organizationLogoUrl,
    setOrganizationLogoUrl,
    pendingImageInsert,
    setPendingImageInsert,
    replaceSelectedImageAfterUpload,
    setReplaceSelectedImageAfterUpload,
    imagePropertiesDialogOpen,
    setImagePropertiesDialogOpen,
    imageInputRef,
    pageStackRef,
    sidebarResizeRef,
  } = useDocumentTemplateEditorState(template);

  const {
    effectiveGroupLabels,
    fieldByKey,
    filteredBlockGroups,
    previewFields,
    updateSelectedDynamicField,
  } = useDocumentTemplateFields({
    blockSearch,
    einsatzNameSingular,
    fields,
    organizationLogoUrl,
    setSelectedDynamicField,
  });
  const headerTextBlock = useMemo(
    () => getAreaTextBlock(content.page.header.blocks, 'header'),
    [content.page.header.blocks]
  );
  const footerTextBlock = useMemo(
    () => getAreaTextBlock(content.page.footer.blocks, 'footer'),
    [content.page.footer.blocks]
  );
  const { handleSave, isSaving, markDirty, saveStatus } =
    useDocumentTemplateSave({
      organizationId,
      template,
      name,
      description,
      currentContent,
    });
  const { exportingFormat, handleExport } = useDocumentTemplateExport({
    organizationId,
    name,
    currentContent,
  });
  const {
    activeBodyPageIndex,
    addManualPage,
    bodyDocumentSyncRequests,
    bodyEditorsRef,
    bodyFocusRequest,
    clearBodyDocumentSyncRequest,
    clearBodyFocusRequest,
    deletePage,
    handleBodyOverflowMeasurement,
    handleBodyPageChange,
    handleBodyPageFocus,
    pageToDelete,
    paginationContinuationRequest,
    registerBodyEditor,
    setPageToDelete,
  } = useDocumentTemplatePages({
    content,
    setContent,
    markDirty,
    setActiveArea,
    setSelectionRevision,
    updateSelectedDynamicField,
  });
  const headerEditor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content:
      headerTextBlock.richText ??
      richTextFromBlockText(headerTextBlock.text, headerTextBlock.align),
    editorProps: {
      attributes: {
        class:
          'document-template-prose document-template-area-editor outline-none focus:outline-none',
      },
      handleDOMEvents: {
        focus: () => {
          setActiveArea('header');
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      markDirty();
      const nextRichText = toRichTextNode(editor.getJSON());
      setContent((current) => ({
        ...current,
        page: {
          ...current.page,
          header: {
            ...current.page.header,
            blocks: upsertAreaTextBlock(
              current.page.header.blocks,
              headerTextBlock,
              nextRichText
            ),
          },
        },
      }));
    },
    onSelectionUpdate: ({ editor }) => {
      setActiveArea('header');
      setSelectionRevision((current) => current + 1);
      updateSelectedDynamicField(editor, 'header');
    },
  });
  const footerEditor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content:
      footerTextBlock.richText ??
      richTextFromBlockText(footerTextBlock.text, footerTextBlock.align),
    editorProps: {
      attributes: {
        class:
          'document-template-prose document-template-area-editor outline-none focus:outline-none',
      },
      handleDOMEvents: {
        focus: () => {
          setActiveArea('footer');
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      markDirty();
      const nextRichText = toRichTextNode(editor.getJSON());
      setContent((current) => ({
        ...current,
        page: {
          ...current.page,
          footer: {
            ...current.page.footer,
            blocks: upsertAreaTextBlock(
              current.page.footer.blocks,
              footerTextBlock,
              nextRichText
            ),
          },
        },
      }));
    },
    onSelectionUpdate: ({ editor }) => {
      setActiveArea('footer');
      setSelectionRevision((current) => current + 1);
      updateSelectedDynamicField(editor, 'footer');
    },
  });

  const activeEditor =
    activeArea === 'header'
      ? headerEditor
      : activeArea === 'footer'
        ? footerEditor
        : (bodyEditorsRef.current.get(activeBodyPageIndex) ?? null);

  useEffect(() => {
    if (!activeEditor) return;

    const textStyle = activeEditor.getAttributes('textStyle');
    if (typeof textStyle.fontSize === 'string') {
      setFontSize(textStyle.fontSize.replace('px', ''));
    }
    if (typeof textStyle.fontFamily === 'string') {
      setFontFamily(textStyle.fontFamily);
    }
    if (typeof textStyle.color === 'string') {
      setTextColor(textStyle.color);
    }

    const { $from } = activeEditor.state.selection;
    for (let depth = $from.depth; depth > 0; depth -= 1) {
      const node = $from.node(depth);
      if (!['paragraph', 'heading', 'infoBox'].includes(node.type.name)) {
        continue;
      }

      setSpacingTop(
        typeof node.attrs.spacingTop === 'number'
          ? String(node.attrs.spacingTop)
          : '0'
      );
      setSpacingBottom(
        typeof node.attrs.spacingBottom === 'number'
          ? String(node.attrs.spacingBottom)
          : '16'
      );
      setLineHeight(
        typeof node.attrs.lineHeight === 'number'
          ? String(node.attrs.lineHeight)
          : '1.5'
      );
      break;
    }
  }, [
    activeEditor,
    selectionRevision,
    setFontFamily,
    setFontSize,
    setLineHeight,
    setSpacingBottom,
    setSpacingTop,
    setTextColor,
  ]);

  useEffect(() => {
    setLeftSidebarWidth(
      clampSidebarWidth(
        'left',
        readStoredNumber(
          SIDEBAR_STORAGE_KEYS.leftWidth,
          SIDEBAR_WIDTH.left.default
        )
      )
    );
    setRightSidebarWidth(
      clampSidebarWidth(
        'right',
        readStoredNumber(
          SIDEBAR_STORAGE_KEYS.rightWidth,
          SIDEBAR_WIDTH.right.default
        )
      )
    );
    setLeftSidebarCollapsed(
      readStoredBoolean(SIDEBAR_STORAGE_KEYS.leftCollapsed, false)
    );
    setRightSidebarCollapsed(
      readStoredBoolean(SIDEBAR_STORAGE_KEYS.rightCollapsed, false)
    );
    setSidebarStorageReady(true);
  }, []);

  useEffect(() => {
    let isMounted = true;

    getOrganizationDocumentTemplateLogoUrl(organizationId)
      .then((logoUrl) => {
        if (isMounted) {
          setOrganizationLogoUrl(logoUrl);
        }
      })
      .catch(() => {
        if (isMounted) {
          setOrganizationLogoUrl(null);
        }
      });

    return () => {
      isMounted = false;
    };
  }, [organizationId]);

  useEffect(() => {
    if (!sidebarStorageReady) return;
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEYS.leftWidth,
      String(leftSidebarWidth)
    );
  }, [leftSidebarWidth, sidebarStorageReady]);

  useEffect(() => {
    if (!sidebarStorageReady) return;
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEYS.rightWidth,
      String(rightSidebarWidth)
    );
  }, [rightSidebarWidth, sidebarStorageReady]);

  useEffect(() => {
    if (!sidebarStorageReady) return;
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEYS.leftCollapsed,
      String(leftSidebarCollapsed)
    );
  }, [leftSidebarCollapsed, sidebarStorageReady]);

  useEffect(() => {
    if (!sidebarStorageReady) return;
    window.localStorage.setItem(
      SIDEBAR_STORAGE_KEYS.rightCollapsed,
      String(rightSidebarCollapsed)
    );
  }, [rightSidebarCollapsed, sidebarStorageReady]);

  useEffect(() => {
    if (!resizingSidebar) return;

    const previousCursor = document.body.style.cursor;
    const previousUserSelect = document.body.style.userSelect;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    const handlePointerMove = (event: PointerEvent) => {
      const resizeState = sidebarResizeRef.current;
      if (!resizeState) return;

      const delta = event.clientX - resizeState.startX;
      const nextWidth =
        resizeState.side === 'left'
          ? resizeState.startWidth + delta
          : resizeState.startWidth - delta;

      if (resizeState.side === 'left') {
        setLeftSidebarWidth(clampSidebarWidth('left', nextWidth));
        return;
      }

      setRightSidebarWidth(clampSidebarWidth('right', nextWidth));
    };

    const stopResize = () => {
      sidebarResizeRef.current = null;
      setResizingSidebar(null);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', stopResize);
    window.addEventListener('pointercancel', stopResize);

    return () => {
      document.body.style.cursor = previousCursor;
      document.body.style.userSelect = previousUserSelect;
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', stopResize);
      window.removeEventListener('pointercancel', stopResize);
    };
  }, [resizingSidebar]);

  function startSidebarResize(
    side: SidebarResizeSide,
    event: ReactPointerEvent<HTMLDivElement>
  ) {
    event.preventDefault();
    const startWidth = side === 'left' ? leftSidebarWidth : rightSidebarWidth;
    sidebarResizeRef.current = {
      side,
      startX: event.clientX,
      startWidth,
    };
    setResizingSidebar(side);
  }

  function currentContent(): DocumentTemplateContent {
    return {
      ...content,
      meta: { ...content.meta, description },
      document: content.document,
      page: {
        ...content.page,
        header: {
          ...content.page.header,
          blocks: headerEditor
            ? upsertAreaTextBlock(
                content.page.header.blocks,
                headerTextBlock,
                toRichTextNode(headerEditor.getJSON())
              )
            : content.page.header.blocks,
        },
        footer: {
          ...content.page.footer,
          blocks: footerEditor
            ? upsertAreaTextBlock(
                content.page.footer.blocks,
                footerTextBlock,
                toRichTextNode(footerEditor.getJSON())
              )
            : content.page.footer.blocks,
        },
      },
    };
  }

  const pageTitle = template
    ? 'Dokumentvorlage bearbeiten'
    : 'Neue Dokumentvorlage';
  const selectedImageAttributes = activeEditor?.getAttributes(
    'templateImage'
  ) ?? {
    alt: '',
    width: 160,
    height: 80,
    align: 'left',
    keepAspectRatio: true,
    mode: 'inline',
    x: 0,
    y: 0,
  };
  const hasSelectedImage = activeEditor?.isActive('templateImage') ?? false;
  const selectedImageWidth =
    typeof selectedImageAttributes.width === 'number'
      ? selectedImageAttributes.width
      : 160;
  const selectedImageHeight =
    typeof selectedImageAttributes.height === 'number'
      ? selectedImageAttributes.height
      : 80;
  const selectedImageAlt =
    typeof selectedImageAttributes.alt === 'string'
      ? selectedImageAttributes.alt
      : '';
  const selectedImageKeepAspectRatio =
    typeof selectedImageAttributes.keepAspectRatio === 'boolean'
      ? selectedImageAttributes.keepAspectRatio
      : true;
  const selectedImageAlign =
    selectedImageAttributes.align === 'center' ||
    selectedImageAttributes.align === 'right'
      ? selectedImageAttributes.align
      : 'left';
  const selectedImageMode: TemplateImageProperties['mode'] =
    selectedImageAttributes.mode === 'free' ? 'free' : 'inline';
  const selectedImageX =
    typeof selectedImageAttributes.x === 'number'
      ? selectedImageAttributes.x
      : 0;
  const selectedImageY =
    typeof selectedImageAttributes.y === 'number'
      ? selectedImageAttributes.y
      : 0;
  const selectedImageProperties: TemplateImageProperties = {
    alt: selectedImageAlt,
    width: selectedImageWidth,
    height: selectedImageHeight,
    align: selectedImageAlign,
    keepAspectRatio: selectedImageKeepAspectRatio,
    mode: selectedImageMode,
    x: selectedImageX,
    y: selectedImageY,
  };
  const headerHeightPx = content.page.header.enabled
    ? mmToPx(content.page.header.height)
    : 0;
  const footerHeightPx = content.page.footer.enabled
    ? mmToPx(content.page.footer.height)
    : 0;
  const pagePaddingTopPx = mmToPx(content.page.margins.top);
  const pagePaddingRightPx = mmToPx(content.page.margins.right);
  const pagePaddingBottomPx = mmToPx(content.page.margins.bottom);
  const pagePaddingLeftPx = mmToPx(content.page.margins.left);
  const pageContentWidthPx =
    A4_EDITOR_WIDTH_PX - pagePaddingLeftPx - pagePaddingRightPx;
  const bodyAreaHeightPx = Math.max(
    360,
    A4_EDITOR_HEIGHT_PX -
      pagePaddingTopPx -
      pagePaddingBottomPx -
      headerHeightPx -
      footerHeightPx
  );
  const bodyPageDocuments = splitDocumentIntoPages(content.document);
  const pageCount = bodyPageDocuments.length;
  const pageIndexes = Array.from({ length: pageCount }, (_, index) => index);
  const {
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
  } = useDocumentTemplateImages({
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
  });
  const {
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
  } = useDocumentTemplateFormatting({
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
  });
  const { pageScaleStyle, pageScaleViewportStyle } = useDocumentTemplateZoom({
    setZoom,
    zoom,
  });

  useDocumentTemplateDebug({
    bodyAreaHeightPx,
    leftSidebarCollapsed,
    leftSidebarWidth,
    pageContentWidthPx,
    pageStackRef,
    rightSidebarCollapsed,
    rightSidebarWidth,
    zoom,
  });
  const saveStatusLabel =
    saveStatus === 'saving'
      ? 'Speichert...'
      : saveStatus === 'saved'
        ? 'Gespeichert'
        : 'Nicht gespeichert';
  const editorGridColumns = `${
    leftSidebarCollapsed
      ? `${COLLAPSED_SIDEBAR_WIDTH_PX}px`
      : `${leftSidebarWidth}px`
  } minmax(620px,1fr) ${
    rightSidebarCollapsed
      ? `${COLLAPSED_SIDEBAR_WIDTH_PX}px`
      : `${rightSidebarWidth}px`
  }`;

  return {
    applyFontFamily,
    applyFontSize,
    applyLineHeight,
    applyTextColor,
    deleteCurrentBlock,
    deleteSelectedDynamicField,
    duplicateCurrentBlock,
    handleBodyPageFocus,
    handleBodyOverflowMeasurement,
    handleEditorContextMenu,
    insertBlock,
    insertField,
    moveCurrentBlock,
    pageScaleStyle,
    pageScaleViewportStyle,
    setBlockSpacing,
    showSelectedDynamicFieldInformation,
    updateFooterBlock,
    updateHeaderBlock,
    updatePageSettings,
    activeArea,
    activeBodyPageIndex,
    activeEditor,
    addManualPage,
    applySelectedImageProperties,
    blockSearch,
    bodyAreaHeightPx,
    bodyDocumentSyncRequests,
    bodyEditorsRef,
    bodyFocusRequest,
    bodyPageDocuments,
    clearBodyDocumentSyncRequest,
    clearBodyFocusRequest,
    content,
    contextMenuTarget,
    currentContent,
    deletePage,
    deleteSelectedImage,
    description,
    duplicateSelectedImage,
    editorGridColumns,
    effectiveGroupLabels,
    exportingFormat,
    fieldSearch,
    fields,
    filteredBlockGroups,
    fontSize,
    fontFamily,
    footerEditor,
    footerHeightPx,
    footerTextBlock,
    handleBodyPageChange,
    handleExport,
    handleFieldDrop,
    handleImageUpload,
    handleSave,
    hasSelectedImage,
    headerEditor,
    headerHeightPx,
    headerTextBlock,
    imageInputRef,
    imagePropertiesDialogOpen,
    isSaving,
    leftSidebarCollapsed,
    markDirty,
    mode,
    name,
    openSelectedImageProperties,
    pageContentWidthPx,
    pageCount,
    pageIndexes,
    pagePaddingBottomPx,
    pagePaddingLeftPx,
    pagePaddingRightPx,
    pagePaddingTopPx,
    pageStackRef,
    pageTitle,
    pageToDelete,
    paginationContinuationRequest,
    previewFields,
    registerBodyEditor,
    replaceSelectedImage,
    rightSidebarCollapsed,
    saveStatus,
    saveStatusLabel,
    selectedDynamicField,
    selectedImageMode,
    selectedImageProperties,
    setActiveArea,
    setBlockSearch,
    setDescription,
    setFieldSearch,
    setImagePropertiesDialogOpen,
    setLeftSidebarCollapsed,
    setMode,
    setName,
    setPageToDelete,
    setRightSidebarCollapsed,
    setZoom,
    spacingBottom,
    spacingTop,
    lineHeight,
    startSidebarResize,
    template,
    textColor,
    updateSelectedImageAttribute,
    zoom,
  };
}

export type DocumentTemplateEditorControllerModel = ReturnType<
  typeof useDocumentTemplateEditorController
>;
