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
import { DocumentTemplatePreview } from '../DocumentTemplatePreview';
import { DocumentKeyboardShortcutsExtension } from './DocumentKeyboardShortcutsExtension';
import { DocumentTemplateEditorStyles } from './DocumentTemplateEditorStyles';
import { DocumentTemplateFieldLibrary } from './DocumentTemplateFieldLibrary';
import { DocumentTemplateImageContextMenu } from './DocumentTemplateImageContextMenu';
import {
  DocumentTemplateImagePropertiesPopover,
  type TemplateImageProperties,
} from './DocumentTemplateImagePropertiesPopover';
import { TemplateImageNode } from './TemplateImageNode';
import {
  DocumentBlockStyleExtension,
  DynamicFieldNode,
  InfoBoxNode,
  PageBreakNode,
} from './tiptap/document-template-nodes';
import { documentTemplateBlockGroups } from './document-template-block-groups';
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

type EditableArea = 'header' | 'body' | 'footer';
type SaveStatus = 'dirty' | 'saving' | 'saved';
type SidebarResizeSide = 'left' | 'right';
type ContextMenuTarget = 'editor' | 'dynamicField' | 'image';
type SelectedDynamicField = {
  area: EditableArea;
  fieldKey: string;
  label: string;
};
type SidebarResizeState = {
  side: SidebarResizeSide;
  startX: number;
  startWidth: number;
};
type PendingImageInsert = {
  targetArea: EditableArea;
  position: number | null;
};
type PageBodyEditorHandle = Editor | null;
type PaginationTransactionType = 'enter' | 'paste' | 'content';
type PageBodySelectionSnapshot = {
  from: number;
  to: number;
  nodeIndex: number;
};
type PendingPaginationMeasurement = {
  reason: 'document-change' | 'paste-continuation';
  transactionType: PaginationTransactionType;
  oldSelection: PageBodySelectionSnapshot;
  newSelection: PageBodySelectionSnapshot;
  maxSteps: number;
  editRevision: number;
};
type PageBodyChange = PendingPaginationMeasurement & {
  pageIndex: number;
  document: DocumentTemplateRichTextNode;
  docChanged: boolean;
};
type PageOverflowMeasurement = PendingPaginationMeasurement & {
  pageIndex: number;
  overflowDetected: boolean;
  overflowNodeIndex: number;
  scrollHeight: number;
  clientHeight: number;
  bodyAreaHeightPx: number;
  measuredAt: number;
};
type PageFocusRequest = {
  pageIndex: number;
  revision: number;
  reason: 'pagination' | 'explicit-user-action';
  editRevision?: number;
  position: 'start' | 'end';
};
type PageDocumentSyncRequest = {
  pageIndex: number;
  revision: number;
  reason: 'pagination';
  editRevision?: number;
};
type PaginationContinuationRequest = {
  pageIndex: number;
  revision: number;
  measurement: PendingPaginationMeasurement;
};
type PaginationDebugPayload = {
  reason: PendingPaginationMeasurement['reason'];
  transactionType: PaginationTransactionType;
  pageIndex: number;
  beforePageCount: number;
  afterPageCount: number;
  overflowDetected: boolean;
  overflowNodeIndex: number;
  movedNodeCount: number;
  cursorWasMoved: boolean;
  oldSelection: PageBodySelectionSnapshot;
  newSelection: PageBodySelectionSnapshot;
};
const TEXT_COLOR_OPTIONS = [
  { label: 'Schwarz', value: '#111827' },
  { label: 'Grau', value: '#6b7280' },
  { label: 'Dunkelblau', value: '#1e3a8a' },
  { label: 'Rot', value: '#b91c1c' },
  { label: 'Grün', value: '#166534' },
];

const A4_EDITOR_WIDTH_PX = 794;
const A4_EDITOR_HEIGHT_PX = 1123;
const MM_TO_EDITOR_PX = A4_EDITOR_WIDTH_PX / 210;
const DOCUMENT_FIELD_DRAG_MIME = 'application/document-template-field';
const DOCUMENT_BLOCK_DRAG_MIME = 'application/document-template-block';
const COLLAPSED_SIDEBAR_WIDTH_PX = 48;
const SIDEBAR_WIDTH = {
  left: { min: 240, default: 300, max: 420 },
  right: { min: 280, default: 340, max: 520 },
};
const SIDEBAR_STORAGE_KEYS = {
  leftWidth: 'documentTemplateEditor.leftSidebarWidth',
  rightWidth: 'documentTemplateEditor.rightSidebarWidth',
  leftCollapsed: 'documentTemplateEditor.leftSidebarCollapsed',
  rightCollapsed: 'documentTemplateEditor.rightSidebarCollapsed',
};
const ENTER_PAGINATION_STEP_LIMIT = 1;
const PASTE_PAGINATION_STEP_LIMIT = 10;
const DISABLE_PAGINATION_MUTATION_FOR_CURSOR_DEBUG =
  process.env.NODE_ENV === 'development' && true;
const DISABLE_PARENT_MERGE_FOR_CURSOR_DEBUG =
  process.env.NODE_ENV === 'development' && false;

function clampSidebarWidth(side: SidebarResizeSide, value: number): number {
  const limits = SIDEBAR_WIDTH[side];
  return Math.min(limits.max, Math.max(limits.min, value));
}

function readStoredNumber(key: string, fallback: number): number {
  const storedValue = window.localStorage.getItem(key);
  if (!storedValue) return fallback;

  const parsedValue = Number(storedValue);
  return Number.isFinite(parsedValue) ? parsedValue : fallback;
}

function readStoredBoolean(key: string, fallback: boolean): boolean {
  const storedValue = window.localStorage.getItem(key);
  if (storedValue === 'true') return true;
  if (storedValue === 'false') return false;
  return fallback;
}

function mmToPx(value: number): number {
  return Math.round(value * MM_TO_EDITOR_PX);
}

function createEmptyRichTextDocument(): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: [
      {
        type: 'paragraph',
        content: [],
      },
    ],
  };
}

function createPageBreakNode(): DocumentTemplateRichTextNode {
  return { type: 'pageBreak' };
}

function createRichTextDocumentFromNodes(
  nodes: DocumentTemplateRichTextNode[]
): DocumentTemplateRichTextNode {
  return {
    type: 'doc',
    content: nodes.length > 0 ? nodes : createEmptyRichTextDocument().content,
  };
}

function isEmptyParagraphNode(node: DocumentTemplateRichTextNode): boolean {
  return (
    node.type === 'paragraph' &&
    (!node.content || node.content.length === 0) &&
    !node.text
  );
}

function createSelectionSnapshot(editor: Editor): PageBodySelectionSnapshot {
  const { selection } = editor.state;
  return {
    from: selection.from,
    to: selection.to,
    nodeIndex: selection.$from.index(0),
  };
}

function emptySelectionSnapshot(): PageBodySelectionSnapshot {
  return {
    from: 0,
    to: 0,
    nodeIndex: 0,
  };
}

function documentPageNodes(
  document: DocumentTemplateRichTextNode | undefined
): DocumentTemplateRichTextNode[][] {
  const pages: DocumentTemplateRichTextNode[][] = [[]];

  for (const node of document?.content ?? []) {
    if (node.type === 'pageBreak') {
      pages.push([]);
      continue;
    }

    pages[pages.length - 1]?.push(node);
  }

  return pages.length > 0 ? pages : [[]];
}

function splitDocumentIntoPages(
  document: DocumentTemplateRichTextNode | undefined
): DocumentTemplateRichTextNode[] {
  return documentPageNodes(document).map(createRichTextDocumentFromNodes);
}

function mergePageDocuments(
  pages: DocumentTemplateRichTextNode[]
): DocumentTemplateRichTextNode {
  const content: DocumentTemplateRichTextNode[] = [];

  pages.forEach((page, index) => {
    if (index > 0) {
      content.push(createPageBreakNode());
    }

    content.push(
      ...(page.content ?? createEmptyRichTextDocument().content ?? [])
    );
  });

  return createRichTextDocumentFromNodes(content);
}

function logPaginationMutation(payload: PaginationDebugPayload) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[pagination]', payload);
}

function logEditorSetContent(args: {
  pageIndex: number;
  reason: PageDocumentSyncRequest['reason'];
  selectionBefore: unknown;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[editor:setContent]', args);
}

function logEditorFocus(args: {
  pageIndex: number;
  reason: PageFocusRequest['reason'];
  command: string;
  selectionBefore: unknown;
  selectionAfter: unknown;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[editor:focus]', args);
}

function logCursorDebug(args: {
  action: string;
  reason: string;
  pageIndex: number;
  revision?: number;
  currentRevision?: number;
  isActivePage?: boolean;
  hasOverflow?: boolean;
  overflowNodeIndex?: number;
  scrollHeight?: number;
  clientHeight?: number;
  bodyAreaHeightPx?: number;
  measuredAt?: number;
  transactionType?: PaginationTransactionType;
  transactionDocChanged?: boolean;
  selectionBefore?: unknown;
  selectionAfter?: unknown;
}) {
  if (process.env.NODE_ENV !== 'development') return;

  console.debug('[cursor-debug]', {
    ...args,
    stack: new Error().stack,
  });
}

function richTextFromBlockText(
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

function getAreaTextBlock(
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

function createEditorExtensions() {
  return [
    StarterKit.configure({
      horizontalRule: {},
    }),
    Underline,
    TextStyle,
    TextAlign.configure({
      types: ['heading', 'paragraph'],
    }),
    Placeholder.configure({
      placeholder: 'Beginnen Sie mit Ihrer Dokumentvorlage...',
    }),
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

const groupLabels: Record<DocumentTemplateFieldDefinition['group'], string> = {
  general: 'Allgemein',
  contact: 'Kontakt',
  event: 'Führung / Veranstaltung',
  staff: 'Personal',
  administration: 'Verwaltung',
  custom: 'Eigene Felder',
};

function sampleValueForField(field: DocumentTemplateFieldDefinition) {
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

function createSampleResolvedFields(
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

function getSelectedDynamicField(
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

function toRichTextNode(value: JSONContent): DocumentTemplateRichTextNode {
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

function normalizeAttrs(value: unknown) {
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

function downloadBase64File(
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

function createEditorBlockId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function PageBodyEditor({
  pageIndex,
  document,
  bodyAreaHeightPx,
  isActivePage,
  focusRequest,
  documentSyncRequest,
  paginationContinuation,
  registerEditor,
  onChange,
  onFocus,
  onDocumentSyncApplied,
  onFocusRequestApplied,
  onOverflowMeasured,
}: {
  pageIndex: number;
  document: DocumentTemplateRichTextNode;
  bodyAreaHeightPx: number;
  isActivePage: boolean;
  focusRequest: PageFocusRequest | null;
  documentSyncRequest: PageDocumentSyncRequest | null;
  paginationContinuation: PaginationContinuationRequest | null;
  registerEditor: (pageIndex: number, editor: PageBodyEditorHandle) => void;
  onChange: (change: PageBodyChange) => void;
  onFocus: () => void;
  onDocumentSyncApplied: (pageIndex: number, revision: number) => void;
  onFocusRequestApplied: (revision: number) => void;
  onOverflowMeasured: (measurement: PageOverflowMeasurement) => void;
}) {
  const lastAppliedDocumentRef = useRef(JSON.stringify(document));
  const measureFrameRef = useRef<number | null>(null);
  const pageEditorRef = useRef<Editor | null>(null);
  const pendingPaginationRef = useRef<PendingPaginationMeasurement | null>(
    null
  );
  const nextTransactionTypeRef = useRef<PaginationTransactionType>('content');
  const previousSelectionRef = useRef<PageBodySelectionSnapshot>(
    emptySelectionSnapshot()
  );
  const editRevisionRef = useRef(0);
  const appliedDocumentSyncRevisionRef = useRef(0);
  const appliedFocusRevisionRef = useRef(0);
  const appliedContinuationRevisionRef = useRef(0);
  const initialPageIndexRef = useRef(pageIndex);
  const initialIsActivePageRef = useRef(isActivePage);

  useEffect(() => {
    const mountedPageIndex = initialPageIndexRef.current;
    const mountedIsActivePage = initialIsActivePageRef.current;

    logCursorDebug({
      action: 'PageBodyEditor mounted',
      reason: 'mount',
      pageIndex: mountedPageIndex,
      isActivePage: mountedIsActivePage,
    });

    return () => {
      logCursorDebug({
        action: 'PageBodyEditor unmounted',
        reason: 'unmount',
        pageIndex: mountedPageIndex,
        isActivePage: mountedIsActivePage,
      });
    };
  }, []);

  const measureOverflow = useCallback(() => {
    const pendingPagination = pendingPaginationRef.current;
    pendingPaginationRef.current = null;
    if (!pendingPagination) return;

    if (pendingPagination.editRevision !== editRevisionRef.current) {
      logCursorDebug({
        action: 'measureOverflow:stale',
        reason: pendingPagination.reason,
        pageIndex,
        revision: pendingPagination.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
      });
      return;
    }

    const editorDom = pageEditorRef.current?.view.dom;
    if (!editorDom) return;

    const availableHeight = Math.max(0, bodyAreaHeightPx - 20);
    const children = Array.from(editorDom.children);
    const overflowIndex = children.findIndex(
      (child) =>
        child instanceof HTMLElement &&
        child.offsetTop + child.scrollHeight > availableHeight + 8
    );
    const overflowDetected = overflowIndex >= 0;
    const scrollHeight = editorDom.scrollHeight;
    const clientHeight = editorDom.clientHeight;
    const measuredAt = Date.now();

    logCursorDebug({
      action: 'overflow-result',
      reason: pendingPagination.reason,
      transactionType: pendingPagination.transactionType,
      pageIndex,
      revision: pendingPagination.editRevision,
      currentRevision: editRevisionRef.current,
      isActivePage,
      hasOverflow: overflowDetected,
      overflowNodeIndex: overflowIndex,
      scrollHeight,
      clientHeight,
      bodyAreaHeightPx,
      measuredAt,
      selectionBefore: pendingPagination.oldSelection,
      selectionAfter: pendingPagination.newSelection,
    });

    onOverflowMeasured({
      ...pendingPagination,
      pageIndex,
      overflowDetected,
      overflowNodeIndex: overflowIndex,
      scrollHeight,
      clientHeight,
      bodyAreaHeightPx,
      measuredAt,
    });
  }, [bodyAreaHeightPx, isActivePage, onOverflowMeasured, pageIndex]);

  const scheduleMeasureOverflow = useCallback(() => {
    if (measureFrameRef.current !== null) {
      window.cancelAnimationFrame(measureFrameRef.current);
    }

    measureFrameRef.current = window.requestAnimationFrame(() => {
      measureFrameRef.current = null;
      measureOverflow();
    });
  }, [measureOverflow]);

  const pageEditor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content: document,
    editorProps: {
      attributes: {
        class:
          'document-template-prose document-template-body-editor outline-none focus:outline-none',
      },
      handleDOMEvents: {
        focus: () => {
          onFocus();
          return false;
        },
        keydown: (_, event) => {
          nextTransactionTypeRef.current =
            event.key === 'Enter' ? 'enter' : 'content';
          return false;
        },
        paste: () => {
          nextTransactionTypeRef.current = 'paste';
          return false;
        },
        input: () => {
          return false;
        },
      },
    },
    onUpdate: ({ editor, transaction }) => {
      if (!transaction.docChanged) {
        return;
      }

      editRevisionRef.current += 1;
      const editRevision = editRevisionRef.current;
      const transactionType = nextTransactionTypeRef.current;
      nextTransactionTypeRef.current = 'content';
      const oldSelection = previousSelectionRef.current;
      const newSelection = createSelectionSnapshot(editor);
      const nextDocument = toRichTextNode(editor.getJSON());
      const pendingPagination: PendingPaginationMeasurement = {
        reason: 'document-change',
        transactionType,
        oldSelection,
        newSelection,
        maxSteps:
          transactionType === 'paste'
            ? PASTE_PAGINATION_STEP_LIMIT
            : ENTER_PAGINATION_STEP_LIMIT,
        editRevision,
      };

      lastAppliedDocumentRef.current = JSON.stringify(nextDocument);
      pendingPaginationRef.current = pendingPagination;
      logCursorDebug({
        action: 'onUpdate',
        reason: 'document-change',
        pageIndex,
        revision: editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        transactionDocChanged: transaction.docChanged,
        selectionBefore: oldSelection,
        selectionAfter: newSelection,
      });
      onChange({
        ...pendingPagination,
        pageIndex,
        document: nextDocument,
        docChanged: transaction.docChanged,
      });
      scheduleMeasureOverflow();
    },
    onSelectionUpdate: ({ editor }) => {
      previousSelectionRef.current = createSelectionSnapshot(editor);
      logCursorDebug({
        action: 'selectionUpdate',
        reason: 'tiptap-selection',
        pageIndex,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionAfter: editor.state.selection.toJSON(),
      });
      onFocus();
    },
  });

  useEffect(() => {
    pageEditorRef.current = pageEditor;
  }, [pageEditor]);

  useEffect(() => {
    registerEditor(pageIndex, pageEditor);
    return () => registerEditor(pageIndex, null);
  }, [pageEditor, pageIndex, registerEditor]);

  useEffect(() => {
    logCursorDebug({
      action: 'PageBodyEditor document prop changed',
      reason: 'document-prop',
      pageIndex,
      currentRevision: editRevisionRef.current,
      isActivePage,
      selectionBefore: pageEditor?.state.selection.toJSON(),
    });
  }, [document, isActivePage, pageEditor, pageIndex]);

  useEffect(() => {
    if (documentSyncRequest) {
      logCursorDebug({
        action: 'documentSyncRequest',
        reason: documentSyncRequest.reason,
        pageIndex,
        revision: documentSyncRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor?.state.selection.toJSON(),
      });
    }
  }, [documentSyncRequest, isActivePage, pageEditor, pageIndex]);

  useEffect(() => {
    if (focusRequest) {
      logCursorDebug({
        action: 'focusRequest',
        reason: focusRequest.reason,
        pageIndex,
        revision: focusRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor?.state.selection.toJSON(),
      });
    }
  }, [focusRequest, isActivePage, pageEditor, pageIndex]);

  useEffect(() => {
    if (paginationContinuation) {
      logCursorDebug({
        action: 'paginationContinuation',
        reason: paginationContinuation.measurement.reason,
        pageIndex,
        revision: paginationContinuation.measurement.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor?.state.selection.toJSON(),
      });
    }
  }, [isActivePage, pageEditor, pageIndex, paginationContinuation]);

  useEffect(() => {
    if (
      !pageEditor ||
      !documentSyncRequest ||
      documentSyncRequest.pageIndex !== pageIndex ||
      documentSyncRequest.revision <= appliedDocumentSyncRevisionRef.current
    ) {
      return;
    }

    if (
      isActivePage &&
      documentSyncRequest.editRevision !== undefined &&
      documentSyncRequest.editRevision !== editRevisionRef.current
    ) {
      logCursorDebug({
        action: 'setContent:blocked-stale-active-page',
        reason: documentSyncRequest.reason,
        pageIndex,
        revision: documentSyncRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor.state.selection.toJSON(),
      });
      appliedDocumentSyncRevisionRef.current = documentSyncRequest.revision;
      onDocumentSyncApplied(pageIndex, documentSyncRequest.revision);
      return;
    }

    appliedDocumentSyncRevisionRef.current = documentSyncRequest.revision;
    const nextDocument = JSON.stringify(document);
    const currentEditorDocument = JSON.stringify(
      toRichTextNode(pageEditor.getJSON())
    );
    if (currentEditorDocument === nextDocument) {
      lastAppliedDocumentRef.current = nextDocument;
      onDocumentSyncApplied(pageIndex, documentSyncRequest.revision);
      return;
    }

    lastAppliedDocumentRef.current = nextDocument;
    logEditorSetContent({
      pageIndex,
      reason: documentSyncRequest.reason,
      selectionBefore: pageEditor.state.selection.toJSON(),
    });
    logCursorDebug({
      action: 'setContent',
      reason: documentSyncRequest.reason,
      pageIndex,
      revision: documentSyncRequest.editRevision,
      currentRevision: editRevisionRef.current,
      isActivePage,
      selectionBefore: pageEditor.state.selection.toJSON(),
    });
    pageEditor.commands.setContent(document, { emitUpdate: false });
    onDocumentSyncApplied(pageIndex, documentSyncRequest.revision);
  }, [
    document,
    documentSyncRequest,
    isActivePage,
    onDocumentSyncApplied,
    pageEditor,
    pageIndex,
  ]);

  useEffect(() => {
    if (!paginationContinuation) return;
    if (DISABLE_PAGINATION_MUTATION_FOR_CURSOR_DEBUG) {
      logCursorDebug({
        action: 'paginationContinuation:mutation-disabled',
        reason: paginationContinuation.measurement.reason,
        pageIndex,
        revision: paginationContinuation.measurement.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
      });
      return;
    }
    if (
      paginationContinuation.revision <= appliedContinuationRevisionRef.current
    ) {
      return;
    }

    appliedContinuationRevisionRef.current = paginationContinuation.revision;
    pendingPaginationRef.current = {
      ...paginationContinuation.measurement,
      editRevision: editRevisionRef.current,
    };
    scheduleMeasureOverflow();
  }, [
    isActivePage,
    pageIndex,
    paginationContinuation,
    scheduleMeasureOverflow,
  ]);

  useEffect(() => {
    if (
      !pageEditor ||
      !focusRequest ||
      focusRequest.pageIndex !== pageIndex ||
      focusRequest.revision <= appliedFocusRevisionRef.current
    ) {
      return;
    }

    if (
      focusRequest.reason !== 'pagination' &&
      focusRequest.reason !== 'explicit-user-action'
    ) {
      appliedFocusRevisionRef.current = focusRequest.revision;
      return;
    }

    if (
      focusRequest.editRevision !== undefined &&
      focusRequest.editRevision !== editRevisionRef.current
    ) {
      logCursorDebug({
        action: 'focus:blocked-stale',
        reason: focusRequest.reason,
        pageIndex,
        revision: focusRequest.editRevision,
        currentRevision: editRevisionRef.current,
        isActivePage,
        selectionBefore: pageEditor.state.selection.toJSON(),
      });
      appliedFocusRevisionRef.current = focusRequest.revision;
      onFocusRequestApplied(focusRequest.revision);
      return;
    }

    appliedFocusRevisionRef.current = focusRequest.revision;
    const selectionBefore = pageEditor.state.selection.toJSON();
    pageEditor.chain().focus(focusRequest.position).run();
    logEditorFocus({
      pageIndex,
      reason: 'pagination',
      command: `focus(${focusRequest.position})`,
      selectionBefore,
      selectionAfter: pageEditor.state.selection.toJSON(),
    });
    logCursorDebug({
      action: 'focus',
      reason: focusRequest.reason,
      pageIndex,
      revision: focusRequest.editRevision,
      currentRevision: editRevisionRef.current,
      isActivePage,
      selectionBefore,
      selectionAfter: pageEditor.state.selection.toJSON(),
    });
    onFocusRequestApplied(focusRequest.revision);
  }, [
    focusRequest,
    isActivePage,
    onFocusRequestApplied,
    pageEditor,
    pageIndex,
  ]);

  useEffect(
    () => () => {
      if (measureFrameRef.current !== null) {
        window.cancelAnimationFrame(measureFrameRef.current);
      }
    },
    []
  );

  return <EditorContent editor={pageEditor} />;
}

export function DocumentTemplateEditor({
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
  const router = useRouter();
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [name, setName] = useState(template?.name ?? 'Neue Dokumentvorlage');
  const [description, setDescription] = useState(template?.description ?? '');
  const initialContent =
    template?.content ?? createDefaultDocumentTemplateContent();
  const [content, setContent] =
    useState<DocumentTemplateContent>(initialContent);
  const [fieldSearch, setFieldSearch] = useState('');
  const [fontSize, setFontSize] = useState('16');
  const [textColor, setTextColor] = useState(TEXT_COLOR_OPTIONS[0].value);
  const [spacingTop, setSpacingTop] = useState('0');
  const [spacingBottom, setSpacingBottom] = useState('16');
  const [zoom, setZoom] = useState(100);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [exportingFormat, setExportingFormat] = useState<'docx' | 'pdf' | null>(
    null
  );
  const [activeArea, setActiveArea] = useState<EditableArea>('body');
  const [leftSidebarCollapsed, setLeftSidebarCollapsed] = useState(false);
  const [rightSidebarCollapsed, setRightSidebarCollapsed] = useState(false);
  const [leftSidebarWidth, setLeftSidebarWidth] = useState(
    SIDEBAR_WIDTH.left.default
  );
  const [rightSidebarWidth, setRightSidebarWidth] = useState(
    SIDEBAR_WIDTH.right.default
  );
  const [sidebarStorageReady, setSidebarStorageReady] = useState(false);
  const [resizingSidebar, setResizingSidebar] =
    useState<SidebarResizeSide | null>(null);
  const [selectedDynamicField, setSelectedDynamicField] =
    useState<SelectedDynamicField | null>(null);
  const [contextMenuTarget, setContextMenuTarget] =
    useState<ContextMenuTarget>('editor');
  const [, setSelectionRevision] = useState(0);
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(
    null
  );
  const [pendingImageInsert, setPendingImageInsert] =
    useState<PendingImageInsert | null>(null);
  const [replaceSelectedImageAfterUpload, setReplaceSelectedImageAfterUpload] =
    useState(false);
  const [imagePropertiesDialogOpen, setImagePropertiesDialogOpen] =
    useState(false);
  const [activeBodyPageIndex, setActiveBodyPageIndex] = useState(0);
  const [bodyFocusRequest, setBodyFocusRequest] =
    useState<PageFocusRequest | null>(null);
  const [bodyDocumentSyncRequests, setBodyDocumentSyncRequests] = useState<
    Record<number, PageDocumentSyncRequest>
  >({});
  const [paginationContinuationRequest, setPaginationContinuationRequest] =
    useState<PaginationContinuationRequest | null>(null);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bodyEditorsRef = useRef<Map<number, PageBodyEditorHandle>>(new Map());
  const sidebarResizeRef = useRef<SidebarResizeState | null>(null);
  const overflowWarningShownRef = useRef(false);

  const previewFields = useMemo(() => {
    const resolvedFields = createSampleResolvedFields(fields);
    const logoField = resolvedFields.organizationLogoUrl;
    if (logoField && organizationLogoUrl) {
      return {
        ...resolvedFields,
        organizationLogoUrl: {
          ...logoField,
          rawValue: organizationLogoUrl,
          formattedValue: organizationLogoUrl,
        },
      };
    }

    return resolvedFields;
  }, [fields, organizationLogoUrl]);
  const fieldByKey = useMemo(
    () => new Map(fields.map((field) => [field.key, field])),
    [fields]
  );
  const effectiveGroupLabels = useMemo(
    () => ({
      ...groupLabels,
      event: einsatzNameSingular?.trim() || 'Einsatz',
    }),
    [einsatzNameSingular]
  );
  const headerTextBlock = useMemo(
    () => getAreaTextBlock(content.page.header.blocks, 'header'),
    [content.page.header.blocks]
  );
  const footerTextBlock = useMemo(
    () => getAreaTextBlock(content.page.footer.blocks, 'footer'),
    [content.page.footer.blocks]
  );
  const markDirty = useCallback(() => {
    setSaveStatus((current) => (current === 'saving' ? current : 'dirty'));
  }, []);
  const updateSelectedDynamicField = useCallback(
    (targetEditor: Editor | null, area: EditableArea) => {
      setSelectedDynamicField(getSelectedDynamicField(targetEditor, area));
    },
    []
  );
  const registerBodyEditor = useCallback(
    (pageIndex: number, editor: PageBodyEditorHandle) => {
      if (editor) {
        bodyEditorsRef.current.set(pageIndex, editor);
        return;
      }

      bodyEditorsRef.current.delete(pageIndex);
    },
    []
  );
  const clearBodyFocusRequest = useCallback((revision: number) => {
    setBodyFocusRequest((current) =>
      current?.revision === revision ? null : current
    );
  }, []);
  const clearBodyDocumentSyncRequest = useCallback(
    (pageIndex: number, revision: number) => {
      setBodyDocumentSyncRequests((current) => {
        const request = current[pageIndex];
        if (!request || request.revision !== revision) return current;

        const next = { ...current };
        delete next[pageIndex];
        return next;
      });
    },
    []
  );
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
            blocks: current.page.header.blocks.map((block) =>
              block.id === headerTextBlock.id
                ? { ...block, richText: nextRichText }
                : block
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
            blocks: current.page.footer.blocks.map((block) =>
              block.id === footerTextBlock.id
                ? { ...block, richText: nextRichText }
                : block
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
          blocks: content.page.header.blocks.map((block) =>
            block.id === headerTextBlock.id && headerEditor
              ? { ...block, richText: toRichTextNode(headerEditor.getJSON()) }
              : block
          ),
        },
        footer: {
          ...content.page.footer,
          blocks: content.page.footer.blocks.map((block) =>
            block.id === footerTextBlock.id && footerEditor
              ? { ...block, richText: toRichTextNode(footerEditor.getJSON()) }
              : block
          ),
        },
      },
    };
  }

  function handleBodyPageChange(change: PageBodyChange) {
    if (!change.docChanged) return;

    markDirty();
    logCursorDebug({
      action: 'handleBodyPageChange',
      reason: change.reason,
      pageIndex: change.pageIndex,
      revision: change.editRevision,
      transactionDocChanged: change.docChanged,
      selectionBefore: change.oldSelection,
      selectionAfter: change.newSelection,
    });

    if (DISABLE_PARENT_MERGE_FOR_CURSOR_DEBUG) {
      logCursorDebug({
        action: 'handleBodyPageChange:parent-merge-disabled',
        reason: change.reason,
        pageIndex: change.pageIndex,
        revision: change.editRevision,
        transactionDocChanged: change.docChanged,
        selectionBefore: change.oldSelection,
        selectionAfter: change.newSelection,
      });
      return;
    }

    setContent((current) => {
      const pages = splitDocumentIntoPages(current.document);
      while (pages.length <= change.pageIndex) {
        pages.push(createEmptyRichTextDocument());
      }

      pages[change.pageIndex] = change.document;
      logCursorDebug({
        action: 'mergePageDocuments',
        reason: change.reason,
        pageIndex: change.pageIndex,
        revision: change.editRevision,
        transactionDocChanged: change.docChanged,
        selectionBefore: change.oldSelection,
        selectionAfter: change.newSelection,
      });

      return {
        ...current,
        document: mergePageDocuments(pages),
      };
    });
  }

  function handleBodyPageFocus(pageIndex: number, pageEditor: Editor | null) {
    setActiveArea('body');
    logCursorDebug({
      action: 'setActiveBodyPageIndex',
      reason: 'body-focus',
      pageIndex,
      isActivePage: activeBodyPageIndex === pageIndex,
      selectionBefore: pageEditor?.state.selection.toJSON(),
    });
    setActiveBodyPageIndex(pageIndex);
    setSelectionRevision((current) => current + 1);
    updateSelectedDynamicField(pageEditor, 'body');
  }

  function handleBodyOverflowMeasurement(measurement: PageOverflowMeasurement) {
    logCursorDebug({
      action: 'handleBodyOverflow',
      reason: measurement.reason,
      transactionType: measurement.transactionType,
      pageIndex: measurement.pageIndex,
      revision: measurement.editRevision,
      hasOverflow: measurement.overflowDetected,
      overflowNodeIndex: measurement.overflowNodeIndex,
      scrollHeight: measurement.scrollHeight,
      clientHeight: measurement.clientHeight,
      bodyAreaHeightPx: measurement.bodyAreaHeightPx,
      measuredAt: measurement.measuredAt,
      selectionBefore: measurement.oldSelection,
      selectionAfter: measurement.newSelection,
    });
    if (!measurement.overflowDetected) {
      logCursorDebug({
        action: 'handleBodyOverflow:no-overflow',
        reason: measurement.reason,
        transactionType: measurement.transactionType,
        pageIndex: measurement.pageIndex,
        revision: measurement.editRevision,
        hasOverflow: false,
        overflowNodeIndex: measurement.overflowNodeIndex,
        scrollHeight: measurement.scrollHeight,
        clientHeight: measurement.clientHeight,
        bodyAreaHeightPx: measurement.bodyAreaHeightPx,
        measuredAt: measurement.measuredAt,
        selectionBefore: measurement.oldSelection,
        selectionAfter: measurement.newSelection,
      });
      return;
    }

    if (DISABLE_PAGINATION_MUTATION_FOR_CURSOR_DEBUG) {
      logCursorDebug({
        action: 'handleBodyOverflow:mutation-disabled',
        reason: measurement.reason,
        transactionType: measurement.transactionType,
        pageIndex: measurement.pageIndex,
        revision: measurement.editRevision,
        hasOverflow: measurement.overflowDetected,
        overflowNodeIndex: measurement.overflowNodeIndex,
        scrollHeight: measurement.scrollHeight,
        clientHeight: measurement.clientHeight,
        bodyAreaHeightPx: measurement.bodyAreaHeightPx,
        measuredAt: measurement.measuredAt,
        selectionBefore: measurement.oldSelection,
        selectionAfter: measurement.newSelection,
      });
      return;
    }

    setPaginationContinuationRequest(null);

    let nextFocusPageIndex: number | null = null;
    let nextContinuationRequest: PaginationContinuationRequest | null = null;
    let didPaginate = false;
    setContent((current) => {
      const pageNodes = documentPageNodes(current.document);
      const beforePageCount = pageNodes.length;
      const sourceNodes = pageNodes[measurement.pageIndex] ?? [];

      if (
        measurement.overflowNodeIndex <= 0 &&
        sourceNodes.length <= 1 &&
        !overflowWarningShownRef.current
      ) {
        overflowWarningShownRef.current = true;
        toast.info('Dieser Inhalt ist zu groß für eine Seite.');
        return current;
      }

      if (
        measurement.overflowNodeIndex < 0 ||
        measurement.overflowNodeIndex >= sourceNodes.length
      ) {
        return current;
      }

      const nextPageIndex = measurement.pageIndex + 1;
      while (pageNodes.length <= nextPageIndex) {
        pageNodes.push([]);
      }

      const movedNodes = sourceNodes.slice(measurement.overflowNodeIndex);
      if (movedNodes.length === 0) return current;

      const keptNodes = sourceNodes.slice(0, measurement.overflowNodeIndex);
      const nextNodes = pageNodes[nextPageIndex] ?? [];
      const normalizedNextNodes =
        nextNodes.length === 1 && isEmptyParagraphNode(nextNodes[0])
          ? []
          : nextNodes;

      pageNodes[measurement.pageIndex] =
        keptNodes.length > 0
          ? keptNodes
          : (createEmptyRichTextDocument().content ?? []);
      pageNodes[nextPageIndex] = [...movedNodes, ...normalizedNextNodes];
      didPaginate = true;
      overflowWarningShownRef.current = false;
      const cursorWasMoved =
        measurement.newSelection.nodeIndex >= measurement.overflowNodeIndex;
      const afterPageCount = pageNodes.length;

      if (cursorWasMoved) {
        nextFocusPageIndex = nextPageIndex;
      }

      if (measurement.transactionType === 'paste' && measurement.maxSteps > 1) {
        nextContinuationRequest = {
          pageIndex: nextPageIndex,
          revision: Date.now(),
          measurement: {
            reason: 'paste-continuation',
            transactionType: 'paste',
            oldSelection: measurement.oldSelection,
            newSelection: measurement.newSelection,
            maxSteps: measurement.maxSteps - 1,
            editRevision: measurement.editRevision,
          },
        };
      } else if (
        measurement.transactionType === 'paste' &&
        measurement.maxSteps <= 1
      ) {
        toast.info(
          'Die automatische Seitenaufteilung wurde begrenzt. Prüfen Sie den eingefügten Inhalt.'
        );
      }

      logPaginationMutation({
        reason: measurement.reason,
        transactionType: measurement.transactionType,
        pageIndex: measurement.pageIndex,
        beforePageCount,
        afterPageCount,
        overflowDetected: measurement.overflowDetected,
        overflowNodeIndex: measurement.overflowNodeIndex,
        movedNodeCount: movedNodes.length,
        cursorWasMoved,
        oldSelection: measurement.oldSelection,
        newSelection: measurement.newSelection,
      });

      return {
        ...current,
        document: mergePageDocuments(
          pageNodes.map(createRichTextDocumentFromNodes)
        ),
      };
    });

    if (!didPaginate) return;

    if (nextFocusPageIndex !== null) {
      logCursorDebug({
        action: 'setActiveBodyPageIndex',
        reason: 'pagination',
        pageIndex: nextFocusPageIndex,
        revision: measurement.editRevision,
        hasOverflow: true,
      });
      setActiveBodyPageIndex(nextFocusPageIndex);
      logCursorDebug({
        action: 'focusRequest:set',
        reason: 'pagination',
        transactionType: measurement.transactionType,
        pageIndex: nextFocusPageIndex,
        revision: measurement.editRevision,
        hasOverflow: true,
        overflowNodeIndex: measurement.overflowNodeIndex,
        selectionBefore: measurement.oldSelection,
        selectionAfter: measurement.newSelection,
      });
      setBodyFocusRequest({
        pageIndex: nextFocusPageIndex,
        revision: Date.now(),
        reason: 'pagination',
        editRevision: measurement.editRevision,
        position: 'start',
      });
    }

    const syncRevision = Date.now();
    logCursorDebug({
      action: 'documentSyncRequest:set',
      reason: 'pagination',
      transactionType: measurement.transactionType,
      pageIndex: measurement.pageIndex,
      revision: measurement.editRevision,
      hasOverflow: true,
      overflowNodeIndex: measurement.overflowNodeIndex,
      selectionBefore: measurement.oldSelection,
      selectionAfter: measurement.newSelection,
    });
    setBodyDocumentSyncRequests((current) => ({
      ...current,
      [measurement.pageIndex]: {
        pageIndex: measurement.pageIndex,
        revision: syncRevision,
        reason: 'pagination',
        editRevision: measurement.editRevision,
      },
      [measurement.pageIndex + 1]: {
        pageIndex: measurement.pageIndex + 1,
        revision: syncRevision,
        reason: 'pagination',
      },
    }));

    if (nextContinuationRequest) {
      setPaginationContinuationRequest(nextContinuationRequest);
    }
  }

  function updateCurrentBlockSpacing(
    attribute: 'spacingTop' | 'spacingBottom',
    value: string
  ) {
    const numericValue = Number(value);
    const nextValue = Number.isFinite(numericValue) ? numericValue : 0;

    activeEditor
      ?.chain()
      .focus()
      .updateAttributes('paragraph', { [attribute]: nextValue })
      .updateAttributes('heading', { [attribute]: nextValue })
      .updateAttributes('infoBox', { [attribute]: nextValue })
      .run();
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

  function pageZoomStyle() {
    return {
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'top center',
    };
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
    activeEditor
      ?.chain()
      .focus()
      .setMark('textStyle', { fontSize: `${value}px` })
      .run();
  }

  function applyTextColor(value: string) {
    setTextColor(value);
    activeEditor?.chain().focus().setMark('textStyle', { color: value }).run();
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
    if (kind === 'header' || kind === 'footer') {
      insertBlock(kind);
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

  function addManualPage() {
    const nextPageIndex = splitDocumentIntoPages(content.document).length;
    markDirty();
    setActiveArea('body');
    setContent((current) => {
      const pages = splitDocumentIntoPages(current.document);
      pages.push(createEmptyRichTextDocument());

      return {
        ...current,
        document: mergePageDocuments(pages),
      };
    });
    logCursorDebug({
      action: 'setActiveBodyPageIndex',
      reason: 'explicit-user-action',
      pageIndex: nextPageIndex,
    });
    setActiveBodyPageIndex(nextPageIndex);
    setBodyFocusRequest({
      pageIndex: nextPageIndex,
      revision: Date.now(),
      reason: 'explicit-user-action',
      position: 'start',
    });
    toast.success('Neue Seite wurde hinzugefügt.');
  }

  async function handleSave() {
    setIsSaving(true);
    setSaveStatus('saving');
    try {
      const saved = template
        ? await updateDocumentTemplate({
            id: template.id,
            name,
            description,
            content: currentContent(),
          })
        : await createDocumentTemplate({
            organizationId,
            name,
            description,
            content: currentContent(),
          });

      toast.success('Dokumentvorlage wurde gespeichert.');
      setSaveStatus('saved');
      router.push(
        `/settings/org/${organizationId}/document-templates/${saved.id}/edit`
      );
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Die Dokumentvorlage konnte nicht gespeichert werden.'
      );
      setSaveStatus('dirty');
    } finally {
      setIsSaving(false);
    }
  }

  async function handleExport(format: 'docx' | 'pdf') {
    try {
      setExportingFormat(format);
      const result = await exportDocumentTemplatePreview({
        organizationId,
        name,
        content: currentContent(),
        format,
      });

      if (!result.success || !result.data) {
        toast.error(
          result.error ?? 'Das Dokument konnte nicht erzeugt werden.'
        );
        return;
      }

      downloadBase64File(
        result.data.file,
        result.data.mimeType,
        result.data.filename
      );
      toast.success(
        format === 'docx' ? 'Word-Dokument erzeugt' : 'PDF erzeugt'
      );
    } finally {
      setExportingFormat(null);
    }
  }

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 's') {
        event.preventDefault();
        void handleSave();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

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
  const selectedImageMode =
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
        <Dialog
          open={imagePropertiesDialogOpen && hasSelectedImage}
          onOpenChange={setImagePropertiesDialogOpen}
        >
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Bild bearbeiten</DialogTitle>
              <DialogDescription>
                Bearbeiten Sie Alternativtext, Positionierung und Größe des
                ausgewählten Bildes.
              </DialogDescription>
            </DialogHeader>
            <DocumentTemplateImagePropertiesPopover
              values={selectedImageProperties}
              onApply={applySelectedImageProperties}
              onCancel={() => setImagePropertiesDialogOpen(false)}
              onReplace={replaceSelectedImage}
              onDelete={deleteSelectedImage}
            />
          </DialogContent>
        </Dialog>
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
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" disabled={exportingFormat !== null}>
                    <Download data-icon="inline-start" />
                    Exportieren
                    <ChevronDown data-icon="inline-end" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={() => void handleExport('docx')}>
                    <FileText data-icon="inline-start" />
                    Word-Dokument
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => void handleExport('pdf')}>
                    <Download data-icon="inline-start" />
                    PDF
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button onClick={() => void handleSave()} disabled={isSaving}>
                <Save data-icon="inline-start" />
                Speichern
              </Button>
            </div>
          </div>
        </header>

        {mode === 'edit' ? (
          <div className="bg-background border-b px-4 py-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <Button
                size="sm"
                variant={activeEditor?.isActive('bold') ? 'secondary' : 'ghost'}
                onClick={() => activeEditor?.chain().focus().toggleBold().run()}
                aria-label="Fett"
              >
                <Bold />
              </Button>
              <Button
                size="sm"
                variant={
                  activeEditor?.isActive('italic') ? 'secondary' : 'ghost'
                }
                onClick={() =>
                  activeEditor?.chain().focus().toggleItalic().run()
                }
                aria-label="Kursiv"
              >
                <Italic />
              </Button>
              <Button
                size="sm"
                variant={
                  activeEditor?.isActive('underline') ? 'secondary' : 'ghost'
                }
                onClick={() =>
                  activeEditor?.chain().focus().toggleUnderline().run()
                }
                aria-label="Unterstrichen"
              >
                <UnderlineIcon />
              </Button>
              <Separator orientation="vertical" className="h-6" />
              <Select
                value={
                  activeEditor?.isActive('heading', { level: 1 })
                    ? 'heading1'
                    : activeEditor?.isActive('heading', { level: 2 })
                      ? 'heading2'
                      : 'paragraph'
                }
                onValueChange={(value) => {
                  if (value === 'heading1') {
                    activeEditor
                      ?.chain()
                      .focus()
                      .setHeading({ level: 1 })
                      .run();
                    return;
                  }

                  if (value === 'heading2') {
                    activeEditor
                      ?.chain()
                      .focus()
                      .setHeading({ level: 2 })
                      .run();
                    return;
                  }

                  activeEditor?.chain().focus().setParagraph().run();
                }}
              >
                <SelectTrigger className="h-8 w-[170px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="paragraph">Normaler Text</SelectItem>
                  <SelectItem value="heading1">Überschrift 1</SelectItem>
                  <SelectItem value="heading2">Überschrift 2</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="number"
                min={10}
                max={36}
                value={fontSize}
                onChange={(event) => applyFontSize(event.target.value)}
                className="h-8 w-20"
                aria-label="Schriftgröße ändern"
              />
              <Separator orientation="vertical" className="h-6" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ausrichtung ändern"
                  >
                    <AlignLeft />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().setTextAlign('left').run()
                    }
                  >
                    <AlignLeft data-icon="inline-start" />
                    Linksbündig
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().setTextAlign('center').run()
                    }
                  >
                    <AlignCenter data-icon="inline-start" />
                    Zentriert
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().setTextAlign('right').run()
                    }
                  >
                    <AlignRight data-icon="inline-start" />
                    Rechtsbündig
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" aria-label="Liste einfügen">
                    <List />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().toggleBulletList().run()
                    }
                  >
                    <List data-icon="inline-start" />
                    Aufzählung
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={() =>
                      activeEditor?.chain().focus().toggleOrderedList().run()
                    }
                  >
                    <ListOrdered data-icon="inline-start" />
                    Nummerierte Liste
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Textfarbe ändern"
                  >
                    <span
                      className="size-3 rounded-full border"
                      style={{ backgroundColor: textColor }}
                    />
                    Farbe
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {TEXT_COLOR_OPTIONS.map((color) => (
                    <DropdownMenuItem
                      key={color.value}
                      onClick={() => applyTextColor(color.value)}
                    >
                      <span
                        className="size-3 rounded-full border"
                        style={{ backgroundColor: color.value }}
                      />
                      {color.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator orientation="vertical" className="h-6" />
              <Input
                type="number"
                min={0}
                max={96}
                value={spacingTop}
                onChange={(event) =>
                  setBlockSpacing('spacingTop')(event.target.value)
                }
                className="h-8 w-20"
                aria-label="Abstand oben"
              />
              <Input
                type="number"
                min={0}
                max={96}
                value={spacingBottom}
                onChange={(event) =>
                  setBlockSpacing('spacingBottom')(event.target.value)
                }
                className="h-8 w-20"
                aria-label="Abstand unten"
              />
              <Separator orientation="vertical" className="h-6" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Weitere Aktionen"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  <DropdownMenuItem onClick={() => moveCurrentBlock('up')}>
                    <ArrowUp data-icon="inline-start" />
                    Nach oben
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => moveCurrentBlock('down')}>
                    <ArrowDown data-icon="inline-start" />
                    Nach unten
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={duplicateCurrentBlock}>
                    <Copy data-icon="inline-start" />
                    Duplizieren
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={deleteCurrentBlock}>
                    <Trash2 data-icon="inline-start" />
                    Löschen
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Separator orientation="vertical" className="h-6" />
              {hasSelectedImage ? (
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={openSelectedImageProperties}
                >
                  <ImageIcon data-icon="inline-start" />
                  Bild bearbeiten
                </Button>
              ) : null}
              {activeArea === 'header' || activeArea === 'footer' ? (
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <MoreHorizontal data-icon="inline-start" />
                      Bereich
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-medium">
                        {activeArea === 'header' ? 'Kopfbereich' : 'Fußbereich'}
                      </p>
                      <div className="grid grid-cols-[1fr_110px] gap-2">
                        <div className="flex flex-col gap-1.5">
                          <Label>Anzeige</Label>
                          <Select
                            value={
                              activeArea === 'header'
                                ? content.page.header.showOn
                                : content.page.footer.showOn
                            }
                            onValueChange={(value) => {
                              if (
                                value !== 'firstPage' &&
                                value !== 'allPages'
                              ) {
                                return;
                              }

                              updatePageSettings((page) =>
                                activeArea === 'header'
                                  ? {
                                      ...page,
                                      header: {
                                        ...page.header,
                                        showOn: value,
                                      },
                                    }
                                  : {
                                      ...page,
                                      footer: {
                                        ...page.footer,
                                        showOn: value,
                                      },
                                    }
                              );
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="firstPage">
                                Erste Seite
                              </SelectItem>
                              <SelectItem value="allPages">
                                Alle Seiten
                              </SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label>Höhe</Label>
                          <Input
                            type="number"
                            min={12}
                            max={80}
                            value={
                              activeArea === 'header'
                                ? content.page.header.height
                                : content.page.footer.height
                            }
                            onChange={(event) => {
                              const height = Number(event.target.value);
                              updatePageSettings((page) =>
                                activeArea === 'header'
                                  ? {
                                      ...page,
                                      header: { ...page.header, height },
                                    }
                                  : {
                                      ...page,
                                      footer: { ...page.footer, height },
                                    }
                              );
                            }}
                          />
                        </div>
                      </div>
                      {activeArea === 'footer' ? (
                        <div className="flex items-center justify-between gap-3">
                          <Label>Seitenzahl anzeigen</Label>
                          <Switch
                            checked={footerTextBlock.showPageNumber ?? false}
                            onCheckedChange={(checked) =>
                              updateFooterBlock(
                                footerTextBlock.id,
                                (currentBlock) => ({
                                  ...currentBlock,
                                  showPageNumber: checked,
                                })
                              )
                            }
                          />
                        </div>
                      ) : null}
                      <div className="flex items-center justify-between gap-3">
                        <Label>Trennlinie anzeigen</Label>
                        <Switch
                          checked={
                            activeArea === 'header'
                              ? (headerTextBlock.showDivider ?? false)
                              : (footerTextBlock.showDivider ?? false)
                          }
                          onCheckedChange={(checked) =>
                            activeArea === 'header'
                              ? updateHeaderBlock(
                                  headerTextBlock.id,
                                  (currentBlock) => ({
                                    ...currentBlock,
                                    showDivider: checked,
                                  })
                                )
                              : updateFooterBlock(
                                  footerTextBlock.id,
                                  (currentBlock) => ({
                                    ...currentBlock,
                                    showDivider: checked,
                                  })
                                )
                          }
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
              ) : null}
              <Dialog>
                <DialogTrigger asChild>
                  <Button size="sm" variant="outline">
                    <PanelTop data-icon="inline-start" />
                    Seiteneinstellungen
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-160">
                  <DialogHeader>
                    <DialogTitle>Seiteneinstellungen</DialogTitle>
                    <DialogDescription>
                      Papierformat, Seitenränder und feste Bereiche der Vorlage.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="flex flex-col gap-4">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="flex flex-col gap-1.5">
                        <Label>Papierformat</Label>
                        <Input value="A4" disabled />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Ausrichtung</Label>
                        <Input value="Hochformat" disabled />
                      </div>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <div className="flex flex-col gap-1.5">
                        <Label>Oben</Label>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={content.page.margins.top}
                          onChange={(event) =>
                            updatePageSettings((page) => ({
                              ...page,
                              margins: {
                                ...page.margins,
                                top: Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Rechts</Label>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={content.page.margins.right}
                          onChange={(event) =>
                            updatePageSettings((page) => ({
                              ...page,
                              margins: {
                                ...page.margins,
                                right: Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Unten</Label>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={content.page.margins.bottom}
                          onChange={(event) =>
                            updatePageSettings((page) => ({
                              ...page,
                              margins: {
                                ...page.margins,
                                bottom: Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Links</Label>
                        <Input
                          type="number"
                          min={0}
                          max={60}
                          value={content.page.margins.left}
                          onChange={(event) =>
                            updatePageSettings((page) => ({
                              ...page,
                              margins: {
                                ...page.margins,
                                left: Number(event.target.value),
                              },
                            }))
                          }
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="flex flex-col gap-3 rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Label>Kopfbereich anzeigen</Label>
                          <Switch
                            checked={content.page.header.enabled}
                            onCheckedChange={(checked) =>
                              updatePageSettings((page) => ({
                                ...page,
                                header: { ...page.header, enabled: checked },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label>Header-Höhe</Label>
                          <Input
                            type="number"
                            min={12}
                            max={80}
                            value={content.page.header.height}
                            onChange={(event) =>
                              updatePageSettings((page) => ({
                                ...page,
                                header: {
                                  ...page.header,
                                  height: Number(event.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-3 rounded-md border p-3">
                        <div className="flex items-center justify-between gap-3">
                          <Label>Fußbereich anzeigen</Label>
                          <Switch
                            checked={content.page.footer.enabled}
                            onCheckedChange={(checked) =>
                              updatePageSettings((page) => ({
                                ...page,
                                footer: { ...page.footer, enabled: checked },
                              }))
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label>Footer-Höhe</Label>
                          <Input
                            type="number"
                            min={12}
                            max={80}
                            value={content.page.footer.height}
                            onChange={(event) =>
                              updatePageSettings((page) => ({
                                ...page,
                                footer: {
                                  ...page.footer,
                                  height: Number(event.target.value),
                                },
                              }))
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
              <Separator orientation="vertical" className="h-6" />
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoom((current) => Math.max(50, current - 10))}
                aria-label="Verkleinern"
              >
                <Minus />
              </Button>
              <span className="text-muted-foreground min-w-14 text-center text-sm">
                {zoom} %
              </span>
              <Button
                size="sm"
                variant="ghost"
                onClick={() =>
                  setZoom((current) => Math.min(150, current + 10))
                }
                aria-label="Vergrößern"
              >
                <Plus />
              </Button>
              <Button size="sm" variant="outline" onClick={() => setZoom(100)}>
                Seitenbreite
              </Button>
            </div>
          </div>
        ) : null}

        <div
          className="grid min-h-0 flex-1 gap-4 p-4"
          style={{ gridTemplateColumns: editorGridColumns }}
        >
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
                {documentTemplateBlockGroups.map((group) => (
                  <div key={group.label} className="flex flex-col gap-2">
                    <p className="text-muted-foreground text-xs font-medium">
                      {group.label}
                    </p>
                    <div className="grid gap-2">
                      {group.items.map(({ id, label, description, Icon }) => (
                        <Tooltip key={id}>
                          <TooltipTrigger asChild>
                            <Button
                              variant="outline"
                              className="h-auto justify-start gap-3 px-3 py-3 text-left"
                              draggable
                              onDragStart={(event) => {
                                event.dataTransfer.effectAllowed = 'copy';
                                event.dataTransfer.setData(
                                  DOCUMENT_BLOCK_DRAG_MIME,
                                  id
                                );
                              }}
                              onClick={() => insertBlock(id)}
                            >
                              <Icon data-icon="inline-start" />
                              <span className="flex min-w-0 flex-col items-start gap-0.5">
                                <span className="truncate font-medium">
                                  {label}
                                </span>
                                <span className="text-muted-foreground line-clamp-2 text-xs font-normal whitespace-normal">
                                  {description}
                                </span>
                              </span>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="right">
                            {description}
                          </TooltipContent>
                        </Tooltip>
                      ))}
                    </div>
                  </div>
                ))}
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

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <main
                className="min-h-0 overflow-auto rounded-md bg-[#e3e6ea]"
                onContextMenu={handleEditorContextMenu}
              >
                <div className="flex min-h-full justify-center px-6 py-8">
                  {mode === 'preview' ? (
                    <div style={pageZoomStyle()}>
                      <DocumentTemplatePreview
                        content={currentContent()}
                        fields={previewFields}
                      />
                    </div>
                  ) : (
                    <div className="document-template-page-stack flex flex-col gap-8">
                      {pageIndexes.map((pageIndex) => (
                        <div
                          key={pageIndex}
                          className={`document-template-page bg-background relative grid shrink-0 overflow-hidden shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5 ${
                            pageIndex === 0 ? 'z-10' : 'z-0'
                          }`}
                          style={{
                            width: A4_EDITOR_WIDTH_PX,
                            height: A4_EDITOR_HEIGHT_PX,
                            paddingTop: pagePaddingTopPx,
                            paddingRight: pagePaddingRightPx,
                            paddingBottom: pagePaddingBottomPx,
                            paddingLeft: pagePaddingLeftPx,
                            gridTemplateRows: `${headerHeightPx}px ${bodyAreaHeightPx}px ${footerHeightPx}px`,
                            ...pageZoomStyle(),
                          }}
                        >
                          <span className="text-muted-foreground absolute -top-6 left-0 text-xs font-medium">
                            Seite {pageIndex + 1}
                          </span>
                          {content.page.header.enabled ? (
                            <div
                              className="bg-muted/20 outline-border relative box-border flex min-w-0 flex-col justify-center overflow-hidden outline outline-1 outline-dashed"
                              onClick={() => setActiveArea('header')}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) =>
                                handleFieldDrop(event, 'header')
                              }
                            >
                              <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
                                Kopfbereich
                              </span>
                              <div className="min-w-0 px-2 pt-4">
                                {pageIndex === 0 ? (
                                  <EditorContent editor={headerEditor} />
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    Kopfbereich wie Seite 1
                                  </span>
                                )}
                              </div>
                              {content.page.header.blocks.some(
                                (block) => block.showDivider
                              ) ? (
                                <Separator className="absolute right-0 bottom-0 left-0" />
                              ) : null}
                            </div>
                          ) : (
                            <div />
                          )}

                          <div
                            className="outline-border relative box-border min-w-0 overflow-hidden outline outline-1 outline-dashed"
                            onClick={() => setActiveArea('body')}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleFieldDrop(event, 'body')}
                          >
                            <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
                              Dokumentinhalt
                            </span>
                            <div className="document-template-body-measure min-w-0 pt-5">
                              <PageBodyEditor
                                pageIndex={pageIndex}
                                document={
                                  bodyPageDocuments[pageIndex] ??
                                  createEmptyRichTextDocument()
                                }
                                bodyAreaHeightPx={bodyAreaHeightPx}
                                isActivePage={activeBodyPageIndex === pageIndex}
                                focusRequest={
                                  activeBodyPageIndex === pageIndex
                                    ? bodyFocusRequest
                                    : null
                                }
                                documentSyncRequest={
                                  bodyDocumentSyncRequests[pageIndex] ?? null
                                }
                                paginationContinuation={
                                  paginationContinuationRequest?.pageIndex ===
                                  pageIndex
                                    ? paginationContinuationRequest
                                    : null
                                }
                                registerEditor={registerBodyEditor}
                                onChange={handleBodyPageChange}
                                onFocus={() =>
                                  handleBodyPageFocus(
                                    pageIndex,
                                    bodyEditorsRef.current.get(pageIndex) ??
                                      null
                                  )
                                }
                                onDocumentSyncApplied={
                                  clearBodyDocumentSyncRequest
                                }
                                onFocusRequestApplied={clearBodyFocusRequest}
                                onOverflowMeasured={
                                  handleBodyOverflowMeasurement
                                }
                              />
                            </div>
                          </div>

                          {content.page.footer.enabled ? (
                            <div
                              className="bg-muted/20 outline-border relative box-border flex min-w-0 flex-col justify-center overflow-hidden outline outline-1 outline-dashed"
                              onClick={() => setActiveArea('footer')}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) =>
                                handleFieldDrop(event, 'footer')
                              }
                            >
                              <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
                                Fußbereich
                              </span>
                              <div className="min-w-0 px-2 pt-4">
                                {pageIndex === 0 ? (
                                  <EditorContent editor={footerEditor} />
                                ) : (
                                  <span className="text-muted-foreground text-xs">
                                    Seite {pageIndex + 1}
                                  </span>
                                )}
                              </div>
                            </div>
                          ) : (
                            <div />
                          )}
                        </div>
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
                  onSetAlign={(align) =>
                    updateSelectedImageAttribute({ align })
                  }
                  onDelete={deleteSelectedImage}
                />
              ) : contextMenuTarget === 'dynamicField' &&
                selectedDynamicField ? (
                <>
                  <ContextMenuItem
                    onClick={showSelectedDynamicFieldInformation}
                  >
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
                          activeEditor
                            ?.chain()
                            .focus()
                            .setTextAlign('left')
                            .run()
                        }
                      >
                        Links
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() =>
                          activeEditor
                            ?.chain()
                            .focus()
                            .setTextAlign('center')
                            .run()
                        }
                      >
                        Mitte
                      </ContextMenuItem>
                      <ContextMenuItem
                        onClick={() =>
                          activeEditor
                            ?.chain()
                            .focus()
                            .setTextAlign('right')
                            .run()
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

          {rightSidebarCollapsed ? (
            <div className="bg-background flex min-h-0 flex-col items-center overflow-hidden rounded-md border-0 py-2 shadow-sm">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                aria-label="Dynamische Felder einblenden"
                className="size-8 rounded-md"
                onClick={() => setRightSidebarCollapsed(false)}
              >
                <PanelRightOpen />
              </Button>
            </div>
          ) : (
            <Card className="relative min-h-0 border-0 shadow-sm">
              <Tooltip>
                <TooltipTrigger asChild>
                  <div
                    role="separator"
                    aria-orientation="vertical"
                    aria-label="Breite der rechten Seitenleiste ändern"
                    className="group absolute top-0 left-[-10px] z-20 flex h-full w-4 cursor-col-resize items-center justify-center"
                    onPointerDown={(event) =>
                      startSidebarResize('right', event)
                    }
                  >
                    <span className="bg-border group-hover:bg-ring h-12 w-1 rounded-full transition-colors" />
                  </div>
                </TooltipTrigger>
                <TooltipContent side="left">
                  Breite der rechten Seitenleiste ändern
                </TooltipContent>
              </Tooltip>
              <CardHeader className="flex flex-row items-start justify-between gap-2">
                <div>
                  <CardTitle>Dynamische Felder</CardTitle>
                  <CardDescription>
                    Klicken oder ziehen Sie ein Feld an die gewünschte Position.
                  </CardDescription>
                </div>
                <Button
                  type="button"
                  size="icon"
                  variant="ghost"
                  aria-label="Dynamische Felder ausblenden"
                  onClick={() => setRightSidebarCollapsed(true)}
                >
                  <PanelRightClose />
                </Button>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-col overflow-auto">
                <DocumentTemplateFieldLibrary
                  fields={fields}
                  groupLabels={effectiveGroupLabels}
                  query={fieldSearch}
                  onQueryChange={setFieldSearch}
                  onInsert={insertField}
                />
              </CardContent>
            </Card>
          )}
        </div>

        <DocumentTemplateEditorStyles />
      </div>
    </TooltipProvider>
  );
}
