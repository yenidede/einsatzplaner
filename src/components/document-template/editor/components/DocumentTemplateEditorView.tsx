'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
  type ReactNode,
} from 'react';
import { useRouter } from 'next/navigation';
import {
  EditorContent,
  useEditor,
  type Editor,
  type JSONContent,
} from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { isNodeSelection } from '@tiptap/core';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowUp,
  Bold,
  ChevronDown,
  Copy,
  Download,
  FileText,
  ImageIcon,
  Italic,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelTop,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Search,
  Trash2,
  UnderlineIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import type {
  DocumentTemplateContent,
  DocumentTemplateFieldDefinition,
  DocumentTemplatePageSettings,
  DocumentTemplateRecord,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import {
  createDocumentTemplate,
  uploadDocumentTemplateImage,
  updateDocumentTemplate,
  getOrganizationDocumentTemplateLogoUrl,
} from '@/features/document-template/server/document-template.actions';
import { createDefaultDocumentTemplateContent } from '@/features/document-template/lib/document-template-defaults';
import {
  DOCUMENT_PAGE_HEIGHT_PX,
  DOCUMENT_PAGE_WIDTH_PX,
  getDocumentPageViewport,
} from '@/features/document-template/lib/document-page-geometry';
import {
  createEmptyRichTextDocument,
  createRichTextDocumentFromNodes,
  deletePageAtIndex,
  documentPageNodes,
  mergePageDocuments,
  splitDocumentIntoPages as splitDocumentIntoPagesBase,
} from '@/features/document-template/lib/document-template-pages';
import { DocumentKeyboardShortcutsExtension } from '../DocumentKeyboardShortcutsExtension';
import { DocumentTemplateEditorStyles } from '../DocumentTemplateEditorStyles';
import { PageBodyEditor } from '../components/DocumentTemplatePageBodyEditor';
import { DocumentTemplateFieldLibrary } from './DocumentTemplateFieldLibrary';
import { DocumentTemplateImageContextMenu } from '../DocumentTemplateImageContextMenu';
import {
  DocumentTemplateImagePropertiesPopover,
  type TemplateImageProperties,
} from '../DocumentTemplateImagePropertiesPopover';
import { TemplateImageNode } from '../TemplateImageNode';
import {
  DocumentBlockStyleExtension,
  DynamicFieldNode,
  InfoBoxNode,
  PageBreakNode,
} from '../tiptap/document-template-nodes';
import { documentTemplateBlockGroups } from '../document-template-block-groups';
import type {
  ContextMenuTarget,
  EditableArea,
  PageBodyChange,
  PageBodyEditorHandle,
  PageBodySelectionSnapshot,
  PageDocumentSyncRequest,
  PageFocusRequest,
  PageOverflowMeasurement,
  PaginationContinuationRequest,
  PaginationDebugPayload,
  PaginationTransactionType,
  PendingImageInsert,
  PendingPaginationMeasurement,
  SaveStatus,
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
import {
  AUTO_PAGINATION_ENABLED,
  DISABLE_HEADER_FOOTER_FOR_LAYOUT_DEBUG,
  DISABLE_PARENT_MERGE_FOR_ENTER_DEBUG,
  DOCUMENT_BLOCK_DRAG_MIME,
  DOCUMENT_FIELD_DRAG_MIME,
  ENTER_PAGINATION_STEP_LIMIT,
  MINIMAL_TIPTAP_FOR_ENTER_DEBUG,
  PASTE_PAGINATION_STEP_LIMIT,
  TEXT_COLOR_OPTIONS,
} from '../utils/documentTemplateEditorConstants';
import {
  bodyMeasurementPayload,
  containsNodeSignatures,
  countPageBreaks,
  createSelectionSnapshot,
  emptySelectionSnapshot,
  isEmptyParagraphNode,
  logCursorDebug,
  logDeletePage,
  logEditorFocus,
  logEditorSetContent,
  logEnterDebug,
  logLayoutDebug,
  logPaginationDebug,
  logPaginationMutation,
  nodeSignature,
  splitDocumentIntoPages,
  summarizeNodes,
} from '../utils/documentTemplateDebugUtils';
import {
  createEditorBlockId,
  createEditorExtensions,
  createSampleResolvedFields,
  downloadBase64File,
  getAreaTextBlock,
  getSelectedDynamicField,
  groupLabels,
  normalizeAttrs,
  richTextFromBlockText,
  toRichTextNode,
} from '../utils/documentTemplateEditorUtils';
import { Button } from '@/components/ui/button';
import { Kbd, KbdGroup } from '@/components/ui/kbd';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';

import type { DocumentTemplateEditorControllerModel } from '../hooks/useDocumentTemplateEditorController';
import { DocumentTemplateToolbar } from './DocumentTemplateToolbar';
import { DocumentTemplateCanvas } from './DocumentTemplateCanvas';
import { DocumentTemplateLeftSidebar } from './DocumentTemplateLeftSidebar';
import { DocumentTemplateRightSidebar } from './DocumentTemplateRightSidebar';
import { DocumentTemplateExportDropdown } from './DocumentTemplateExportDropdown';
import { DocumentTemplateImageDialog } from './DocumentTemplateImageDialog';

function ToolbarTooltip({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export function DocumentTemplateEditorView({
  controller,
}: {
  controller: DocumentTemplateEditorControllerModel;
}) {
  const router = useRouter();
  const [leaveDialogOpen, setLeaveDialogOpen] = useState(false);
  const [formatToolbarVisible, setFormatToolbarVisible] = useState(true);
  const {
    applyFontSize,
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
    name,
    organizationId,
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
    selectedDynamicField,
    selectedImageProperties,
    setActiveArea,
    setBlockSearch,
    setDescription,
    setFieldSearch,
    setImagePropertiesDialogOpen,
    setLeftSidebarCollapsed,
    setName,
    setPageToDelete,
    setRightSidebarCollapsed,
    setZoom,
    spacingBottom,
    spacingTop,
    startSidebarResize,
    template,
    textColor,
    updateSelectedImageAttribute,
    zoom,
  } = controller;

  const settingsPath = `/settings/org/${organizationId}#vorlagen`;

  useEffect(() => {
    setFormatToolbarVisible(
      readStoredBoolean(SIDEBAR_STORAGE_KEYS.formatToolbarVisible, true)
    );
  }, []);

  function toggleFormatToolbar() {
    setFormatToolbarVisible((current) => {
      const next = !current;
      window.localStorage.setItem(
        SIDEBAR_STORAGE_KEYS.formatToolbarVisible,
        String(next)
      );
      return next;
    });
  }

  const returnToSettings = useCallback(() => {
    if (saveStatus === 'dirty') {
      setLeaveDialogOpen(true);
      return;
    }

    router.push(settingsPath);
  }, [router, saveStatus, settingsPath]);

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key !== 'Escape' || leaveDialogOpen) return;
      event.preventDefault();
      returnToSettings();
    }

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [leaveDialogOpen, returnToSettings]);

  return (
    <TooltipProvider>
      <div className="flex h-[calc(100dvh-6rem)] min-h-0 flex-col bg-[#eef0f3]">
        <input
          ref={imageInputRef}
          type="file"
          accept="image/png,image/jpeg,image/jpg,image/webp"
          className="hidden"
          onChange={(event) => void handleImageUpload(event.target.files?.[0])}
        />
        <DocumentTemplateImageDialog controller={controller} />
        <header className="bg-background sticky top-0 z-30 border-b px-4 py-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[280px]">
              <p className="text-muted-foreground mb-1 text-xs">{pageTitle}</p>
              <div className="grid gap-2 md:grid-cols-[minmax(220px,320px)_minmax(260px,420px)]">
                <Input
                  value={name}
                  onChange={(event) => {
                    markDirty();
                    setName(event.target.value);
                  }}
                  aria-label="Name der Dokumentvorlage"
                  className="h-8 font-medium"
                />
                <Input
                  value={description}
                  onChange={(event) => {
                    markDirty();
                    setDescription(event.target.value);
                  }}
                  aria-label="Beschreibung der Dokumentvorlage"
                  placeholder="Beschreibung"
                  className="h-8"
                />
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <DocumentTemplateExportDropdown controller={controller} />
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  size="sm"
                  variant="ghost"
                  className="min-h-9 px-3 text-sm"
                  onClick={returnToSettings}
                  disabled={isSaving}
                >
                  Zurück
                  <span className="ml-2 hidden sm:inline">
                    <Kbd>ESC</Kbd>
                  </span>
                </Button>
                <Button
                  type="button"
                  size="sm"
                  className="min-h-9 px-3 text-sm"
                  onClick={() => void handleSave()}
                  disabled={isSaving}
                >
                  {isSaving ? 'Speichert...' : 'Speichern'}
                  <KbdGroup className="ml-2 hidden sm:flex">
                    <Kbd>⌘</Kbd>
                    <Kbd>S</Kbd>
                  </KbdGroup>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <AlertDialog open={leaveDialogOpen} onOpenChange={setLeaveDialogOpen}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Bearbeitung abbrechen?</AlertDialogTitle>
              <AlertDialogDescription>
                Ihre ungespeicherten Änderungen gehen verloren, wenn Sie zu den
                Einstellungen zurückkehren.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Weiter bearbeiten</AlertDialogCancel>
              <AlertDialogAction onClick={() => router.push(settingsPath)}>
                Änderungen verwerfen
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {formatToolbarVisible ? (
          <DocumentTemplateToolbar
            controller={controller}
            onHide={toggleFormatToolbar}
          />
        ) : (
          <div className="bg-background flex justify-end border-b px-4 py-1">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  size="icon-xs"
                  variant="ghost"
                  aria-label="Formatleiste anzeigen"
                  onClick={toggleFormatToolbar}
                >
                  <ChevronDown />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Formatleiste anzeigen</TooltipContent>
            </Tooltip>
          </div>
        )}

        <div
          className="grid min-h-0 flex-1 gap-4 p-4"
          style={{ gridTemplateColumns: editorGridColumns }}
        >
          <DocumentTemplateLeftSidebar controller={controller} />

          <DocumentTemplateCanvas controller={controller} />

          <DocumentTemplateRightSidebar controller={controller} />
        </div>

        <DocumentTemplateEditorStyles />
      </div>
    </TooltipProvider>
  );
}
