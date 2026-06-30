import { useRef, useState } from 'react';
import type {
  DocumentTemplateContent,
  DocumentTemplateRecord,
} from '@/features/document-template/types';
import { createDefaultDocumentTemplateContent } from '@/features/document-template/lib/document-template-defaults';
import type {
  ContextMenuTarget,
  EditableArea,
  PendingImageInsert,
  SelectedDynamicField,
  SidebarResizeSide,
  SidebarResizeState,
} from '../types/documentTemplateEditorTypes';
import {
  FONT_FAMILY_OPTIONS,
  LINE_HEIGHT_OPTIONS,
  TEXT_COLOR_OPTIONS,
} from '../utils/documentTemplateEditorConstants';
import { SIDEBAR_WIDTH } from '../utils/documentTemplateLayoutUtils';

export function useDocumentTemplateEditorState(
  template?: DocumentTemplateRecord | null
) {
  const [mode, setMode] = useState<'edit' | 'preview'>('edit');
  const [name, setName] = useState(template?.name ?? 'Neue Dokumentvorlage');
  const [description, setDescription] = useState(template?.description ?? '');
  const initialContent =
    template?.content ?? createDefaultDocumentTemplateContent();
  const [content, setContent] =
    useState<DocumentTemplateContent>(initialContent);
  const [fieldSearch, setFieldSearch] = useState('');
  const [blockSearch, setBlockSearch] = useState('');
  const [fontSize, setFontSize] = useState('16');
  const [fontFamily, setFontFamily] = useState(FONT_FAMILY_OPTIONS[0].value);
  const [textColor, setTextColor] = useState(TEXT_COLOR_OPTIONS[0].value);
  const [lineHeight, setLineHeight] = useState(LINE_HEIGHT_OPTIONS[2].value);
  const [spacingTop, setSpacingTop] = useState('0');
  const [spacingBottom, setSpacingBottom] = useState('16');
  const [zoom, setZoom] = useState(100);
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
  const [selectionRevision, setSelectionRevision] = useState(0);
  const [organizationLogoUrl, setOrganizationLogoUrl] = useState<string | null>(
    null
  );
  const [pendingImageInsert, setPendingImageInsert] =
    useState<PendingImageInsert | null>(null);
  const [replaceSelectedImageAfterUpload, setReplaceSelectedImageAfterUpload] =
    useState(false);
  const [imagePropertiesDialogOpen, setImagePropertiesDialogOpen] =
    useState(false);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const canvasViewportRef = useRef<HTMLElement | null>(null);
  const pageStackRef = useRef<HTMLDivElement | null>(null);
  const sidebarResizeRef = useRef<SidebarResizeState | null>(null);

  return {
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
    canvasViewportRef,
    pageStackRef,
    sidebarResizeRef,
  };
}
