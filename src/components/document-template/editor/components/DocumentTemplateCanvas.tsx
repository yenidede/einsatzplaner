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
import { DocumentTemplatePage } from './DocumentTemplatePage';
import { DocumentTemplatePageDeleteDialog } from './DocumentTemplatePageDeleteDialog';
import { DocumentTemplateToolbar } from './DocumentTemplateToolbar';
export function DocumentTemplateCanvas({
  controller,
}: {
  controller: DocumentTemplateEditorControllerModel;
}) {
  const {
    deleteCurrentBlock,
    deleteSelectedDynamicField,
    duplicateCurrentBlock,
    handleBodyPageFocus,
    handleBodyOverflowMeasurement,
    handleEditorContextMenu,
    moveCurrentBlock,
    pageScaleStyle,
    pageScaleViewportStyle,
    showSelectedDynamicFieldInformation,
    activeBodyPageIndex,
    activeEditor,
    addManualPage,
    bodyAreaHeightPx,
    bodyDocumentSyncRequests,
    bodyEditorsRef,
    bodyFocusRequest,
    bodyPageDocuments,
    clearBodyDocumentSyncRequest,
    clearBodyFocusRequest,
    content,
    canvasViewportRef,
    contextMenuTarget,
    currentContent,
    deletePage,
    deleteSelectedImage,
    duplicateSelectedImage,
    fields,
    footerEditor,
    footerHeightPx,
    handleBodyPageChange,
    handleFieldDrop,
    headerEditor,
    headerHeightPx,
    mode,
    openSelectedImageProperties,
    pageContentWidthPx,
    pageCount,
    pageIndexes,
    pagePaddingBottomPx,
    pagePaddingLeftPx,
    pagePaddingRightPx,
    pagePaddingTopPx,
    pageStackRef,
    pageToDelete,
    paginationContinuationRequest,
    previewFields,
    registerBodyEditor,
    replaceSelectedImage,
    selectedDynamicField,
    selectedImageMode,
    setActiveArea,
    setPageToDelete,
    template,
    updateSelectedImageAttribute,
  } = controller;

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger asChild>
          <main
            ref={canvasViewportRef}
            className="min-h-0 overflow-auto rounded-md bg-[#e3e6ea]"
            onContextMenu={handleEditorContextMenu}
          >
            <div className="flex min-h-full min-w-max justify-center px-6 py-8">
              {mode === 'preview' ? (
                <div style={pageScaleViewportStyle()}>
                  <div style={pageScaleStyle()}>
                    <DocumentTemplatePreview
                      content={currentContent()}
                      fields={previewFields}
                    />
                  </div>
                </div>
              ) : (
                <div
                  ref={pageStackRef}
                  className="document-template-page-stack flex flex-col gap-8"
                >
                  {pageIndexes.map((pageIndex) => (
                    <DocumentTemplatePage
                      key={pageIndex}
                      controller={controller}
                      pageIndex={pageIndex}
                    />
                  ))}
                  <Button
                    type="button"
                    variant="outline"
                    className="bg-background self-center shadow-sm"
                    onClick={addManualPage}
                    aria-label="Neue Seite hinzufügen"
                  >
                    <Plus data-icon="inline-start" />
                    Seite hinzufügen
                  </Button>
                  <DocumentTemplatePageDeleteDialog controller={controller} />
                </div>
              )}
            </div>
          </main>
        </ContextMenuTrigger>
        <ContextMenuContent>
          {contextMenuTarget === 'image' ? (
            <DocumentTemplateImageContextMenu
              mode={selectedImageMode}
              onEdit={openSelectedImageProperties}
              onReplace={replaceSelectedImage}
              onDuplicate={duplicateSelectedImage}
              onSetMode={(mode) => updateSelectedImageAttribute({ mode })}
              onSetAlign={(align) => updateSelectedImageAttribute({ align })}
              onDelete={deleteSelectedImage}
            />
          ) : contextMenuTarget === 'dynamicField' && selectedDynamicField ? (
            <>
              <ContextMenuItem onClick={showSelectedDynamicFieldInformation}>
                Feldinformationen anzeigen
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={deleteSelectedDynamicField}
              >
                Feld entfernen
              </ContextMenuItem>
            </>
          ) : (
            <>
              <ContextMenuItem onClick={duplicateCurrentBlock}>
                Duplizieren
              </ContextMenuItem>
              <ContextMenuItem onClick={() => moveCurrentBlock('up')}>
                Nach oben
              </ContextMenuItem>
              <ContextMenuItem onClick={() => moveCurrentBlock('down')}>
                Nach unten
              </ContextMenuItem>
              <ContextMenuSub>
                <ContextMenuSubTrigger>Ausrichtung</ContextMenuSubTrigger>
                <ContextMenuSubContent>
                  <ContextMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().setTextAlign('left').run()
                    }
                  >
                    Links
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().setTextAlign('center').run()
                    }
                  >
                    Mitte
                  </ContextMenuItem>
                  <ContextMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().setTextAlign('right').run()
                    }
                  >
                    Rechts
                  </ContextMenuItem>
                </ContextMenuSubContent>
              </ContextMenuSub>
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={deleteCurrentBlock}
              >
                Löschen
              </ContextMenuItem>
            </>
          )}
        </ContextMenuContent>
      </ContextMenu>
    </>
  );
}
