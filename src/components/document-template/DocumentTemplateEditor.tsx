'use client';

import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type DragEvent,
} from 'react';
import { useRouter } from 'next/navigation';
import { EditorContent, useEditor, type JSONContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import TextAlign from '@tiptap/extension-text-align';
import { TextStyle } from '@tiptap/extension-text-style';
import Placeholder from '@tiptap/extension-placeholder';
import { Table } from '@tiptap/extension-table';
import TableRow from '@tiptap/extension-table-row';
import TableHeader from '@tiptap/extension-table-header';
import TableCell from '@tiptap/extension-table-cell';
import { Extension, mergeAttributes, Node } from '@tiptap/core';
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
  Heading1,
  Highlighter,
  ImageIcon,
  Info,
  Italic,
  List,
  ListOrdered,
  Minus,
  MoreHorizontal,
  PanelLeftClose,
  PanelLeftOpen,
  PanelBottom,
  PanelTop,
  PanelRightClose,
  PanelRightOpen,
  Plus,
  Save,
  Search,
  Signature,
  Table2,
  Trash2,
  Type,
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
} from '@/features/document-template/server/document-template.actions';
import { createDefaultDocumentTemplateContent } from '@/features/document-template/lib/document-template-defaults';
import { DocumentTemplatePreview } from './DocumentTemplatePreview';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
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
const ALIGNMENT_OPTIONS: Array<'left' | 'center' | 'right'> = [
  'left',
  'center',
  'right',
];
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

function spacingStyleFromAttributes(
  attributes: Record<string, unknown>
): string | undefined {
  const styles = [
    typeof attributes.spacingTop === 'number'
      ? `margin-top: ${attributes.spacingTop}px`
      : null,
    typeof attributes.spacingBottom === 'number'
      ? `margin-bottom: ${attributes.spacingBottom}px`
      : null,
  ].filter((style): style is string => Boolean(style));

  return styles.length > 0 ? styles.join('; ') : undefined;
}

const DocumentBlockStyleExtension = Extension.create({
  name: 'documentBlockStyle',

  addGlobalAttributes() {
    return [
      {
        types: ['paragraph', 'heading', 'infoBox'],
        attributes: {
          spacingTop: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute('data-spacing-top');
              return value ? Number(value) : null;
            },
            renderHTML: (attributes) => {
              const style = spacingStyleFromAttributes(attributes);
              return {
                'data-spacing-top': attributes.spacingTop,
                style,
              };
            },
          },
          spacingBottom: {
            default: null,
            parseHTML: (element) => {
              const value = element.getAttribute('data-spacing-bottom');
              return value ? Number(value) : null;
            },
            renderHTML: (attributes) => {
              const style = spacingStyleFromAttributes(attributes);
              return {
                'data-spacing-bottom': attributes.spacingBottom,
                style,
              };
            },
          },
        },
      },
    ];
  },
});

const DynamicFieldNode = Node.create({
  name: 'dynamicField',
  group: 'inline',
  inline: true,
  atom: true,

  addAttributes() {
    return {
      fieldKey: { default: '' },
      label: { default: 'Dynamisches Feld' },
    };
  },

  parseHTML() {
    return [{ tag: 'span[data-dynamic-field]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'span',
      mergeAttributes(HTMLAttributes, {
        'data-dynamic-field': HTMLAttributes.fieldKey,
        class: 'document-field-chip',
      }),
      HTMLAttributes.label,
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const dom = document.createElement('span');
      dom.className = 'document-field-chip';
      dom.dataset.dynamicField =
        typeof node.attrs.fieldKey === 'string' ? node.attrs.fieldKey : '';
      dom.textContent =
        typeof node.attrs.label === 'string'
          ? node.attrs.label
          : 'Dynamisches Feld';
      return { dom };
    };
  },
});

const InfoBoxNode = Node.create({
  name: 'infoBox',
  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'section[data-document-info-box]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'section',
      mergeAttributes(HTMLAttributes, {
        'data-document-info-box': 'true',
        class: 'document-info-box',
      }),
      0,
    ];
  },
});

const PageBreakNode = Node.create({
  name: 'pageBreak',
  group: 'block',
  atom: true,

  parseHTML() {
    return [{ tag: 'div[data-document-page-break]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      mergeAttributes(HTMLAttributes, {
        'data-document-page-break': 'true',
        class: 'document-page-break',
      }),
      'Seitenumbruch',
    ];
  },
});

const TemplateImageNode = Node.create({
  name: 'templateImage',
  group: 'block',
  atom: true,
  draggable: true,

  addAttributes() {
    return {
      src: { default: '' },
      alt: { default: 'Bild' },
      width: { default: 160 },
      height: { default: 80 },
      align: { default: 'left' },
      keepAspectRatio: { default: true },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-template-image]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'img',
      mergeAttributes(HTMLAttributes, {
        'data-template-image': 'true',
        src: HTMLAttributes.src,
        alt: HTMLAttributes.alt,
        class: `document-template-image document-template-image-${HTMLAttributes.align}`,
        style: `width: ${HTMLAttributes.width}px; height: ${HTMLAttributes.height}px; object-fit: contain;`,
      }),
    ];
  },

  addNodeView() {
    return ({ node }) => {
      const wrapper = document.createElement('div');
      const align =
        node.attrs.align === 'center' || node.attrs.align === 'right'
          ? node.attrs.align
          : 'left';
      wrapper.className = `document-template-image-wrapper document-template-image-wrapper-${align}`;
      const src = typeof node.attrs.src === 'string' ? node.attrs.src : '';

      if (src.startsWith('{{')) {
        const placeholder = document.createElement('span');
        placeholder.className = 'document-template-image-placeholder';
        placeholder.textContent =
          typeof node.attrs.alt === 'string' ? node.attrs.alt : 'Bild';
        wrapper.append(placeholder);
        return { dom: wrapper };
      }

      const image = document.createElement('img');
      image.className = 'document-template-image';
      image.src = src;
      image.alt = typeof node.attrs.alt === 'string' ? node.attrs.alt : 'Bild';
      image.style.width =
        typeof node.attrs.width === 'number'
          ? `${node.attrs.width}px`
          : '160px';
      image.style.height =
        typeof node.attrs.height === 'number'
          ? `${node.attrs.height}px`
          : '80px';
      image.style.objectFit = 'contain';

      wrapper.append(image);
      return { dom: wrapper };
    };
  },
});

const blockGroups = [
  {
    label: 'Basis',
    items: [
      {
        id: 'heading',
        label: 'Überschrift',
        description: 'Großer Abschnittstitel für Ihr Dokument.',
        Icon: Heading1,
      },
      {
        id: 'paragraph',
        label: 'Text',
        description: 'Fließtext, den Sie direkt auf der Seite bearbeiten.',
        Icon: Type,
      },
      {
        id: 'divider',
        label: 'Trennlinie',
        description: 'Dezente Linie zur optischen Trennung.',
        Icon: Minus,
      },
    ],
  },
  {
    label: 'Layout',
    items: [
      {
        id: 'infoBox',
        label: 'Infobox',
        description: 'Hervorgehobener Bereich für wichtige Informationen.',
        Icon: Info,
      },
      {
        id: 'table',
        label: 'Datenübersicht',
        description: 'Strukturierte Übersicht mit Zeilen und Spalten.',
        Icon: Table2,
      },
      {
        id: 'columns',
        label: 'Zweispaltig',
        description: 'Zwei zusammengehörige Textspalten.',
        Icon: Highlighter,
      },
    ],
  },
  {
    label: 'Dokument',
    items: [
      {
        id: 'header',
        label: 'Kopfbereich',
        description: 'Aktiviert und bearbeitet den festen Kopfbereich.',
        Icon: PanelTop,
      },
      {
        id: 'footer',
        label: 'Fußbereich',
        description: 'Aktiviert und bearbeitet den festen Fußbereich.',
        Icon: PanelBottom,
      },
      {
        id: 'pageNumber',
        label: 'Seitenzahl',
        description: 'Fügt eine Seitenzahl in den Fußbereich ein.',
        Icon: FileText,
      },
      {
        id: 'signature',
        label: 'Signaturbereich',
        description: 'Grußformel mit Name und Funktion.',
        Icon: Signature,
      },
      {
        id: 'pageBreak',
        label: 'Seitenumbruch',
        description: 'Beginnt den folgenden Inhalt auf einer neuen Seite.',
        Icon: List,
      },
    ],
  },
  {
    label: 'Medien',
    items: [
      {
        id: 'image',
        label: 'Bild',
        description: 'Fügt ein hochgeladenes Bild in den aktiven Bereich ein.',
        Icon: ImageIcon,
      },
      {
        id: 'logo',
        label: 'Logo',
        description: 'Fügt das Organisationslogo in den Kopfbereich ein.',
        Icon: ImageIcon,
      },
    ],
  },
];

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

const fieldTypeLabels: Record<
  DocumentTemplateFieldDefinition['dataType'],
  string
> = {
  text: 'Text',
  number: 'Zahl',
  date: 'Datum',
  time: 'Uhrzeit',
  currency: 'Betrag',
  boolean: 'Ja/Nein',
  select: 'Auswahl',
  multi_select: 'Mehrfach',
  person: 'Person',
  list: 'Liste',
  email: 'E-Mail',
  phone: 'Telefon',
  rich_text: 'Rich Text',
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

function countNodesByType(
  node: JSONContent | DocumentTemplateRichTextNode | undefined,
  type: string
): number {
  if (!node) return 0;

  const ownCount = node.type === type ? 1 : 0;
  const childCount =
    node.content?.reduce(
      (sum, child) => sum + countNodesByType(child, type),
      0
    ) ?? 0;

  return ownCount + childCount;
}

function FieldLibrary({
  fields,
  groupLabels,
  query,
  onQueryChange,
  onInsert,
}: {
  fields: DocumentTemplateFieldDefinition[];
  groupLabels: Record<DocumentTemplateFieldDefinition['group'], string>;
  query: string;
  onQueryChange: (value: string) => void;
  onInsert: (field: DocumentTemplateFieldDefinition) => void;
}) {
  const filteredFields = fields.filter((field) =>
    `${field.label} ${field.description} ${field.key}`
      .toLowerCase()
      .includes(query.toLowerCase())
  );

  return (
    <div className="flex flex-col gap-3">
      <div className="relative">
        <Search className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Dynamische Felder suchen"
          className="pl-9"
        />
      </div>
      {Object.entries(groupLabels).map(([group, label]) => {
        const groupFields = filteredFields.filter(
          (field) => field.group === group
        );
        if (groupFields.length === 0) return null;

        return (
          <div key={group} className="flex flex-col gap-2">
            <p className="text-muted-foreground text-xs font-medium">{label}</p>
            <div className="flex flex-wrap gap-2">
              {groupFields.map((field) => (
                <button
                  key={field.key}
                  type="button"
                  draggable
                  className="bg-secondary text-secondary-foreground hover:bg-secondary/80 flex cursor-grab items-center gap-1.5 rounded-md px-2 py-1 text-left text-xs font-normal"
                  title={field.description}
                  onDragStart={(event) => {
                    event.dataTransfer.effectAllowed = 'copy';
                    event.dataTransfer.setData(
                      DOCUMENT_FIELD_DRAG_MIME,
                      field.key
                    );
                  }}
                  onClick={() => onInsert(field)}
                >
                  <span>{field.label}</span>
                  <Badge variant="outline" className="h-4 px-1 text-[10px]">
                    {fieldTypeLabels[field.dataType]}
                  </Badge>
                </button>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
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
  const [measuredBodyHeight, setMeasuredBodyHeight] = useState(0);
  const imageInputRef = useRef<HTMLInputElement | null>(null);
  const bodyMeasureRef = useRef<HTMLDivElement | null>(null);
  const isAutoPaginatingRef = useRef(false);
  const bodyUserInteractionRef = useRef(false);

  const previewFields = useMemo(
    () => createSampleResolvedFields(fields),
    [fields]
  );
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
  const editor = useEditor({
    immediatelyRender: false,
    extensions: createEditorExtensions(),
    content:
      content.document ?? createDefaultDocumentTemplateContent().document,
    editorProps: {
      attributes: {
        class:
          'document-template-prose document-template-body-editor min-h-[720px] outline-none focus:outline-none',
      },
      handleDOMEvents: {
        focus: () => {
          setActiveArea('body');
          return false;
        },
        keydown: () => {
          bodyUserInteractionRef.current = true;
          return false;
        },
        input: () => {
          bodyUserInteractionRef.current = true;
          return false;
        },
      },
    },
    onUpdate: ({ editor }) => {
      markDirty();
      setContent((current) => ({
        ...current,
        document: toRichTextNode(editor.getJSON()),
      }));
    },
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
            blocks: current.page.header.blocks.map((block) =>
              block.id === headerTextBlock.id
                ? { ...block, richText: nextRichText }
                : block
            ),
          },
        },
      }));
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
  });

  const activeEditor =
    activeArea === 'header'
      ? headerEditor
      : activeArea === 'footer'
        ? footerEditor
        : editor;

  function currentContent(): DocumentTemplateContent {
    return {
      ...content,
      meta: { ...content.meta, description },
      document: editor ? toRichTextNode(editor.getJSON()) : content.document,
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
    if (!editor) return;

    const chain = editor.chain().focus();
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
        editor
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
        toast.success('Logo wurde im Kopfbereich eingefügt.');
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
      case 'pageBreak':
        chain
          .insertContent({
            type: 'pageBreak',
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

  function insertImageInEditor(args: {
    targetArea: EditableArea;
    src: string;
    alt: string;
    width?: number;
    height?: number;
    align?: 'left' | 'center' | 'right';
  }) {
    const targetEditor =
      args.targetArea === 'header'
        ? headerEditor
        : args.targetArea === 'footer'
          ? footerEditor
          : editor;

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

    targetEditor
      .chain()
      .focus()
      .insertContent({
        type: 'templateImage',
        attrs: {
          src: args.src,
          alt: args.alt,
          width: args.width ?? (args.targetArea === 'body' ? 220 : 130),
          height: args.height ?? (args.targetArea === 'body' ? 120 : 48),
          align: args.align ?? 'left',
          keepAspectRatio: true,
        },
      })
      .run();
  }

  function insertOrganizationLogo() {
    setActiveArea('header');
    insertImageInEditor({
      targetArea: 'header',
      src: '{{organizationLogoUrl}}',
      alt: 'Organisationslogo',
      width: 130,
      height: 48,
      align: 'left',
    });
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

      insertImageInEditor({
        targetArea: activeArea,
        src: result.url,
        alt: file.name,
        align: activeArea === 'footer' ? 'center' : 'left',
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
    }
  }

  function updateSelectedImageAttribute(
    attrs: Partial<{
      alt: string;
      width: number;
      height: number;
      align: 'left' | 'center' | 'right';
      keepAspectRatio: boolean;
    }>
  ) {
    if (!activeEditor?.isActive('templateImage')) {
      toast.info('Wählen Sie zuerst ein Bild aus.');
      return;
    }

    activeEditor.chain().focus().updateAttributes('templateImage', attrs).run();
  }

  function handleFieldDrop(
    event: DragEvent<HTMLDivElement>,
    targetArea: EditableArea
  ) {
    const fieldKey = event.dataTransfer.getData(DOCUMENT_FIELD_DRAG_MIME);
    if (!fieldKey) return;

    event.preventDefault();
    const field = fieldByKey.get(fieldKey);
    const targetEditor =
      targetArea === 'header'
        ? headerEditor
        : targetArea === 'footer'
          ? footerEditor
          : editor;

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
    if (!editor) return;

    setActiveArea('body');
    editor.chain().focus('end').insertContent({ type: 'pageBreak' }).run();
    bodyUserInteractionRef.current = false;
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

  useEffect(() => {
    const node = bodyMeasureRef.current;
    if (!node) return;

    const updateMeasuredHeight = () => {
      setMeasuredBodyHeight(node.scrollHeight);
    };
    updateMeasuredHeight();

    const observer = new ResizeObserver(updateMeasuredHeight);
    observer.observe(node);
    return () => observer.disconnect();
  }, [editor, content.page]);

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
  const logicalPageCount = countNodesByType(content.document, 'pageBreak') + 1;
  const pageCount = Math.max(
    logicalPageCount,
    Math.ceil(Math.max(measuredBodyHeight, bodyAreaHeightPx) / bodyAreaHeightPx)
  );
  useEffect(() => {
    if (!editor || activeArea !== 'body') return;
    if (!bodyUserInteractionRef.current) return;

    const availableHeight = bodyAreaHeightPx * logicalPageCount;
    if (measuredBodyHeight <= availableHeight + 12) return;
    if (isAutoPaginatingRef.current) return;

    isAutoPaginatingRef.current = true;
    editor.chain().focus().insertContent({ type: 'pageBreak' }).run();
    bodyUserInteractionRef.current = false;
    toast.info('Neue Seite wurde erstellt.');

    window.requestAnimationFrame(() => {
      isAutoPaginatingRef.current = false;
    });
  }, [
    activeArea,
    bodyAreaHeightPx,
    editor,
    logicalPageCount,
    measuredBodyHeight,
  ]);
  const pageIndexes = Array.from({ length: pageCount }, (_, index) => index);
  const saveStatusLabel =
    saveStatus === 'saving'
      ? 'Speichert...'
      : saveStatus === 'saved'
        ? 'Gespeichert'
        : 'Nicht gespeichert';
  const editorGridColumns = `${leftSidebarCollapsed ? '48px' : '270px'} minmax(620px,1fr) ${
    rightSidebarCollapsed ? '48px' : '340px'
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
                title="Fett"
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
                title="Kursiv"
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
                title="Unterstrichen"
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
                aria-label="Schriftgröße"
                title="Schriftgröße ändern"
              />
              <Separator orientation="vertical" className="h-6" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" title="Ausrichtung ändern">
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
                  <Button size="sm" variant="ghost" title="Liste einfügen">
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
                  <Button size="sm" variant="ghost" title="Textfarbe ändern">
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
                title="Abstand oben"
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
                title="Abstand unten"
              />
              <Separator orientation="vertical" className="h-6" />
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="ghost" title="Weitere Aktionen">
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
                <Popover>
                  <PopoverTrigger asChild>
                    <Button size="sm" variant="outline">
                      <ImageIcon data-icon="inline-start" />
                      Bild
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-80">
                    <div className="flex flex-col gap-3">
                      <p className="text-sm font-medium">Bild-Eigenschaften</p>
                      <div className="grid grid-cols-2 gap-2">
                        <div className="flex flex-col gap-1.5">
                          <Label>Breite</Label>
                          <Input
                            type="number"
                            min={24}
                            max={640}
                            value={selectedImageWidth}
                            onChange={(event) =>
                              updateSelectedImageAttribute({
                                width: Number(event.target.value),
                              })
                            }
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <Label>Höhe</Label>
                          <Input
                            type="number"
                            min={16}
                            max={480}
                            value={selectedImageHeight}
                            onChange={(event) =>
                              updateSelectedImageAttribute({
                                height: Number(event.target.value),
                              })
                            }
                          />
                        </div>
                      </div>
                      <div className="flex flex-col gap-1.5">
                        <Label>Alternativtext</Label>
                        <Input
                          value={selectedImageAlt}
                          onChange={(event) =>
                            updateSelectedImageAttribute({
                              alt: event.target.value,
                            })
                          }
                        />
                      </div>
                      <div className="grid grid-cols-3 gap-2">
                        {ALIGNMENT_OPTIONS.map((align) => (
                          <Button
                            key={align}
                            type="button"
                            size="sm"
                            variant={
                              selectedImageAlign === align
                                ? 'secondary'
                                : 'outline'
                            }
                            onClick={() =>
                              updateSelectedImageAttribute({ align })
                            }
                          >
                            {align === 'left'
                              ? 'Links'
                              : align === 'center'
                                ? 'Mitte'
                                : 'Rechts'}
                          </Button>
                        ))}
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <Label>Seitenverhältnis beibehalten</Label>
                        <Switch
                          checked={selectedImageKeepAspectRatio}
                          onCheckedChange={(checked) =>
                            updateSelectedImageAttribute({
                              keepAspectRatio: checked,
                            })
                          }
                        />
                      </div>
                    </div>
                  </PopoverContent>
                </Popover>
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
                title="Verkleinern"
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
                title="Vergrößern"
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
            <div className="bg-background flex min-h-0 flex-col items-center rounded-md border-0 py-2 shadow-sm">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Bausteine einblenden"
                onClick={() => setLeftSidebarCollapsed(false)}
              >
                <PanelLeftOpen />
              </Button>
            </div>
          ) : (
            <Card className="min-h-0 border-0 shadow-sm">
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
                  title="Bausteine ausblenden"
                  onClick={() => setLeftSidebarCollapsed(true)}
                >
                  <PanelLeftClose />
                </Button>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-col gap-4 overflow-auto">
                {blockGroups.map((group) => (
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
            </Card>
          )}

          <ContextMenu>
            <ContextMenuTrigger asChild>
              <main className="min-h-0 overflow-auto rounded-md bg-[#e3e6ea]">
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
                          className={`document-template-page bg-background relative grid shrink-0 shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5 ${
                            pageIndex === 0
                              ? 'z-10 overflow-visible'
                              : 'z-0 overflow-hidden'
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
                              className="bg-muted/20 outline-border relative flex flex-col justify-center outline outline-1 outline-dashed"
                              onClick={() => setActiveArea('header')}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) =>
                                handleFieldDrop(event, 'header')
                              }
                            >
                              <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
                                Kopfbereich
                              </span>
                              <div className="px-2 pt-4">
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
                            className="outline-border relative outline outline-1 outline-dashed"
                            onClick={() => setActiveArea('body')}
                            onDragOver={(event) => event.preventDefault()}
                            onDrop={(event) => handleFieldDrop(event, 'body')}
                          >
                            <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
                              Dokumentinhalt
                            </span>
                            {pageIndex === 0 ? (
                              <div ref={bodyMeasureRef} className="pt-5">
                                <EditorContent editor={editor} />
                              </div>
                            ) : null}
                          </div>

                          {content.page.footer.enabled ? (
                            <div
                              className="bg-muted/20 outline-border relative flex flex-col justify-center outline outline-1 outline-dashed"
                              onClick={() => setActiveArea('footer')}
                              onDragOver={(event) => event.preventDefault()}
                              onDrop={(event) =>
                                handleFieldDrop(event, 'footer')
                              }
                            >
                              <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
                                Fußbereich
                              </span>
                              <div className="px-2 pt-4">
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
                        title="Fügt eine neue Seite hinzu"
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
              {hasSelectedImage ? (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Bild</ContextMenuSubTrigger>
                  <ContextMenuSubContent>
                    <ContextMenuItem
                      onClick={() => imageInputRef.current?.click()}
                    >
                      Bild ersetzen
                    </ContextMenuItem>
                    {ALIGNMENT_OPTIONS.map((align) => (
                      <ContextMenuItem
                        key={align}
                        onClick={() => updateSelectedImageAttribute({ align })}
                      >
                        {align === 'left'
                          ? 'Links'
                          : align === 'center'
                            ? 'Mitte'
                            : 'Rechts'}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              ) : null}
              <ContextMenuSeparator />
              <ContextMenuItem
                variant="destructive"
                onClick={deleteCurrentBlock}
              >
                Löschen
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {rightSidebarCollapsed ? (
            <div className="bg-background flex min-h-0 flex-col items-center rounded-md border-0 py-2 shadow-sm">
              <Button
                type="button"
                size="icon"
                variant="ghost"
                title="Dynamische Felder einblenden"
                onClick={() => setRightSidebarCollapsed(false)}
              >
                <PanelRightOpen />
              </Button>
            </div>
          ) : (
            <Card className="min-h-0 border-0 shadow-sm">
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
                  title="Dynamische Felder ausblenden"
                  onClick={() => setRightSidebarCollapsed(true)}
                >
                  <PanelRightClose />
                </Button>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-col overflow-auto">
                <FieldLibrary
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

        <style jsx global>{`
          .document-template-page .ProseMirror {
            min-height: 0;
            outline: none;
            color: hsl(var(--foreground));
            font-size: 16px;
            line-height: 1.7;
          }

          .document-template-page .document-template-body-editor {
            min-height: 720px;
          }

          .document-template-page .document-template-area-editor {
            min-height: 1.5rem;
            font-size: 12px;
            line-height: 1.35;
          }

          .document-template-page .ProseMirror p {
            margin: 0 0 1rem;
          }

          .document-template-page .document-template-area-editor p {
            margin: 0;
          }

          .document-template-page .ProseMirror h1 {
            font-size: 2rem;
            line-height: 1.2;
            margin: 0 0 1.25rem;
            font-weight: 650;
          }

          .document-template-page .ProseMirror h2 {
            font-size: 1.45rem;
            line-height: 1.25;
            margin: 0 0 1rem;
            font-weight: 620;
          }

          .document-template-page .ProseMirror p:hover,
          .document-template-page .ProseMirror h1:hover,
          .document-template-page .ProseMirror h2:hover,
          .document-info-box:hover {
            outline: 1px solid hsl(var(--ring) / 0.25);
            outline-offset: 4px;
          }

          .document-template-page .ProseMirror ul,
          .document-template-page .ProseMirror ol {
            margin: 0 0 1rem 1.4rem;
            padding: 0;
          }

          .document-template-page .ProseMirror hr {
            border: 0;
            border-top: 1px solid hsl(var(--border));
            margin: 1.5rem 0;
          }

          .document-template-page .ProseMirror table {
            border-collapse: collapse;
            margin: 1rem 0;
            width: 100%;
          }

          .document-template-page .ProseMirror td,
          .document-template-page .ProseMirror th {
            border: 1px solid hsl(var(--border));
            padding: 0.5rem 0.65rem;
            vertical-align: top;
          }

          .document-template-page .ProseMirror th {
            background: hsl(var(--muted));
            font-weight: 600;
          }

          .document-info-box {
            background: hsl(var(--muted) / 0.55);
            border-radius: 0.5rem;
            margin: 1rem 0;
            padding: 1rem;
          }

          .document-field-chip {
            display: inline-flex;
            align-items: center;
            border-radius: 0.375rem;
            background: hsl(var(--secondary));
            color: hsl(var(--secondary-foreground));
            font-size: 0.875em;
            line-height: 1;
            padding: 0.18rem 0.42rem;
            white-space: nowrap;
          }

          .document-template-page
            .ProseMirror-selectednode.document-field-chip {
            outline: 2px solid hsl(var(--ring));
          }

          .document-page-break {
            align-items: center;
            color: hsl(var(--muted-foreground));
            display: flex;
            font-size: 0.75rem;
            gap: 0.75rem;
            margin: 2rem 0;
            min-height: 680px;
          }

          .document-page-break::before,
          .document-page-break::after {
            background: hsl(var(--border));
            content: '';
            flex: 1;
            height: 1px;
          }

          .document-template-image-wrapper {
            display: flex;
            margin: 0.5rem 0;
          }

          .document-template-image-wrapper-left {
            justify-content: flex-start;
          }

          .document-template-image-wrapper-center {
            justify-content: center;
          }

          .document-template-image-wrapper-right {
            justify-content: flex-end;
          }

          .document-template-image {
            max-width: 100%;
          }

          .document-template-image-placeholder {
            border: 1px dashed hsl(var(--border));
            border-radius: 0.375rem;
            color: hsl(var(--muted-foreground));
            display: inline-flex;
            font-size: 0.75rem;
            padding: 0.35rem 0.6rem;
          }

          .ProseMirror-selectednode .document-template-image,
          .ProseMirror-selectednode.document-template-image {
            outline: 2px solid hsl(var(--ring));
            outline-offset: 3px;
          }
        `}</style>
      </div>
    </TooltipProvider>
  );
}
