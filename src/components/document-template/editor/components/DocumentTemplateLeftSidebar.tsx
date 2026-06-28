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
import { DocumentTemplateBlockLibrary } from './DocumentTemplateBlockLibrary';
import { DocumentTemplateToolbar } from './DocumentTemplateToolbar';
export function DocumentTemplateLeftSidebar({
  controller,
}: {
  controller: DocumentTemplateEditorControllerModel;
}) {
  const {
    insertBlock,
    blockSearch,
    description,
    filteredBlockGroups,
    leftSidebarCollapsed,
    setBlockSearch,
    setLeftSidebarCollapsed,
    startSidebarResize,
  } = controller;

  return (
    <>
      {leftSidebarCollapsed ? (
        <div className="bg-background flex min-h-0 flex-col items-center overflow-hidden rounded-md border-0 py-2 shadow-sm">
          <Button
            type="button"
            size="icon"
            variant="ghost"
            aria-label="Bausteine einblenden"
            className="size-8 rounded-md"
            onClick={() => setLeftSidebarCollapsed(false)}
          >
            <PanelLeftOpen />
          </Button>
        </div>
      ) : (
        <Card className="relative min-h-0 border-0 shadow-sm">
          <CardHeader className="flex flex-row items-start justify-between gap-2">
            <div>
              <CardTitle>Bausteine</CardTitle>
              <CardDescription>
                Fügen Sie Inhalte in die A4-Seite ein.
              </CardDescription>
            </div>
            <Button
              type="button"
              size="icon"
              variant="ghost"
              aria-label="Bausteine ausblenden"
              onClick={() => setLeftSidebarCollapsed(true)}
            >
              <PanelLeftClose />
            </Button>
          </CardHeader>
          <CardContent className="flex min-h-0 flex-col gap-4 overflow-auto pr-6">
            <div className="relative">
              <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
              <Input
                value={blockSearch}
                onChange={(event) => setBlockSearch(event.target.value)}
                placeholder="Bausteine suchen..."
                className="pl-9"
                aria-label="Bausteine suchen"
              />
            </div>
            <DocumentTemplateBlockLibrary
              groups={filteredBlockGroups}
              onInsert={insertBlock}
            />
          </CardContent>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                role="separator"
                aria-orientation="vertical"
                aria-label="Breite der linken Seitenleiste ändern"
                className="group absolute top-0 right-[-8px] z-20 flex h-full w-2 cursor-col-resize items-center justify-center"
                onPointerDown={(event) => startSidebarResize('left', event)}
              >
                <span className="bg-border group-hover:bg-ring h-12 w-1 rounded-full transition-colors" />
              </div>
            </TooltipTrigger>
            <TooltipContent side="right">
              Breite der linken Seitenleiste ändern
            </TooltipContent>
          </Tooltip>
        </Card>
      )}
    </>
  );
}
