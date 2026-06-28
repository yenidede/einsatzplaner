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
import { DocumentTemplatePageSettingsDialog } from './DocumentTemplatePageSettingsDialog';

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
export function DocumentTemplateToolbar({
  controller,
}: {
  controller: DocumentTemplateEditorControllerModel;
}) {
  const {
    applyFontSize,
    applyTextColor,
    deleteCurrentBlock,
    duplicateCurrentBlock,
    moveCurrentBlock,
    setBlockSpacing,
    updateFooterBlock,
    updatePageSettings,
    activeArea,
    activeEditor,
    content,
    fontSize,
    footerTextBlock,
    hasSelectedImage,
    mode,
    openSelectedImageProperties,
    setZoom,
    spacingBottom,
    spacingTop,
    textColor,
    zoom,
  } = controller;

  return (
    <>
      {mode === 'edit' ? (
        <div className="bg-background border-b px-4 py-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <ToolbarTooltip label="Fett">
              <Button
                size="sm"
                variant={activeEditor?.isActive('bold') ? 'secondary' : 'ghost'}
                onClick={() => activeEditor?.chain().focus().toggleBold().run()}
                aria-label="Fett"
              >
                <Bold />
              </Button>
            </ToolbarTooltip>
            <ToolbarTooltip label="Kursiv">
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
            </ToolbarTooltip>
            <ToolbarTooltip label="Unterstrichen">
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
            </ToolbarTooltip>
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
                  activeEditor?.chain().focus().setHeading({ level: 1 }).run();
                  return;
                }

                if (value === 'heading2') {
                  activeEditor?.chain().focus().setHeading({ level: 2 }).run();
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
            <ToolbarTooltip label="Schriftgröße">
              <Input
                type="number"
                min={10}
                max={36}
                value={fontSize}
                onChange={(event) => applyFontSize(event.target.value)}
                className="h-8 w-20"
                aria-label="Schriftgröße ändern"
              />
            </ToolbarTooltip>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <ToolbarTooltip label="Ausrichtung">
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Ausrichtung ändern"
                  >
                    <AlignLeft />
                  </Button>
                </DropdownMenuTrigger>
              </ToolbarTooltip>
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
              <ToolbarTooltip label="Liste einfügen">
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" aria-label="Liste einfügen">
                    <List />
                  </Button>
                </DropdownMenuTrigger>
              </ToolbarTooltip>
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
              <ToolbarTooltip label="Textfarbe">
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
              </ToolbarTooltip>
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
            <ToolbarTooltip label="Abstand oben">
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
            </ToolbarTooltip>
            <ToolbarTooltip label="Abstand unten">
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
            </ToolbarTooltip>
            <Separator orientation="vertical" className="h-6" />
            <DropdownMenu>
              <ToolbarTooltip label="Weitere Aktionen">
                <DropdownMenuTrigger asChild>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label="Weitere Aktionen"
                  >
                    <MoreHorizontal />
                  </Button>
                </DropdownMenuTrigger>
              </ToolbarTooltip>
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
                    {activeArea === 'header' ? 'Kopfbereich' : 'Fußbereich'}
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
                            if (value !== 'firstPage' && value !== 'allPages') {
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
                    {activeArea === 'footer' ? (
                      <div className="flex items-center justify-between gap-3">
                        <Label>Trennlinie anzeigen</Label>
                        <Switch
                          checked={footerTextBlock.showDivider ?? false}
                          onCheckedChange={(checked) =>
                            updateFooterBlock(
                              footerTextBlock.id,
                              (currentBlock) => ({
                                ...currentBlock,
                                showDivider: checked,
                              })
                            )
                          }
                        />
                      </div>
                    ) : null}
                  </div>
                </PopoverContent>
              </Popover>
            ) : null}
            <DocumentTemplatePageSettingsDialog controller={controller} />
            <Separator orientation="vertical" className="h-6" />
            <ToolbarTooltip label="Verkleinern">
              <Button
                size="sm"
                variant="ghost"
                onClick={() => setZoom((current) => Math.max(50, current - 10))}
                aria-label="Verkleinern"
              >
                <Minus />
              </Button>
            </ToolbarTooltip>
            <span className="text-muted-foreground min-w-14 text-center text-sm">
              {zoom} %
            </span>
            <ToolbarTooltip label="Vergrößern">
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
            </ToolbarTooltip>
            <ToolbarTooltip label="Auf Seitenbreite zoomen">
              <Button size="sm" variant="outline" onClick={() => setZoom(100)}>
                Seitenbreite
              </Button>
            </ToolbarTooltip>
          </div>
        </div>
      ) : null}
    </>
  );
}
