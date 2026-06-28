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
  EyeOff,
  Eye,
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
  Save,
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
  exportDocumentTemplatePreview,
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
import { DocumentTemplatePreview } from '../../DocumentTemplatePreview';
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
    startSidebarResize,
    template,
    textColor,
    updateSelectedImageAttribute,
    zoom,
  } = controller;

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
        <header className="bg-background border-b px-4 py-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-[280px]">
              <p className="text-muted-foreground text-sm">{pageTitle}</p>
              <div className="grid gap-2 md:grid-cols-[minmax(220px,320px)_minmax(260px,420px)]">
                <Input
                  value={name}
                  onChange={(event) => {
                    markDirty();
                    setName(event.target.value);
                  }}
                  aria-label="Name der Dokumentvorlage"
                  className="font-medium"
                />
                <Input
                  value={description}
                  onChange={(event) => {
                    markDirty();
                    setDescription(event.target.value);
                  }}
                  aria-label="Beschreibung der Dokumentvorlage"
                  placeholder="Beschreibung"
                />
              </div>
              <p
                className={`mt-1 text-xs ${
                  saveStatus === 'dirty'
                    ? 'text-amber-700'
                    : 'text-muted-foreground'
                }`}
              >
                {saveStatusLabel}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <div className="bg-muted flex rounded-md p-1">
                <Button
                  size="sm"
                  variant={mode === 'edit' ? 'secondary' : 'ghost'}
                  onClick={() => setMode('edit')}
                >
                  <EyeOff data-icon="inline-start" />
                  Bearbeiten
                </Button>
                <Button
                  size="sm"
                  variant={mode === 'preview' ? 'secondary' : 'ghost'}
                  onClick={() => setMode('preview')}
                >
                  <Eye data-icon="inline-start" />
                  Vorschau
                </Button>
              </div>
              <DocumentTemplateExportDropdown controller={controller} />
              <Button onClick={() => void handleSave()} disabled={isSaving}>
                <Save data-icon="inline-start" />
                Speichern
              </Button>
            </div>
          </div>
        </header>

        <DocumentTemplateToolbar controller={controller} />

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
