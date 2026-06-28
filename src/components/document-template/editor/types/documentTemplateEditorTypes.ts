import type { Editor } from '@tiptap/react';
import type { DocumentTemplateRichTextNode } from '@/features/document-template/types';

export type EditableArea = 'header' | 'body' | 'footer';
export type SaveStatus = 'dirty' | 'saving' | 'saved';
export type SidebarResizeSide = 'left' | 'right';
export type ContextMenuTarget = 'editor' | 'dynamicField' | 'image';
export type SelectedDynamicField = {
  area: EditableArea;
  fieldKey: string;
  label: string;
};
export type SidebarResizeState = {
  side: SidebarResizeSide;
  startX: number;
  startWidth: number;
};
export type PendingImageInsert = {
  targetArea: EditableArea;
  position: number | null;
};
export type PageBodyEditorHandle = Editor | null;
export type PaginationTransactionType = 'enter' | 'paste' | 'content';
export type PageBodySelectionSnapshot = {
  from: number;
  to: number;
  nodeIndex: number;
};
export type PendingPaginationMeasurement = {
  reason: 'document-change' | 'paste-continuation';
  transactionType: PaginationTransactionType;
  oldSelection: PageBodySelectionSnapshot;
  newSelection: PageBodySelectionSnapshot;
  maxSteps: number;
  editRevision: number;
};
export type PageBodyChange = PendingPaginationMeasurement & {
  pageIndex: number;
  document: DocumentTemplateRichTextNode;
  docChanged: boolean;
};
export type PageOverflowMeasurement = PendingPaginationMeasurement & {
  pageIndex: number;
  overflowDetected: boolean;
  overflowNodeIndex: number;
  scrollHeight: number;
  clientHeight: number;
  bodyAreaHeightPx: number;
  measuredAt: number;
};
export type PageFocusRequest = {
  pageIndex: number;
  revision: number;
  reason: 'pagination' | 'explicit-user-action';
  editRevision?: number;
  position: 'start' | 'end';
};
export type PageDocumentSyncRequest = {
  pageIndex: number;
  revision: number;
  reason: 'pagination' | 'explicit-user-action';
  editRevision?: number;
};
export type PaginationContinuationRequest = {
  pageIndex: number;
  revision: number;
  measurement: PendingPaginationMeasurement;
};
export type PaginationDebugPayload = {
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
