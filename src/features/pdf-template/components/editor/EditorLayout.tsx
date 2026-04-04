'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
  type ReactNode,
} from 'react';
import { type Template } from '@pdfme/common';
import { useRouter } from 'next/navigation';
import {
  ChevronDown,
  LoaderCircle,
  ImageIcon,
  List,
  PanelBottom,
  Plus,
  Search,
  Table2,
  Trash2,
  type LucideIcon,
} from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { PdfTemplateResizeHandle } from './PdfTemplateResizeHandle';
import {
  createPdfTemplate,
  updatePdfTemplate,
} from '@/features/pdf-template/server/pdf-template.actions';
import { usePdfTemplateFields } from '@/features/pdf-template/hooks/usePdfTemplateFields';
import { getPdfmePlugins } from '@/features/pdf-template/lib/pdf-template-defaults';
import {
  compareTemplates,
  getDesignerPageElementForIndex,
  PDF_PAGE_HEIGHT_MM,
  PDF_PAGE_WIDTH_MM,
  sanitizeBaseTemplate,
  type TemplateSchema,
} from '@/features/pdf-template/lib/pdf-template-editor-utils';
import {
  applyFooterToTemplate,
  buildFooterLayout,
  createDefaultFooterConfig,
  stripFooterSchemas,
} from '@/features/pdf-template/lib/pdf-template-footer';
import { applyImageBindingsToTemplate } from '@/features/pdf-template/lib/pdf-template-image';
import { getEditPdfTemplateSettingsPath } from '@/features/pdf-template/lib/pdf-template-routes';
import { useConfirmDialog } from '@/hooks/use-confirm-dialog';
import type {
  PdfTemplateFieldDefinition,
  PdfTemplateFooterConfig,
  PdfTemplateFooterRow,
  PdfTemplateFooterSeparator,
} from '@/features/pdf-template/types';
import { Kbd, KbdGroup } from '@/components/ui/kbd';

declare global {
  interface Window {
    __PDFME_UI_CONFIRM__?: (message: string) => Promise<boolean>;
  }
}

type EditorMode = 'editing' | 'preview';
type ActiveSheet = 'fields' | 'footer' | null;

type EditorState = {
  mode: EditorMode;
  activeSheet: ActiveSheet;
  zoom: number;
  currentPage: number;
  totalPages: number;
  gridEnabled: boolean;
  snapEnabled: boolean;
  isDirty: boolean;
  documentTitle: string;
};

interface EditorLayoutProps {
  organizationId: string;
  templateId?: string;
  initialName: string;
  initialTemplate: Template;
  initialFooterConfig: PdfTemplateFooterConfig | null;
  initialSampleEinsatzId: string | null;
  previewAssignments: Array<{ id: string; title: string }>;
  fields: PdfTemplateFieldDefinition[];
}

type DesignerInstance = {
  destroy: () => void;
  getTemplate: () => Template;
  updateTemplate: (template: Template) => void;
  getPageCursor: () => number;
};

type IconButtonProps = {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  onClick: () => void;
};

type SheetProps = {
  open: boolean;
  children: ReactNode;
};

type SheetContentProps = {
  width: number;
  onResizeStart: (clientX: number) => void;
  children: ReactNode;
};

const MOCK_PREVIEW_ID = 'mock';
const ZOOM_MIN = 50;
const ZOOM_MAX = 200;
const ZOOM_STEP = 10;
const FIELD_MIN_WIDTH_MM = 78;
const FIELD_HEIGHT_MM = 10;
const IMAGE_TOOL_WIDTH_MM = 42;
const IMAGE_TOOL_HEIGHT_MM = 24;
const TABLE_TOOL_WIDTH_MM = 120;
const TABLE_TOOL_HEIGHT_MM = 26;
const LOGO_IMAGE_WIDTH_MM = 42;
const LOGO_IMAGE_HEIGHT_MM = 24;
const SHEET_DEFAULT_WIDTH = 320;
const SHEET_MIN_WIDTH = 280;
const SHEET_MAX_WIDTH = 560;
const SHEET_RESIZE_HANDLE_WIDTH = 10;
const FIELD_DRAG_MIME_TYPE = 'application/pdf-template-field';
const FOOTER_SEPARATOR_OPTIONS: Array<{
  value: PdfTemplateFooterSeparator;
  label: string;
}> = [
  { value: 'pipe', label: '|' },
  { value: 'dot', label: '•' },
  { value: 'comma', label: ',' },
  { value: 'slash', label: '/' },
  { value: 'none', label: 'Kein' },
];
const FOOTER_MAX_ROWS = 2;
const FOOTER_DIVIDER_OFFSET_MM = 5;
const FOOTER_FIELD_CATEGORY_ORDER = [
  'organization',
  'assignment',
  'pricing',
  'helpers',
  'other',
] as const;
const LOGO_FIELD_KEYS = new Set([
  'organisation_logo_url',
  'organization_logo_url',
]);

type FooterFieldCategory = (typeof FOOTER_FIELD_CATEGORY_ORDER)[number];
const IMAGE_PLACEHOLDER_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAYAAADl5PURAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAYnSURBVHhe7do/blRXAMXh7C5sgEVE1CyBig6lpklDgWihRpGgoU+BhCKaLABF7iYaXgz43PvGd4xxwfmKD8nS4Xrc/PT+zC/v//7n8Oe7vwDq/HL85/c/XgHUEUCglgACtYYAPn/1drhPBvgZHPt2MoDHnz/9ewHw08neCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWydwII1MjeCSBQI3sngECN7J0AAjWyd0MAn796+3kE8LM59u1kAAFaCCBQSwCBWv8BnZnlnLmCvtEAAAAASUVORK5CYII=';
const LOGO_PLACEHOLDER_DATA_URL =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAYAAADl5PURAAAAAXNSR0IArs4c6QAAAARnQU1BAACxjwv8YQUAAAAJcEhZcwAADsMAAA7DAcdvqGQAAAZWSURBVHhe7dy/ihV3GMZx7y7egBcR7L0DK0vTW6SxEGy3N4UWwTpgQAIWuYAQSHPCWVijz/nN2ZnZPWxmnk/xEcQ573m3mC/zR330+x9/Hn759TeAOo+Ov/z08xVAHQEEagkgUOskgG+uPpzcJwPswbFvZwN4/P1ff/8DsDvZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4AgRrZOwEEamTvBBCokb0TQKBG9k4Ad+vj4cWTHw8/hMfPrg6fTo6FDtk7AdwtAYSUvRPA3RJASNk7AdwtAYSUvRPA3RJASNk7AdwtAYSUvRPA3RJASNk7AdytCwfw/auT2V+/48nzw+vPg8/M8fnq8HQw8+nbL/P+/DaX2ptNyN4J4G5dJoDvXp7OPOfF+9MZY+N9v3UdqPfrAni5vdmS7J0A7tY4KOsDOJ43x21xmrqqW2L6Oy64N5uTvRPA3Rqf+OsC+OXw+tnprCWmYzLec6nx/EvuzRZl7wRwt8ZhWRPAT2+fn8y5njV4ZjZ97KvDuzvNHv88N0ahmj/73LHjvdmm7J0A7tY4GMsDODFnEJEbUzE5jdTS2ePj72f2kr3ZquydAO7WRACWBnDiren5KMz87jWz535m7nHfmbk3m5W9E8Ddup+TeXRVdO4q6sborWveTq6aPfHCJMO2avbMvdmu7J0A7tb9BHBtEOYEaN3s8c+VAVw3e97ebFf2TgB3axwKAcx535uzN9uVvRPA3RqHQgBz3vfm7M12Ze8EcLfGoVgawLVBmBOg8TG3zPYMkDvI3gngbt1PAC/5NnUUqdtmz/7MBfdmu7J3Arhb93UyT8w5c1U0O1ITV3OTsyeOH86+5N5sVvZOAHdrHIC5vj3pp8IwuqWcPnYUnul/qnZy/Jn4HY0iNb3LXfdmq7J3Arhb9xfAu846mvzfVSZuVZcaBfCie7NJ2TsB3K27nfynQVk/77aIjF48THn87PnwSvB038vvzfZk7wRwt9af+EdTQVkUqwW3j3PmPn75cfJWeGrfJfO/fs+CvdmW7J0A7tZlAnhj6pnZ0fIXLTfGzwS/C9LKAN64zN5sRfZOANmWiWeGbleZI3sngGzK6Apu9FYXRrJ3AsiGjG/r3boyV/ZOAHlgHw8vZgVs/HzwaO7zP8jeCSAP7L+ruqkrudFtr6s/1sjeCSAPbHxbO4dnfyyVvRNAHti6AIofa2TvBJAHtjyA138h+mQO3C57J4D8L5x7zncdPVd83IPsnQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3snQACNbJ3AgjUyN4JIFAjeyeAQI3s3UkA31x9uD4IYG+OfTsbQIAWAgjUEkCg1r9PYEYwMibGVgAAAABJRU5ErkJggg==';

function classes(...parts: Array<string | false | undefined>): string {
  return parts.filter(Boolean).join(' ');
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function isLogoFieldKey(fieldKey: string): boolean {
  return LOGO_FIELD_KEYS.has(fieldKey);
}

function createToolElementName(prefix: string): string {
  return `${prefix}_${Date.now()}`;
}

function isFooterSeparator(value: string): value is PdfTemplateFooterSeparator {
  return FOOTER_SEPARATOR_OPTIONS.some((option) => option.value === value);
}

function getFooterSeparatorForUi(
  separator: PdfTemplateFooterSeparator
): PdfTemplateFooterSeparator {
  return isFooterSeparator(separator) ? separator : 'pipe';
}

function getFooterSeparatorLabel(
  separator: PdfTemplateFooterSeparator
): string {
  return (
    FOOTER_SEPARATOR_OPTIONS.find((option) => option.value === separator)
      ?.label ?? '|'
  );
}

function footerSeparatorJoinValue(
  separator: PdfTemplateFooterRow['separator']
): string {
  if (separator === 'line_break') {
    return '\n';
  }

  if (separator === 'none') {
    return '';
  }

  return ` ${footerSeparatorToGlyph(separator)} `;
}

function footerSeparatorToGlyph(
  separator: PdfTemplateFooterRow['separator']
): string {
  switch (separator) {
    case 'dot':
      return '·';
    case 'comma':
      return ',';
    case 'none':
      return '';
    case 'line_break':
      return '\n';
    case 'dash':
      return '-';
    case 'slash':
      return '/';
    case 'pipe':
    default:
      return '|';
  }
}

function buildFooterRowText(row: PdfTemplateFooterRow): string {
  const parts = row.segments
    .map((segment) => segment.text.trim())
    .filter(Boolean);

  if (parts.length === 0) {
    return '';
  }

  return parts.join(footerSeparatorJoinValue(row.separator));
}

function getFooterFieldCategory(
  field: PdfTemplateFieldDefinition
): FooterFieldCategory {
  const key = field.key.toLowerCase();
  const subgroup = (field.subgroup ?? '').toLowerCase();

  if (field.group === 'organization') {
    return 'organization';
  }

  if (
    key.includes('preis') ||
    key.includes('price') ||
    key.includes('kosten') ||
    key.includes('betrag') ||
    subgroup.includes('preis')
  ) {
    return 'pricing';
  }

  if (
    field.group === 'participants' ||
    key.includes('helfer') ||
    key.includes('helper') ||
    key.includes('teilnehmer')
  ) {
    return 'helpers';
  }

  if (field.group === 'einsatz' || field.group === 'contact_person') {
    return 'assignment';
  }

  return 'other';
}

function getFooterFieldCategoryLabel(category: FooterFieldCategory): string {
  switch (category) {
    case 'organization':
      return 'Organisation';
    case 'assignment':
      return 'Einsatz';
    case 'pricing':
      return 'Preis';
    case 'helpers':
      return 'Helfer';
    case 'other':
    default:
      return 'Weitere';
  }
}

function createFooterRow(
  text: string,
  column: PdfTemplateFooterRow['column'] = 'left',
  separator: PdfTemplateFooterRow['separator'] = 'pipe'
): PdfTemplateFooterRow {
  return {
    id: createToolElementName('footer_row'),
    separator,
    column,
    segments: [
      {
        id: createToolElementName('footer_segment'),
        text,
      },
    ],
  };
}

function createFieldToken(fieldKey: string): string {
  return `{${fieldKey}}`;
}

function createElementId(): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return crypto.randomUUID();
  }

  return `pdf-field-${Date.now()}-${Math.floor(Math.random() * 1_000_000)}`;
}

function isFieldDragEvent(dataTransfer: DataTransfer): boolean {
  return Array.from(dataTransfer.types).includes(FIELD_DRAG_MIME_TYPE);
}

function getDropPosition(
  event: DragEvent<HTMLDivElement>,
  container: HTMLDivElement | null
): { x: number; y: number } | null {
  const pageElement = getDesignerPageElementForIndex(container, 0);

  if (!pageElement) {
    return null;
  }

  const pageRect = pageElement.getBoundingClientRect();
  const relativeX = event.clientX - pageRect.left;
  const relativeY = event.clientY - pageRect.top;

  if (
    relativeX < 0 ||
    relativeY < 0 ||
    relativeX > pageRect.width ||
    relativeY > pageRect.height
  ) {
    return null;
  }

  return {
    x: (relativeX / pageRect.width) * PDF_PAGE_WIDTH_MM,
    y: (relativeY / pageRect.height) * PDF_PAGE_HEIGHT_MM,
  };
}

function IconButton({ label, icon: Icon, active, onClick }: IconButtonProps) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className={classes(
            'size-8 rounded-md transition-colors',
            active
              ? 'bg-slate-200/70 text-slate-900'
              : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
          )}
          onClick={onClick}
        >
          <Icon className="size-4" />
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  );
}

function Sheet({ open, children }: SheetProps) {
  if (!open) {
    return null;
  }

  return <>{children}</>;
}

function SheetContent({ width, onResizeStart, children }: SheetContentProps) {
  return (
    <div
      className="pointer-events-none absolute inset-y-0 left-0 z-30 flex translate-x-0 transition-transform duration-150 ease-in-out"
      style={{ width: width + SHEET_RESIZE_HANDLE_WIDTH }}
    >
      <div
        className="pointer-events-auto flex h-full flex-col border-r border-slate-200/60 bg-white/90 shadow-sm backdrop-blur-sm"
        style={{ width }}
      >
        {children}
      </div>
      <div
        className="pointer-events-auto h-full"
        style={{ width: SHEET_RESIZE_HANDLE_WIDTH }}
      >
        <PdfTemplateResizeHandle
          ariaLabel="Breite der Seitenleiste anpassen"
          onResizeStart={onResizeStart}
        />
      </div>
    </div>
  );
}

export function EditorLayout({
  organizationId,
  templateId,
  initialName,
  initialTemplate,
  initialFooterConfig,
  initialSampleEinsatzId,
  previewAssignments,
  fields,
}: EditorLayoutProps) {
  const router = useRouter();
  const { showDestructive } = useConfirmDialog();
  const normalizedInitialTemplate = useMemo(
    () => sanitizeBaseTemplate(initialTemplate),
    [initialTemplate]
  );

  const baselineTemplateRef = useRef<Template>(normalizedInitialTemplate);
  const baselineNameRef = useRef(initialName);
  const baselineFooterRef = useRef<PdfTemplateFooterConfig | null>(
    initialFooterConfig
  );
  const baselineSampleRef = useRef<string | null>(initialSampleEinsatzId);

  const canvasRef = useRef<HTMLDivElement | null>(null);
  const designerContainerRef = useRef<HTMLDivElement | null>(null);
  const designerRef = useRef<DesignerInstance | null>(null);
  const appliedTemplateRef = useRef<Template>(normalizedInitialTemplate);
  const isApplyingTemplateRef = useRef(false);

  const [template, setTemplate] = useState<Template>(normalizedInitialTemplate);
  const [footerConfig, setFooterConfig] =
    useState<PdfTemplateFooterConfig | null>(initialFooterConfig);
  const [isSaving, setIsSaving] = useState(false);
  const [selectedPreviewId, setSelectedPreviewId] = useState(
    initialSampleEinsatzId ?? MOCK_PREVIEW_ID
  );
  const [gridOverlayStyle, setGridOverlayStyle] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [openGroupId, setOpenGroupId] = useState<string | null>(null);
  const [activeFooterRowId, setActiveFooterRowId] = useState<string | null>(
    null
  );
  const [footerFieldPickerRowId, setFooterFieldPickerRowId] = useState<
    string | null
  >(null);
  const [footerSeparatorPickerRowId, setFooterSeparatorPickerRowId] = useState<
    string | null
  >(null);
  const [sheetWidth, setSheetWidth] = useState(SHEET_DEFAULT_WIDTH);
  const [insertHighlight, setInsertHighlight] = useState<{
    xMm: number;
    yMm: number;
    widthMm: number;
    heightMm: number;
  } | null>(null);
  const cleanupSheetResizeRef = useRef<(() => void) | null>(null);
  const [state, setState] = useState<EditorState>({
    mode: 'editing',
    activeSheet: null,
    zoom: 100,
    currentPage: 1,
    totalPages: Math.max(normalizedInitialTemplate.schemas.length, 1),
    gridEnabled: true,
    snapEnabled: true,
    isDirty: false,
    documentTitle: initialName,
  });

  const renderedTemplate = useMemo(() => {
    const withFooter = applyFooterToTemplate({
      template,
      footer: footerConfig,
    });

    return applyImageBindingsToTemplate({
      template: withFooter,
      input: {},
    });
  }, [footerConfig, template]);

  const fieldMap = useMemo(
    () => new Map(fields.map((field) => [field.key, field])),
    [fields]
  );
  const { query, setQuery, filteredGroups } = usePdfTemplateFields(fields);
  const defaultFooterFieldKey = useMemo(
    () =>
      fields.find(
        (field) =>
          !field.key.includes('_tabelle') &&
          field.key !== 'organisation_logo_url' &&
          field.key !== 'organization_logo_url'
      )?.key ?? 'organisation_name',
    [fields]
  );
  const footerRows = footerConfig?.rows ?? [];
  const normalizedFooterRows = useMemo(
    () =>
      footerRows
        .filter((row) => row.column === 'left')
        .slice(0, FOOTER_MAX_ROWS),
    [footerRows]
  );
  const footerFieldsByCategory = useMemo(() => {
    const grouped = new Map<
      FooterFieldCategory,
      PdfTemplateFieldDefinition[]
    >();

    for (const category of FOOTER_FIELD_CATEGORY_ORDER) {
      grouped.set(category, []);
    }

    for (const field of fields) {
      const category = getFooterFieldCategory(field);
      grouped.get(category)?.push(field);
    }

    return FOOTER_FIELD_CATEGORY_ORDER.map((category) => ({
      key: category,
      label: getFooterFieldCategoryLabel(category),
      fields: grouped.get(category) ?? [],
    })).filter((category) => category.fields.length > 0);
  }, [fields]);
  const footerLayout = useMemo(
    () => (footerConfig ? buildFooterLayout(footerConfig) : null),
    [footerConfig]
  );
  const footerAreaStyle = useMemo(() => {
    if (!gridOverlayStyle || !footerLayout) {
      return null;
    }

    const scaleX = gridOverlayStyle.width / PDF_PAGE_WIDTH_MM;
    const scaleY = gridOverlayStyle.height / PDF_PAGE_HEIGHT_MM;

    return {
      top: gridOverlayStyle.top + footerLayout.topY * scaleY,
      left: gridOverlayStyle.left + footerLayout.containerX * scaleX,
      width: footerLayout.containerWidth * scaleX,
      height: (footerLayout.bottomY - footerLayout.topY) * scaleY,
    };
  }, [footerLayout, gridOverlayStyle]);
  const footerSeparatorStyle = useMemo(() => {
    if (!gridOverlayStyle || !footerLayout) {
      return null;
    }

    const scaleX = gridOverlayStyle.width / PDF_PAGE_WIDTH_MM;
    const scaleY = gridOverlayStyle.height / PDF_PAGE_HEIGHT_MM;

    return {
      top:
        gridOverlayStyle.top +
        Math.max(0, footerLayout.topY - FOOTER_DIVIDER_OFFSET_MM) * scaleY,
      left: gridOverlayStyle.left + footerLayout.containerX * scaleX,
      width: footerLayout.containerWidth * scaleX,
    };
  }, [footerLayout, gridOverlayStyle]);
  const insertHighlightStyle = useMemo(() => {
    if (!gridOverlayStyle || !insertHighlight) {
      return null;
    }

    const scaleX = gridOverlayStyle.width / PDF_PAGE_WIDTH_MM;
    const scaleY = gridOverlayStyle.height / PDF_PAGE_HEIGHT_MM;

    return {
      top: gridOverlayStyle.top + insertHighlight.yMm * scaleY,
      left: gridOverlayStyle.left + insertHighlight.xMm * scaleX,
      width: insertHighlight.widthMm * scaleX,
      height: insertHighlight.heightMm * scaleY,
    };
  }, [gridOverlayStyle, insertHighlight]);

  const isDirty = useMemo(() => {
    if (state.documentTitle !== baselineNameRef.current) {
      return true;
    }

    if (
      JSON.stringify(footerConfig) !== JSON.stringify(baselineFooterRef.current)
    ) {
      return true;
    }

    const baselinePreview = baselineSampleRef.current ?? MOCK_PREVIEW_ID;
    if (selectedPreviewId !== baselinePreview) {
      return true;
    }

    return !compareTemplates(template, baselineTemplateRef.current);
  }, [footerConfig, selectedPreviewId, state.documentTitle, template]);

  useEffect(() => {
    setState((current) => {
      const nextTotalPages = Math.max(template.schemas.length, 1);
      const nextCurrentPage = Math.min(current.currentPage, nextTotalPages);

      if (
        current.totalPages === nextTotalPages &&
        current.currentPage === nextCurrentPage &&
        current.isDirty === isDirty
      ) {
        return current;
      }

      return {
        ...current,
        totalPages: nextTotalPages,
        currentPage: nextCurrentPage,
        isDirty,
      };
    });
  }, [isDirty, template.schemas.length]);

  useEffect(() => {
    let cancelled = false;

    async function initializeDesigner() {
      if (!designerContainerRef.current) {
        return;
      }

      const { Designer } = await import('@pdfme/ui');

      if (cancelled || !designerContainerRef.current) {
        return;
      }

      const instance = new Designer({
        domContainer: designerContainerRef.current,
        template: renderedTemplate,
        options: {
          lang: 'de',
          zoomLevel: 1,
          sidebarOpen: false,
        },
        plugins: getPdfmePlugins(),
      });

      appliedTemplateRef.current = renderedTemplate;

      instance.onChangeTemplate((changedTemplate) => {
        const sanitized = sanitizeBaseTemplate(
          stripFooterSchemas(changedTemplate)
        );
        appliedTemplateRef.current = sanitized;

        if (isApplyingTemplateRef.current) {
          isApplyingTemplateRef.current = false;
          return;
        }

        setTemplate(sanitized);
      });

      instance.onPageChange(({ currentPage }) => {
        setState((current) => ({
          ...current,
          currentPage: Math.min(current.totalPages, currentPage + 1),
        }));
      });

      setState((current) => ({
        ...current,
        currentPage: Math.min(current.totalPages, instance.getPageCursor() + 1),
      }));

      designerRef.current = {
        destroy: () => instance.destroy(),
        getTemplate: () => instance.getTemplate(),
        updateTemplate: (nextTemplate) => instance.updateTemplate(nextTemplate),
        getPageCursor: () => instance.getPageCursor(),
      };
    }

    void initializeDesigner();

    return () => {
      cancelled = true;
      designerRef.current?.destroy();
      designerRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (!designerRef.current) {
      return;
    }

    if (compareTemplates(appliedTemplateRef.current, renderedTemplate)) {
      return;
    }

    isApplyingTemplateRef.current = true;
    appliedTemplateRef.current = renderedTemplate;
    designerRef.current.updateTemplate(renderedTemplate);
  }, [renderedTemplate]);

  useEffect(() => {
    function syncGridOverlay() {
      const canvas = canvasRef.current;
      const container = designerContainerRef.current;

      if (!canvas || !container) {
        setGridOverlayStyle(null);
        return;
      }

      const pageElement = getDesignerPageElementForIndex(container, 0);

      if (!pageElement) {
        setGridOverlayStyle(null);
        return;
      }

      const canvasRect = canvas.getBoundingClientRect();
      const pageRect = pageElement.getBoundingClientRect();

      setGridOverlayStyle({
        top: pageRect.top - canvasRect.top,
        left: pageRect.left - canvasRect.left,
        width: pageRect.width,
        height: pageRect.height,
      });
    }

    syncGridOverlay();

    const resizeObserver = new ResizeObserver(syncGridOverlay);

    if (canvasRef.current) {
      resizeObserver.observe(canvasRef.current);
    }

    if (designerContainerRef.current) {
      resizeObserver.observe(designerContainerRef.current);
    }

    window.addEventListener('resize', syncGridOverlay);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener('resize', syncGridOverlay);
    };
  }, [state.zoom, template]);

  useEffect(() => {
    return () => {
      cleanupSheetResizeRef.current?.();
      cleanupSheetResizeRef.current = null;
    };
  }, []);

  const startSheetResize = useCallback(
    (clientX: number) => {
      cleanupSheetResizeRef.current?.();
      const initialX = clientX;
      const initialWidth = sheetWidth;
      const maxWidth = Math.min(
        SHEET_MAX_WIDTH,
        Math.max(
          SHEET_MIN_WIDTH,
          window.innerWidth - 640 - SHEET_RESIZE_HANDLE_WIDTH
        )
      );

      function handlePointerMove(event: PointerEvent) {
        const delta = event.clientX - initialX;
        setSheetWidth(clamp(initialWidth + delta, SHEET_MIN_WIDTH, maxWidth));
      }

      function handlePointerUp() {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        cleanupSheetResizeRef.current = null;
      }

      cleanupSheetResizeRef.current = () => {
        window.removeEventListener('pointermove', handlePointerMove);
        window.removeEventListener('pointerup', handlePointerUp);
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      };

      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    },
    [sheetWidth]
  );

  useEffect(() => {
    if (filteredGroups.length === 0) {
      if (openGroupId !== null) {
        setOpenGroupId(null);
      }
      return;
    }

    if (openGroupId === null) {
      return;
    }

    if (!filteredGroups.some((group) => group.id === openGroupId)) {
      setOpenGroupId(filteredGroups[0].id);
    }
  }, [filteredGroups, openGroupId]);

  useEffect(() => {
    if (!insertHighlight) {
      return;
    }

    const timeout = window.setTimeout(() => {
      setInsertHighlight(null);
    }, 700);

    return () => window.clearTimeout(timeout);
  }, [insertHighlight]);

  const addFieldToTemplate = useCallback(
    (
      field: PdfTemplateFieldDefinition,
      position?: { x: number; y: number } | null
    ) => {
      const isLogoField = isLogoFieldKey(field.key);
      const computedWidth = clamp(
        isLogoField ? LOGO_IMAGE_WIDTH_MM : field.key.length * 3.5 + 32,
        isLogoField ? LOGO_IMAGE_WIDTH_MM : FIELD_MIN_WIDTH_MM,
        PDF_PAGE_WIDTH_MM - 8
      );
      const computedHeight = isLogoField
        ? LOGO_IMAGE_HEIGHT_MM
        : FIELD_HEIGHT_MM;
      const x = clamp(position?.x ?? 20, 0, PDF_PAGE_WIDTH_MM - computedWidth);
      const y = clamp(
        position?.y ?? 24,
        0,
        PDF_PAGE_HEIGHT_MM - computedHeight
      );

      setTemplate((currentTemplate) => {
        const sanitized = sanitizeBaseTemplate(currentTemplate);
        const nextPages = sanitized.schemas.map((page) => [...page]);

        if (nextPages.length === 0) {
          nextPages.push([]);
        }

        const firstPage = nextPages[0] ?? [];

        const nextSchema: TemplateSchema = isLogoField
          ? {
              id: createElementId(),
              name: field.key,
              type: 'image',
              position: { x, y },
              width: computedWidth,
              height: computedHeight,
              content: LOGO_PLACEHOLDER_DATA_URL,
              fit: 'contain',
              readOnly: true,
            }
          : {
              id: createElementId(),
              name: field.key,
              type: 'text',
              position: { x, y },
              width: computedWidth,
              height: computedHeight,
              fontSize: 10,
              content: `{${field.key}}`,
              readOnly: true,
            };

        nextPages[0] = [...firstPage, nextSchema];

        return {
          ...sanitized,
          schemas: nextPages,
        };
      });

      setInsertHighlight({
        xMm: x,
        yMm: y,
        widthMm: computedWidth,
        heightMm: computedHeight,
      });
    },
    []
  );

  const addTableToolToTemplate = useCallback(() => {
    const x = clamp(20, 0, PDF_PAGE_WIDTH_MM - TABLE_TOOL_WIDTH_MM);
    const y = clamp(24, 0, PDF_PAGE_HEIGHT_MM - TABLE_TOOL_HEIGHT_MM);

    setTemplate((currentTemplate) => {
      const sanitized = sanitizeBaseTemplate(currentTemplate);
      const nextPages = sanitized.schemas.map((page) => [...page]);

      if (nextPages.length === 0) {
        nextPages.push([]);
      }

      const firstPage = nextPages[0] ?? [];
      const nextSchema: TemplateSchema = {
        id: createElementId(),
        name: createToolElementName('tabelle'),
        type: 'table',
        position: { x, y },
        width: TABLE_TOOL_WIDTH_MM,
        height: TABLE_TOOL_HEIGHT_MM,
        content: JSON.stringify([
          ['Wert 1', 'Wert 2', 'Wert 3'],
          ['Wert 4', 'Wert 5', 'Wert 6'],
        ]),
        showHead: true,
        repeatHead: false,
        head: ['Spalte 1', 'Spalte 2', 'Spalte 3'],
        headWidthPercentages: [34, 33, 33],
        tableStyles: {
          borderColor: '#64748b',
          borderWidth: 0.3,
        },
        headStyles: {
          alignment: 'left',
          verticalAlignment: 'middle',
          fontSize: 10,
          lineHeight: 1,
          characterSpacing: 0,
          fontColor: '#ffffff',
          backgroundColor: '#334155',
          borderColor: '',
          borderWidth: { top: 0, right: 0, bottom: 0, left: 0 },
          padding: { top: 3, right: 3, bottom: 3, left: 3 },
        },
        bodyStyles: {
          alignment: 'left',
          verticalAlignment: 'middle',
          fontSize: 9,
          lineHeight: 1,
          characterSpacing: 0,
          fontColor: '#0f172a',
          backgroundColor: '#ffffff',
          alternateBackgroundColor: '#f8fafc',
          borderColor: '#cbd5e1',
          borderWidth: { top: 0.1, right: 0.1, bottom: 0.1, left: 0.1 },
          padding: { top: 3, right: 3, bottom: 3, left: 3 },
        },
        columnStyles: {},
        readOnly: true,
      };

      nextPages[0] = [...firstPage, nextSchema];

      return {
        ...sanitized,
        schemas: nextPages,
      };
    });

    setState((current) => ({
      ...current,
      mode: 'editing',
      activeSheet: null,
    }));

    setInsertHighlight({
      xMm: x,
      yMm: y,
      widthMm: TABLE_TOOL_WIDTH_MM,
      heightMm: TABLE_TOOL_HEIGHT_MM,
    });
  }, []);

  const syncFooterLegacyContent = useCallback(
    (
      rows: PdfTemplateFooterRow[]
    ): {
      content: string;
      secondaryContent: string | null;
    } => {
      const lines = rows
        .filter((row) => row.column === 'left')
        .map((row) => buildFooterRowText(row))
        .filter(Boolean);

      return {
        content: lines.join('\n'),
        secondaryContent: null,
      };
    },
    []
  );

  const updateFooter = useCallback(
    (
      updater: (current: PdfTemplateFooterConfig) => PdfTemplateFooterConfig
    ) => {
      setFooterConfig((current) => {
        const base =
          current ??
          createDefaultFooterConfig(Math.max(state.currentPage - 1, 0));
        const next = updater(base);
        const nextRows = next.rows
          .map((row) => ({ ...row, column: 'left' as const }))
          .slice(0, FOOTER_MAX_ROWS);
        const rows =
          nextRows.length > 0
            ? nextRows
            : [
                createFooterRow(
                  createFieldToken(defaultFooterFieldKey),
                  'left'
                ),
              ];
        const legacy = syncFooterLegacyContent(rows);

        return {
          ...next,
          enabled: true,
          layout: 'single_column',
          alignment: 'left',
          showDivider: true,
          rows,
          content: legacy.content,
          secondaryContent: legacy.secondaryContent,
        };
      });
    },
    [defaultFooterFieldKey, state.currentPage, syncFooterLegacyContent]
  );

  const toggleFooterBuilder = useCallback(() => {
    setState((current) => ({
      ...current,
      mode: current.mode === 'preview' ? 'editing' : current.mode,
      activeSheet: current.activeSheet === 'footer' ? null : 'footer',
    }));

    setFooterConfig((current) => {
      const base =
        current ??
        createDefaultFooterConfig(Math.max(state.currentPage - 1, 0));
      const rows = base.rows
        .map((row) => ({ ...row, column: 'left' as const }))
        .slice(0, FOOTER_MAX_ROWS);
      const normalizedRows =
        rows.length > 0
          ? rows
          : [createFooterRow(createFieldToken(defaultFooterFieldKey), 'left')];
      const legacy = syncFooterLegacyContent(normalizedRows);

      return {
        ...base,
        enabled: true,
        layout: 'single_column',
        alignment: 'left',
        showDivider: true,
        rows: normalizedRows,
        content: legacy.content,
        secondaryContent: legacy.secondaryContent,
      };
    });
  }, [defaultFooterFieldKey, state.currentPage, syncFooterLegacyContent]);

  const addFooterRow = useCallback(() => {
    if (normalizedFooterRows.length >= FOOTER_MAX_ROWS) {
      return;
    }

    const nextRow = createFooterRow('Text', 'left');
    updateFooter((current) => {
      return {
        ...current,
        rows: [...current.rows, nextRow],
      };
    });
    setActiveFooterRowId(nextRow.id);
  }, [normalizedFooterRows.length, updateFooter]);

  const updateFooterRowSeparator = useCallback(
    (rowId: string, separator: PdfTemplateFooterSeparator) => {
      updateFooter((current) => ({
        ...current,
        rows: current.rows.map((row) =>
          row.id === rowId ? { ...row, separator } : row
        ),
      }));
    },
    [updateFooter]
  );

  const updateFooterSegmentText = useCallback(
    (rowId: string, segmentId: string, text: string) => {
      updateFooter((current) => ({
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          return {
            ...row,
            segments: row.segments.map((segment) =>
              segment.id === segmentId ? { ...segment, text } : segment
            ),
          };
        }),
      }));
    },
    [updateFooter]
  );

  const addFooterTextSegment = useCallback(
    (rowId: string) => {
      updateFooter((current) => ({
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          return {
            ...row,
            segments: [
              ...row.segments,
              {
                id: createToolElementName('footer_segment'),
                text: 'Text',
              },
            ],
          };
        }),
      }));
      setActiveFooterRowId(rowId);
    },
    [updateFooter]
  );

  const removeFooterSegment = useCallback(
    (rowId: string, segmentId: string) => {
      updateFooter((current) => ({
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          const nextSegments = row.segments.filter(
            (segment) => segment.id !== segmentId
          );

          return {
            ...row,
            segments:
              nextSegments.length > 0
                ? nextSegments
                : [
                    {
                      id: createToolElementName('footer_segment'),
                      text: '',
                    },
                  ],
          };
        }),
      }));
    },
    [updateFooter]
  );

  const insertFooterFieldToken = useCallback(
    (rowId: string, fieldKey: string) => {
      updateFooter((current) => ({
        ...current,
        rows: current.rows.map((row) => {
          if (row.id !== rowId) {
            return row;
          }

          return {
            ...row,
            segments: [
              ...row.segments,
              {
                id: createToolElementName('footer_segment'),
                text: createFieldToken(fieldKey),
              },
            ],
          };
        }),
      }));
      setActiveFooterRowId(rowId);
    },
    [updateFooter]
  );

  const getDraggedFieldFromTransfer = useCallback(
    (dataTransfer: DataTransfer): PdfTemplateFieldDefinition | null => {
      if (!isFieldDragEvent(dataTransfer)) {
        return null;
      }

      const fieldKey = dataTransfer.getData(FIELD_DRAG_MIME_TYPE);

      if (!fieldKey) {
        return null;
      }

      return fieldMap.get(fieldKey) ?? null;
    },
    [fieldMap]
  );

  const handleFooterFieldDragOver = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!getDraggedFieldFromTransfer(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();
      event.dataTransfer.dropEffect = 'copy';
    },
    [getDraggedFieldFromTransfer]
  );

  const handleFooterFieldDrop = useCallback(
    (rowId: string, event: DragEvent<HTMLDivElement>) => {
      const field = getDraggedFieldFromTransfer(event.dataTransfer);

      if (!field) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      insertFooterFieldToken(rowId, field.key);
    },
    [getDraggedFieldFromTransfer, insertFooterFieldToken]
  );

  const removeFooterRow = useCallback(
    (rowId: string) => {
      updateFooter((current) => {
        const nextRows = current.rows.filter((row) => row.id !== rowId);

        if (nextRows.length > 0) {
          return {
            ...current,
            rows: nextRows,
          };
        }

        return {
          ...current,
          rows: [
            createFooterRow(createFieldToken(defaultFooterFieldKey), 'left'),
          ],
        };
      });
    },
    [defaultFooterFieldKey, updateFooter]
  );

  useEffect(() => {
    if (normalizedFooterRows.length === 0) {
      setActiveFooterRowId(null);
      setFooterFieldPickerRowId(null);
      setFooterSeparatorPickerRowId(null);
      return;
    }

    if (
      activeFooterRowId === null ||
      !normalizedFooterRows.some((row) => row.id === activeFooterRowId)
    ) {
      setActiveFooterRowId(normalizedFooterRows[0].id);
    }

    if (
      footerFieldPickerRowId !== null &&
      !normalizedFooterRows.some((row) => row.id === footerFieldPickerRowId)
    ) {
      setFooterFieldPickerRowId(null);
    }

    if (
      footerSeparatorPickerRowId !== null &&
      !normalizedFooterRows.some((row) => row.id === footerSeparatorPickerRowId)
    ) {
      setFooterSeparatorPickerRowId(null);
    }
  }, [
    activeFooterRowId,
    footerFieldPickerRowId,
    footerSeparatorPickerRowId,
    normalizedFooterRows,
  ]);

  const handleCanvasDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (!isFieldDragEvent(event.dataTransfer)) {
        return;
      }

      event.preventDefault();
      event.stopPropagation();

      const fieldKey = event.dataTransfer.getData(FIELD_DRAG_MIME_TYPE);
      const field = fieldMap.get(fieldKey);

      if (!field) {
        return;
      }

      addFieldToTemplate(
        field,
        getDropPosition(event, designerContainerRef.current)
      );
    },
    [addFieldToTemplate, fieldMap]
  );

  const handleSave = useCallback(async () => {
    if (isSaving) {
      return;
    }

    setIsSaving(true);

    try {
      const currentTemplate = sanitizeBaseTemplate(
        designerRef.current?.getTemplate() ?? template
      );
      const sampleEinsatzId =
        selectedPreviewId === MOCK_PREVIEW_ID ? null : selectedPreviewId;
      const payload = {
        name: state.documentTitle,
        template: currentTemplate,
        sampleEinsatzId,
        footer: footerConfig,
      };

      if (templateId) {
        await updatePdfTemplate(templateId, payload);
        baselineTemplateRef.current = currentTemplate;
        baselineNameRef.current = state.documentTitle;
        baselineFooterRef.current = footerConfig;
        baselineSampleRef.current = sampleEinsatzId;
        toast.success('Vorlage wurde gespeichert.');
        router.refresh();
      } else {
        const created = await createPdfTemplate({
          organizationId,
          ...payload,
        });
        baselineTemplateRef.current = currentTemplate;
        baselineNameRef.current = state.documentTitle;
        baselineFooterRef.current = footerConfig;
        baselineSampleRef.current = sampleEinsatzId;
        toast.success('Vorlage wurde erstellt.');
        router.push(getEditPdfTemplateSettingsPath(organizationId, created.id));
      }
    } catch (error) {
      toast.error(
        error instanceof Error
          ? error.message
          : 'Vorlage konnte nicht gespeichert werden.'
      );
    } finally {
      setIsSaving(false);
    }
  }, [
    footerConfig,
    isSaving,
    organizationId,
    router,
    selectedPreviewId,
    state.documentTitle,
    template,
    templateId,
  ]);

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape' && state.mode === 'preview') {
        event.preventDefault();
        setState((current) => ({
          ...current,
          mode: 'editing',
        }));
      }

      if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === 's' &&
        !isSaving
      ) {
        event.preventDefault();
        void handleSave();
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleSave, isSaving, state.mode]);

  useEffect(() => {
    const previousConfirm = window.__PDFME_UI_CONFIRM__;
    const confirmWithDialog = async (message: string): Promise<boolean> => {
      const result = await showDestructive(
        'Seite entfernen?',
        message || 'Sind Sie sicher, dass Sie diese Seite entfernen möchten?'
      );

      return result === 'success';
    };

    window.__PDFME_UI_CONFIRM__ = confirmWithDialog;

    return () => {
      if (window.__PDFME_UI_CONFIRM__ === confirmWithDialog) {
        window.__PDFME_UI_CONFIRM__ = previousConfirm;
      }
    };
  }, [showDestructive]);

  const previewLabel =
    selectedPreviewId === MOCK_PREVIEW_ID
      ? 'Musterdaten'
      : (previewAssignments.find((item) => item.id === selectedPreviewId)
          ?.title ?? 'Testdatensatz');

  return (
    <TooltipProvider>
      <div className="flex h-full min-h-0 w-full flex-col bg-slate-50 text-slate-800">
        <header
          className={classes(
            'flex h-10 items-center border-b border-slate-200/70 px-3 backdrop-blur supports-backdrop-filter:bg-white/90',
            state.mode === 'preview' ? 'bg-blue-50/90' : 'bg-white/90'
          )}
        >
          <div className="flex min-w-0 flex-1 items-center gap-1.5">
            <Input
              value={state.documentTitle}
              onChange={(event) =>
                setState((current) => ({
                  ...current,
                  documentTitle: event.target.value,
                }))
              }
              onBlur={() =>
                setState((current) => ({
                  ...current,
                  documentTitle:
                    current.documentTitle.trim().length > 0
                      ? current.documentTitle.trim()
                      : 'Unbenannte Vorlage',
                }))
              }
              className="h-8 max-w-xl border-transparent bg-transparent px-2 text-base font-semibold shadow-none focus-visible:border-slate-300 focus-visible:ring-0"
              aria-label="Dokumenttitel"
            />
          </div>

          <div className="flex items-center gap-1.5">
            {state.mode === 'preview' ? (
              <div className="flex items-center gap-1.5 px-1">
                <span className="text-xs text-blue-900/90">
                  Vorschau – Testdatensatz:
                </span>
                <Select
                  value={selectedPreviewId}
                  onValueChange={setSelectedPreviewId}
                >
                  <SelectTrigger className="h-7 min-w-48 rounded-md border-blue-200 bg-white">
                    <SelectValue placeholder={previewLabel} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={MOCK_PREVIEW_ID}>Musterdaten</SelectItem>
                    {previewAssignments.map((assignment) => (
                      <SelectItem key={assignment.id} value={assignment.id}>
                        {assignment.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ) : null}

            <span className="text-xs text-slate-500">
              {state.isDirty ? 'Nicht gespeichert' : 'Gespeichert'}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="h-8 rounded-md px-2 text-slate-700"
              onClick={() => router.back()}
            >
              <span className="ml-2 hidden sm:inline">
                <Kbd>ESC</Kbd>
              </span>
              Zurück
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 rounded-md px-3"
              onClick={() => void handleSave()}
              disabled={isSaving}
            >
              {isSaving ? (
                <LoaderCircle className="h-4 w-4 animate-spin" />
              ) : null}
              <KbdGroup className="ml-2 hidden sm:flex">
                <Kbd>⌘</Kbd>
                <Kbd>S</Kbd>
              </KbdGroup>
              Speichern
            </Button>
          </div>
        </header>

        <div className="flex min-h-0 flex-1 overflow-hidden bg-slate-50">
          <aside className="flex w-12 shrink-0 flex-col items-center border-r border-slate-200/60 bg-white/80 py-2 backdrop-blur-sm">
            <IconButton
              label="Felder"
              icon={List}
              active={state.activeSheet === 'fields'}
              onClick={() =>
                setState((current) => ({
                  ...current,
                  activeSheet:
                    current.activeSheet === 'fields' ? null : 'fields',
                  mode: current.mode === 'preview' ? 'editing' : current.mode,
                }))
              }
            />
            <IconButton
              label="Tabelle"
              icon={Table2}
              onClick={addTableToolToTemplate}
            />
            <div className="my-2 h-px w-6 bg-slate-200" />
            <IconButton
              label="Footer"
              icon={PanelBottom}
              active={state.activeSheet === 'footer'}
              onClick={toggleFooterBuilder}
            />
          </aside>

          <main className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50">
            <section
              className={classes(
                'relative min-h-0 flex-1 overflow-auto p-2 transition-[padding] duration-150 ease-in-out',
                state.mode === 'preview' ? 'bg-blue-50/70' : 'bg-slate-50'
              )}
              style={
                state.activeSheet !== null
                  ? {
                      paddingLeft: sheetWidth + SHEET_RESIZE_HANDLE_WIDTH + 1,
                    }
                  : undefined
              }
              onMouseDown={() =>
                setState((current) =>
                  current.activeSheet === null
                    ? current
                    : { ...current, activeSheet: null }
                )
              }
              onDragOver={(event) => {
                if (!isFieldDragEvent(event.dataTransfer)) {
                  return;
                }

                event.preventDefault();
                event.dataTransfer.dropEffect = 'copy';
              }}
              onDrop={handleCanvasDrop}
            >
              <div
                ref={canvasRef}
                className="relative mx-auto min-h-144 w-[88vw] max-w-[1760px] min-w-[980px] overflow-auto rounded-lg bg-slate-100/80 ring-1 ring-slate-200/60"
              >
                {state.gridEnabled && gridOverlayStyle ? (
                  <div
                    className="pointer-events-none absolute z-20"
                    style={{
                      ...gridOverlayStyle,
                      backgroundImage:
                        'linear-gradient(to right, rgba(148,163,184,0.16) 1px, transparent 1px), linear-gradient(to bottom, rgba(148,163,184,0.16) 1px, transparent 1px)',
                      backgroundSize: '24px 24px',
                    }}
                  />
                ) : null}

                {footerSeparatorStyle ? (
                  <>
                    <div
                      className="pointer-events-none absolute z-10 border-t border-slate-300/70"
                      style={footerSeparatorStyle}
                    />
                    <div
                      className="pointer-events-none absolute z-10 -translate-y-1/2 rounded-sm bg-white/90 px-1.5 py-0.5 text-[10px] font-medium tracking-wide text-slate-500 uppercase ring-1 ring-slate-200/70"
                      style={{
                        top: footerSeparatorStyle.top,
                        left: footerSeparatorStyle.left + 8,
                      }}
                    >
                      Footer
                    </div>
                  </>
                ) : null}

                {insertHighlightStyle ? (
                  <div
                    className="pointer-events-none absolute z-30 animate-pulse border-2 border-blue-400 bg-blue-100/45 transition-opacity duration-150 ease-in-out"
                    style={insertHighlightStyle}
                  />
                ) : null}

                {state.activeSheet === 'footer' && footerAreaStyle ? (
                  <div
                    className="pointer-events-none absolute z-20 border border-amber-400/80 bg-amber-50/20"
                    style={footerAreaStyle}
                  />
                ) : null}

                <div className="p-2">
                  <div style={{ zoom: `${state.zoom}%` }}>
                    <div
                      ref={designerContainerRef}
                      className="min-h-168 w-full"
                    />
                  </div>
                </div>
              </div>
            </section>

            <footer className="flex h-10 items-center border-t border-slate-200/60 bg-white/85 px-2 backdrop-blur">
              <div className="flex min-w-0 flex-1 items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      currentPage: Math.max(1, current.currentPage - 1),
                    }))
                  }
                  disabled={state.currentPage <= 1}
                >
                  {'\u2190'}
                </Button>
                <span className="text-sm text-slate-600">
                  Seite {state.currentPage} / {state.totalPages}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      currentPage: Math.min(
                        current.totalPages,
                        current.currentPage + 1
                      ),
                    }))
                  }
                  disabled={state.currentPage >= state.totalPages}
                >
                  {'\u2192'}
                </Button>
              </div>

              <div className="flex min-w-0 flex-1 justify-center" />

              <div className="flex min-w-0 flex-1 items-center justify-end gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      zoom: Math.max(ZOOM_MIN, current.zoom - ZOOM_STEP),
                    }))
                  }
                  disabled={state.zoom <= ZOOM_MIN}
                >
                  -
                </Button>
                <span className="w-12 text-center text-sm text-slate-600">
                  {state.zoom}%
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 rounded-md px-2"
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      zoom: Math.min(ZOOM_MAX, current.zoom + ZOOM_STEP),
                    }))
                  }
                  disabled={state.zoom >= ZOOM_MAX}
                >
                  +
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={classes(
                    'h-8 rounded-md px-2',
                    state.gridEnabled ? 'bg-slate-200/70 text-slate-900' : ''
                  )}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      gridEnabled: !current.gridEnabled,
                    }))
                  }
                >
                  Raster
                </Button>

                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className={classes(
                    'h-8 rounded-md px-2',
                    state.snapEnabled ? 'bg-slate-200/70 text-slate-900' : ''
                  )}
                  onClick={() =>
                    setState((current) => ({
                      ...current,
                      snapEnabled: !current.snapEnabled,
                    }))
                  }
                >
                  Snap
                </Button>
              </div>
            </footer>

            <Sheet open={state.activeSheet !== null}>
              <SheetContent width={sheetWidth} onResizeStart={startSheetResize}>
                {state.activeSheet === 'fields' ? (
                  <>
                    <div className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                          Felder
                        </h3>
                        <Badge
                          variant="outline"
                          className="rounded-md border-transparent bg-slate-100 text-slate-600"
                        >
                          {fields.length}
                        </Badge>
                      </div>
                      <div className="relative mt-3">
                        <Search className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-slate-400" />
                        <Input
                          type="search"
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          placeholder="Feld suchen"
                          className="h-9 rounded-md border-slate-200 bg-white pl-9"
                        />
                      </div>
                    </div>

                    <div className="flex-1 space-y-2.5 overflow-y-auto px-3 py-3">
                      {filteredGroups.map((group) => {
                        const isOpen = openGroupId === group.id;

                        return (
                          <section
                            key={group.id}
                            className="rounded-lg bg-white/70 p-1.5 ring-1 ring-slate-200/55"
                          >
                            <button
                              type="button"
                              className={classes(
                                'flex w-full items-center justify-between rounded-md px-3 py-2.5 text-left transition-colors',
                                isOpen
                                  ? 'bg-white text-slate-900'
                                  : 'text-slate-700 hover:bg-white/80'
                              )}
                              onClick={() =>
                                setOpenGroupId((current) =>
                                  current === group.id ? null : group.id
                                )
                              }
                              aria-expanded={isOpen}
                            >
                              <span className="text-sm font-semibold text-slate-800">
                                {group.label}
                              </span>
                              <div className="flex items-center gap-2">
                                <Badge
                                  variant="outline"
                                  className="h-5 rounded-full border-transparent bg-white px-1.5 text-[10px] text-slate-500"
                                >
                                  {group.fields.length}
                                </Badge>
                                <ChevronDown
                                  className={classes(
                                    'h-4 w-4 text-slate-500 transition-transform duration-150 ease-in-out',
                                    isOpen ? 'rotate-180' : ''
                                  )}
                                />
                              </div>
                            </button>

                            {isOpen ? (
                              <div className="space-y-2 px-1 pt-2 pb-1">
                                {group.fields.map((field) => (
                                  <button
                                    key={field.key}
                                    type="button"
                                    draggable
                                    onClick={() => addFieldToTemplate(field)}
                                    onDragStart={(event) => {
                                      event.dataTransfer.effectAllowed = 'copy';
                                      event.dataTransfer.setData(
                                        FIELD_DRAG_MIME_TYPE,
                                        field.key
                                      );
                                    }}
                                    className="w-full cursor-grab rounded-md border border-slate-200/70 bg-white px-3 py-2.5 text-left text-sm font-medium text-slate-800 transition-colors hover:border-slate-300 hover:bg-slate-50"
                                  >
                                    {field.label}
                                  </button>
                                ))}
                              </div>
                            ) : null}
                          </section>
                        );
                      })}

                      {filteredGroups.length === 0 ? (
                        <p className="text-sm text-slate-500">
                          Keine Felder gefunden.
                        </p>
                      ) : null}
                    </div>
                  </>
                ) : null}

                {state.activeSheet === 'footer' ? (
                  <>
                    <div className="sticky top-0 z-20 border-b border-slate-200/60 bg-white/90 px-4 py-3 backdrop-blur-sm">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold tracking-tight text-slate-900">
                          Footer
                        </h3>
                        <Badge
                          variant="outline"
                          className="rounded-md border-transparent bg-slate-100 text-slate-600"
                        >
                          {footerRows.length}
                        </Badge>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Strukturierter Dokument-Footer als einzelne Card.
                      </p>
                    </div>

                    <div className="flex-1 overflow-y-auto px-3 py-2">
                      <div className="rounded-md border border-slate-200/80 bg-white">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 px-3 py-2">
                          <div>
                            <h4 className="text-xs font-semibold text-slate-800">
                              Footer-Inhalte
                            </h4>
                            <p className="text-[11px] text-slate-500">
                              {normalizedFooterRows.length} / {FOOTER_MAX_ROWS}{' '}
                              Zeilen
                            </p>
                          </div>
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            className="h-7 rounded-md px-2 text-xs"
                            onClick={() => addFooterRow()}
                            disabled={
                              normalizedFooterRows.length >= FOOTER_MAX_ROWS
                            }
                          >
                            <Plus className="size-3.5" />
                            Zeile
                          </Button>
                        </div>

                        <div className="space-y-2 px-2 py-2">
                          {normalizedFooterRows.length === 0 ? (
                            <div className="rounded-md border border-dashed border-slate-200 bg-slate-50 px-2 py-3 text-[11px] text-slate-500">
                              Noch keine Zeile vorhanden.
                            </div>
                          ) : null}

                          {normalizedFooterRows.map((row, rowIndex) => {
                            const selectedSeparator = getFooterSeparatorForUi(
                              row.separator
                            );

                            return (
                              <div
                                key={row.id}
                                className={classes(
                                  'rounded-md border px-2 py-2 transition-colors',
                                  activeFooterRowId === row.id
                                    ? 'border-sky-300 bg-sky-50/70'
                                    : 'border-slate-200 bg-white'
                                )}
                                onClick={() => setActiveFooterRowId(row.id)}
                                onDragOver={handleFooterFieldDragOver}
                                onDrop={(event) =>
                                  handleFooterFieldDrop(row.id, event)
                                }
                              >
                                <div className="flex flex-wrap items-start justify-between gap-2">
                                  <span className="text-[11px] font-medium text-slate-600">
                                    Zeile {rowIndex + 1}
                                  </span>

                                  <div className="flex flex-wrap items-center gap-1">
                                    <Popover
                                      open={
                                        footerSeparatorPickerRowId === row.id
                                      }
                                      onOpenChange={(open) => {
                                        setFooterSeparatorPickerRowId(
                                          open ? row.id : null
                                        );
                                        if (open) {
                                          setActiveFooterRowId(row.id);
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 min-w-12 rounded-md px-2 text-xs"
                                        >
                                          {getFooterSeparatorLabel(
                                            selectedSeparator
                                          )}
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        side="bottom"
                                        align="start"
                                        className="w-36 p-0"
                                      >
                                        <Command>
                                          <CommandList className="max-h-56">
                                            <CommandGroup heading="Trennzeichen">
                                              {FOOTER_SEPARATOR_OPTIONS.map(
                                                (option) => (
                                                  <CommandItem
                                                    key={option.value}
                                                    value={option.label}
                                                    onSelect={() => {
                                                      updateFooterRowSeparator(
                                                        row.id,
                                                        option.value
                                                      );
                                                      setFooterSeparatorPickerRowId(
                                                        null
                                                      );
                                                    }}
                                                  >
                                                    <span className="text-xs">
                                                      {option.label}
                                                    </span>
                                                  </CommandItem>
                                                )
                                              )}
                                            </CommandGroup>
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>

                                    <Popover
                                      open={footerFieldPickerRowId === row.id}
                                      onOpenChange={(open) => {
                                        setFooterFieldPickerRowId(
                                          open ? row.id : null
                                        );
                                        if (open) {
                                          setActiveFooterRowId(row.id);
                                        }
                                      }}
                                    >
                                      <PopoverTrigger asChild>
                                        <Button
                                          type="button"
                                          size="sm"
                                          variant="outline"
                                          className="h-7 rounded-md px-2 text-xs"
                                        >
                                          Feld
                                        </Button>
                                      </PopoverTrigger>
                                      <PopoverContent
                                        side="bottom"
                                        align="start"
                                        className="w-[min(22rem,calc(100vw-7rem))] p-0"
                                      >
                                        <Command>
                                          <CommandInput placeholder="Feld suchen..." />
                                          <CommandList className="max-h-72">
                                            <CommandEmpty>
                                              Keine Felder gefunden.
                                            </CommandEmpty>
                                            {footerFieldsByCategory.map(
                                              (category) => (
                                                <CommandGroup
                                                  key={category.key}
                                                  heading={category.label}
                                                >
                                                  {category.fields.map(
                                                    (field) => (
                                                      <CommandItem
                                                        key={field.key}
                                                        value={`${field.label} ${field.key}`}
                                                        onSelect={() => {
                                                          insertFooterFieldToken(
                                                            row.id,
                                                            field.key
                                                          );
                                                          setFooterFieldPickerRowId(
                                                            null
                                                          );
                                                        }}
                                                        className="items-start py-2"
                                                      >
                                                        <div className="min-w-0">
                                                          <div className="truncate text-xs font-medium text-slate-900">
                                                            {field.label}
                                                          </div>
                                                          <div className="truncate text-[11px] text-slate-500">
                                                            {createFieldToken(
                                                              field.key
                                                            )}
                                                          </div>
                                                        </div>
                                                      </CommandItem>
                                                    )
                                                  )}
                                                </CommandGroup>
                                              )
                                            )}
                                          </CommandList>
                                        </Command>
                                      </PopoverContent>
                                    </Popover>

                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="size-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                      onClick={() =>
                                        addFooterTextSegment(row.id)
                                      }
                                    >
                                      <Plus className="size-3.5" />
                                      <span className="sr-only">
                                        Input hinzufügen
                                      </span>
                                    </Button>
                                    <Button
                                      type="button"
                                      size="icon"
                                      variant="ghost"
                                      className="size-7 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                      onClick={() => removeFooterRow(row.id)}
                                    >
                                      <Trash2 className="size-3.5" />
                                      <span className="sr-only">
                                        Zeile entfernen
                                      </span>
                                    </Button>
                                  </div>
                                </div>

                                <div className="mt-2 flex min-w-0 flex-wrap gap-1.5">
                                  {row.segments.map((segment) => (
                                    <div
                                      key={segment.id}
                                      className="flex w-full max-w-full min-w-0 items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2 py-1"
                                    >
                                      <Input
                                        value={segment.text}
                                        onChange={(event) =>
                                          updateFooterSegmentText(
                                            row.id,
                                            segment.id,
                                            event.target.value
                                          )
                                        }
                                        onFocus={() =>
                                          setActiveFooterRowId(row.id)
                                        }
                                        placeholder="Text oder Platzhalter"
                                        className="h-7 min-w-0 border-0 bg-transparent px-0 text-xs shadow-none focus-visible:ring-0"
                                      />
                                      <Button
                                        type="button"
                                        size="icon"
                                        variant="ghost"
                                        className="size-6 rounded-md text-slate-500 hover:bg-slate-100 hover:text-slate-700"
                                        onClick={() =>
                                          removeFooterSegment(
                                            row.id,
                                            segment.id
                                          )
                                        }
                                      >
                                        <Trash2 className="size-3" />
                                        <span className="sr-only">
                                          Input entfernen
                                        </span>
                                      </Button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </>
                ) : null}
              </SheetContent>
            </Sheet>
          </main>
        </div>
      </div>
    </TooltipProvider>
  );
}

export default EditorLayout;
