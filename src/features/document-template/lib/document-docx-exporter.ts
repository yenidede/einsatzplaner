import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  Header,
  HorizontalPositionRelativeFrom,
  ImageRun,
  LevelFormat,
  Packer,
  PageNumber,
  PageOrientation,
  PageBreak,
  Paragraph,
  ShadingType,
  Table,
  TableCell,
  TableRow,
  Tab,
  TextRun,
  TextWrappingType,
  VerticalPositionRelativeFrom,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import type { IRunOptions } from 'docx';
import type {
  DocumentTemplateBlock,
  DocumentTemplateContent,
  DocumentTemplateHorizontalAlignment,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import {
  blockToPlainText,
  missingTemplateValue,
  normalizeTemplateText,
  resolveTemplateText,
} from './document-template-renderer';
import { getMarkAttr, hasMark } from './document-rich-text';

const FONT_FAMILY = 'Arial';
const BODY_FONT_SIZE_PX = 16;
const BODY_LINE_HEIGHT_PX = 27;
const BODY_COLOR = '111827';
const MUTED_COLOR = '475569';
const BORDER_COLOR = 'D4D4D8';
const INFO_BOX_FILL = 'F4F4F5';
const DEFAULT_PARAGRAPH_SPACING_BOTTOM_PX = 16;
const DEFAULT_HEADER_FOOTER_FONT_SIZE_PX = 12;

type DocxChild = Paragraph | Table;
type ImageType = 'png' | 'jpg' | 'gif' | 'bmp';

function textParagraph(text: string, fontSizePx = BODY_FONT_SIZE_PX) {
  const lines = normalizeTemplateText(text).split('\n');
  return new Paragraph({
    children: lines.flatMap((line, index) => [
      ...(index > 0 ? [new TextRun({ text: '', break: 1 })] : []),
      run({ text: line, fontSizePx }),
    ]),
    spacing: paragraphSpacing({
      spacingBottom: DEFAULT_PARAGRAPH_SPACING_BOTTOM_PX,
    }),
  });
}

function run(args: {
  text?: string;
  fontSizePx?: number;
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  color?: string;
  children?: IRunOptions['children'];
}) {
  return new TextRun({
    text: args.text ? normalizeTemplateText(args.text) : args.text,
    children: args.children,
    font: FONT_FAMILY,
    size: pxToHalfPoints(args.fontSizePx ?? BODY_FONT_SIZE_PX),
    color: args.color ?? BODY_COLOR,
    bold: args.bold,
    italics: args.italics,
    underline: args.underline ? {} : undefined,
  });
}

function docxAlignment(align: DocumentTemplateHorizontalAlignment | undefined) {
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function pxToHalfPoints(value: number): number {
  return Math.round(value * 1.5);
}

function pxToTwip(value: number): number {
  return Math.round(value * 15);
}

function pxToEmu(value: number): number {
  return Math.round(value * 9525);
}

function mmToPx(value: number): number {
  return Math.round((value * 794) / 210);
}

function numberAttr(
  node: DocumentTemplateRichTextNode,
  attr: string
): number | undefined {
  const value = node.attrs?.[attr];
  return typeof value === 'number' && Number.isFinite(value)
    ? value
    : undefined;
}

function paragraphSpacing(
  nodeOrSpacing:
    | DocumentTemplateRichTextNode
    | { spacingTop?: number; spacingBottom?: number },
  fallbackBottomPx?: number
) {
  const spacingTop =
    'type' in nodeOrSpacing
      ? numberAttr(nodeOrSpacing, 'spacingTop')
      : nodeOrSpacing.spacingTop;
  const spacingBottom =
    'type' in nodeOrSpacing
      ? numberAttr(nodeOrSpacing, 'spacingBottom')
      : nodeOrSpacing.spacingBottom;
  const before =
    typeof spacingTop === 'number' ? pxToTwip(spacingTop) : undefined;
  const after =
    typeof spacingBottom === 'number'
      ? pxToTwip(spacingBottom)
      : typeof fallbackBottomPx === 'number'
        ? pxToTwip(fallbackBottomPx)
        : undefined;

  return before || after
    ? { before, after, line: pxToTwip(BODY_LINE_HEIGHT_PX) }
    : { line: pxToTwip(BODY_LINE_HEIGHT_PX) };
}

function indentFromNode(node: DocumentTemplateRichTextNode) {
  const indent = numberAttr(node, 'indent');
  return typeof indent === 'number' ? { left: pxToTwip(indent) } : undefined;
}

function alignmentFromNode(node: DocumentTemplateRichTextNode) {
  const textAlign = node.attrs?.textAlign;
  if (textAlign === 'center') return AlignmentType.CENTER;
  if (textAlign === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function dataUrlToImage(value: string): {
  data: Uint8Array;
  type: ImageType;
} | null {
  const match = /^data:image\/(png|jpeg|jpg|gif|bmp);base64,(.+)$/i.exec(value);

  if (!match) {
    return null;
  }

  const [, rawType, base64] = match;
  if (!rawType || !base64) {
    return null;
  }

  const type = rawType === 'jpeg' ? 'jpg' : rawType;
  if (type !== 'png' && type !== 'jpg' && type !== 'gif' && type !== 'bmp') {
    return null;
  }

  return {
    data: Uint8Array.from(Buffer.from(base64, 'base64')),
    type,
  };
}

function imageTypeFromContentType(value: string | null): ImageType | null {
  if (!value) {
    return null;
  }

  if (value.includes('png')) return 'png';
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpg';
  if (value.includes('gif')) return 'gif';
  if (value.includes('bmp')) return 'bmp';
  return null;
}

function imageTypeFromUrl(value: string): ImageType | null {
  const lowerValue = value.toLowerCase();
  if (lowerValue.includes('.png')) return 'png';
  if (lowerValue.includes('.jpeg') || lowerValue.includes('.jpg')) return 'jpg';
  if (lowerValue.includes('.gif')) return 'gif';
  if (lowerValue.includes('.bmp')) return 'bmp';
  return null;
}

async function resolveImageData(value: string): Promise<{
  data: Uint8Array;
  type: ImageType;
} | null> {
  const normalizedValue = normalizeTemplateText(value);
  const dataUrlImage = dataUrlToImage(normalizedValue);
  if (dataUrlImage) {
    return dataUrlImage;
  }

  if (
    !normalizedValue.startsWith('http://') &&
    !normalizedValue.startsWith('https://')
  ) {
    return null;
  }

  try {
    const response = await fetch(normalizedValue);
    if (!response.ok) {
      return null;
    }

    const type =
      imageTypeFromContentType(response.headers.get('content-type')) ??
      imageTypeFromUrl(normalizedValue);

    if (!type) {
      return null;
    }

    return {
      data: new Uint8Array(await response.arrayBuffer()),
      type,
    };
  } catch {
    return null;
  }
}

async function imageNodeToParagraph(
  node: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields
): Promise<Paragraph> {
  const src =
    typeof node.attrs?.src === 'string'
      ? resolveTemplateText(node.attrs.src, fields)
      : '';
  const image = await resolveImageData(src);
  const align =
    node.attrs?.align === 'center' || node.attrs?.align === 'right'
      ? node.attrs.align
      : 'left';

  if (!image) {
    return new Paragraph({
      children: [],
      spacing: paragraphSpacing({ spacingBottom: 8 }),
    });
  }

  const width = numberAttr(node, 'width') ?? 160;
  const height = numberAttr(node, 'height') ?? 80;

  return new Paragraph({
    alignment: docxAlignment(align),
    spacing: paragraphSpacing({ spacingTop: 8, spacingBottom: 8 }),
    children: [
      new ImageRun({
        data: image.data,
        type: image.type,
        transformation: { width, height },
        floating:
          node.attrs?.mode === 'free'
            ? {
                horizontalPosition: {
                  relative: HorizontalPositionRelativeFrom.MARGIN,
                  offset: pxToEmu(numberAttr(node, 'x') ?? 0),
                },
                verticalPosition: {
                  relative: VerticalPositionRelativeFrom.PARAGRAPH,
                  offset: pxToEmu(numberAttr(node, 'y') ?? 0),
                },
                allowOverlap: true,
                wrap: { type: TextWrappingType.NONE },
              }
            : undefined,
      }),
    ],
  });
}

async function legacyImageBlockToParagraph(
  block: DocumentTemplateBlock,
  fields: ResolvedDocumentTemplateFields
): Promise<Paragraph | null> {
  const imageUrl = resolveTemplateText(block.imageUrl, fields);
  const image = await resolveImageData(imageUrl);

  if (!image) {
    return null;
  }

  return new Paragraph({
    alignment: docxAlignment(block.align),
    spacing: paragraphSpacing({ spacingTop: 8, spacingBottom: 8 }),
    children: [
      new ImageRun({
        data: image.data,
        type: image.type,
        transformation: {
          width: mmToPx(block.width ?? 42),
          height: mmToPx(block.height ?? 18),
        },
      }),
    ],
  });
}

async function fixedAreaBlockToChildren(
  block: DocumentTemplateBlock,
  fields: ResolvedDocumentTemplateFields
): Promise<DocxChild[]> {
  if (block.richText) {
    return richTextDocToDocxChildren(block.richText, fields, {
      defaultFontSizePx: DEFAULT_HEADER_FOOTER_FONT_SIZE_PX,
      defaultColor: MUTED_COLOR,
      fallbackSpacingBottomPx: 0,
    });
  }

  if (block.type === 'image') {
    const image = await legacyImageBlockToParagraph(block, fields);
    return image ? [image] : [];
  }

  return [
    new Paragraph({
      alignment: docxAlignment(block.align),
      children: [
        run({
          text: blockToPlainText(block, fields),
          fontSizePx: DEFAULT_HEADER_FOOTER_FONT_SIZE_PX,
          color: MUTED_COLOR,
        }),
        ...(block.showPageNumber
          ? [
              run({
                text: ' · Seite ',
                fontSizePx: DEFAULT_HEADER_FOOTER_FONT_SIZE_PX,
                color: MUTED_COLOR,
              }),
              run({
                children: [PageNumber.CURRENT],
                fontSizePx: DEFAULT_HEADER_FOOTER_FONT_SIZE_PX,
                color: MUTED_COLOR,
              }),
            ]
          : []),
      ],
      spacing: paragraphSpacing({ spacingBottom: 0 }),
      border: block.showDivider
        ? {
            bottom: {
              color: BORDER_COLOR,
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          }
        : undefined,
    }),
  ];
}

async function fixedAreaToChildren(
  blocks: DocumentTemplateBlock[],
  fields: ResolvedDocumentTemplateFields
): Promise<DocxChild[]> {
  if (blocks.length <= 1) {
    return (
      await Promise.all(
        blocks.map((block) => fixedAreaBlockToChildren(block, fields))
      )
    ).flat();
  }

  const cells = await Promise.all(
    blocks.map(async (block) => {
      const children = await fixedAreaBlockToChildren(block, fields);
      return new TableCell({
        children: children.length > 0 ? children : [new Paragraph('')],
        width: {
          size: Math.round(100 / blocks.length),
          type: WidthType.PERCENTAGE,
        },
        borders: {
          top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
          right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        },
      });
    })
  );

  return [
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        bottom: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        left: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        right: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideHorizontal: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
        insideVertical: { style: BorderStyle.NONE, size: 0, color: 'FFFFFF' },
      },
      rows: [new TableRow({ children: cells })],
    }),
  ];
}

async function createHeader(
  content: DocumentTemplateContent,
  fields: ResolvedDocumentTemplateFields
): Promise<Header | undefined> {
  if (!content.page.header.enabled) {
    return undefined;
  }

  return new Header({
    children: await fixedAreaToChildren(
      content.page.header.blocks.map((block) => ({
        ...block,
        showDivider: false,
      })),
      fields
    ),
  });
}

async function createFooter(
  content: DocumentTemplateContent,
  fields: ResolvedDocumentTemplateFields
): Promise<Footer | undefined> {
  if (!content.page.footer.enabled) {
    return undefined;
  }

  return new Footer({
    children: await fixedAreaToChildren(content.page.footer.blocks, fields),
  });
}

export async function renderDocumentTemplateDocx(args: {
  templateName: string;
  content: DocumentTemplateContent;
  fields: ResolvedDocumentTemplateFields;
}): Promise<Buffer> {
  const children = args.content.document
    ? await richTextDocToDocxChildren(args.content.document, args.fields)
    : await legacyBlocksToDocxChildren(args.content.blocks, args.fields);

  const defaultHeader =
    args.content.page.header.showOn === 'allPages'
      ? await createHeader(args.content, args.fields)
      : undefined;
  const firstHeader =
    args.content.page.header.showOn === 'firstPage'
      ? await createHeader(args.content, args.fields)
      : undefined;
  const defaultFooter =
    args.content.page.footer.showOn === 'allPages'
      ? await createFooter(args.content, args.fields)
      : undefined;
  const firstFooter =
    args.content.page.footer.showOn === 'firstPage'
      ? await createFooter(args.content, args.fields)
      : undefined;

  const document = new Document({
    title: normalizeTemplateText(args.templateName),
    styles: {
      default: {
        document: {
          run: {
            font: FONT_FAMILY,
            size: pxToHalfPoints(BODY_FONT_SIZE_PX),
            color: BODY_COLOR,
          },
          paragraph: {
            spacing: paragraphSpacing({
              spacingBottom: DEFAULT_PARAGRAPH_SPACING_BOTTOM_PX,
            }),
          },
        },
      },
    },
    numbering: {
      config: [
        {
          reference: 'default-numbering',
          levels: [
            {
              level: 0,
              format: LevelFormat.DECIMAL,
              text: '%1.',
              alignment: AlignmentType.LEFT,
              style: {
                paragraph: {
                  indent: { left: 720, hanging: 360 },
                },
              },
            },
          ],
        },
      ],
    },
    sections: [
      {
        properties: {
          titlePage:
            args.content.page.header.showOn === 'firstPage' ||
            args.content.page.footer.showOn === 'firstPage',
          page: {
            size: {
              orientation:
                args.content.page.orientation === 'landscape'
                  ? PageOrientation.LANDSCAPE
                  : PageOrientation.PORTRAIT,
            },
            margin: {
              top: convertMillimetersToTwip(
                args.content.page.margins.top +
                  (args.content.page.header.enabled
                    ? args.content.page.header.height
                    : 0)
              ),
              right: convertMillimetersToTwip(args.content.page.margins.right),
              bottom: convertMillimetersToTwip(
                args.content.page.margins.bottom +
                  (args.content.page.footer.enabled
                    ? args.content.page.footer.height
                    : 0)
              ),
              left: convertMillimetersToTwip(args.content.page.margins.left),
              header: convertMillimetersToTwip(args.content.page.margins.top),
              footer: convertMillimetersToTwip(
                args.content.page.margins.bottom
              ),
            },
          },
        },
        headers: {
          default: defaultHeader,
          first: firstHeader,
        },
        footers: {
          default: defaultFooter,
          first: firstFooter,
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(document);
}

async function legacyBlocksToDocxChildren(
  blocks: DocumentTemplateBlock[],
  fields: ResolvedDocumentTemplateFields
): Promise<DocxChild[]> {
  const children: DocxChild[] = [];

  for (const block of blocks) {
    if (block.richText) {
      children.push(
        ...(await richTextDocToDocxChildren(block.richText, fields))
      );
      continue;
    }

    switch (block.type) {
      case 'heading':
        children.push(
          new Paragraph({
            children: [
              run({
                text: blockToPlainText(block, fields),
                fontSizePx: block.fontSize ?? 32,
                bold: true,
              }),
            ],
            alignment: docxAlignment(block.align),
            spacing: paragraphSpacing({
              spacingTop: block.spacingTop,
              spacingBottom: block.spacingBottom ?? 20,
            }),
          })
        );
        break;
      case 'infoBox':
        children.push(
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { fill: INFO_BOX_FILL, type: ShadingType.CLEAR },
                    margins: {
                      top: 180,
                      bottom: 180,
                      left: 180,
                      right: 180,
                    },
                    children: [
                      new Paragraph({
                        children: [
                          run({
                            text: block.title ?? 'Information',
                            fontSizePx: 14,
                            bold: true,
                          }),
                        ],
                        spacing: paragraphSpacing({ spacingBottom: 8 }),
                      }),
                      textParagraph(blockToPlainText(block, fields)),
                    ],
                  }),
                ],
              }),
            ],
          })
        );
        break;
      case 'dataTable':
        children.push(dataTableBlockToTable(block, fields));
        break;
      case 'divider':
        children.push(dividerParagraph());
        break;
      case 'signature':
        children.push(
          new Paragraph({
            children: [run({ text: blockToPlainText(block, fields) })],
            spacing: paragraphSpacing({
              spacingTop: block.spacingTop ?? 24,
              spacingBottom: block.spacingBottom ?? 0,
            }),
          })
        );
        break;
      case 'pageBreak':
        children.push(new Paragraph({ children: [new PageBreak()] }));
        break;
      case 'image': {
        const image = await legacyImageBlockToParagraph(block, fields);
        if (image) {
          children.push(image);
        }
        break;
      }
      case 'field':
      case 'paragraph':
      case 'header':
      case 'footer':
      default:
        children.push(textParagraph(blockToPlainText(block, fields)));
        break;
    }
  }

  return children;
}

function dataTableBlockToTable(
  block: DocumentTemplateBlock,
  fields: ResolvedDocumentTemplateFields
) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows:
      block.rows?.map(
        (row) =>
          new TableRow({
            children: [
              new TableCell({
                shading: { fill: INFO_BOX_FILL, type: ShadingType.CLEAR },
                width: { size: 36, type: WidthType.PERCENTAGE },
                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [run({ text: row.label, bold: true })],
                  }),
                ],
              }),
              new TableCell({
                width: { size: 64, type: WidthType.PERCENTAGE },
                margins: { top: 120, bottom: 120, left: 120, right: 120 },
                children: [
                  new Paragraph({
                    children: [
                      run({
                        text: resolveTemplateText(row.value, fields),
                      }),
                    ],
                  }),
                ],
              }),
            ],
          })
      ) ?? [],
  });
}

function dividerParagraph() {
  return new Paragraph({
    border: {
      bottom: {
        color: BORDER_COLOR,
        space: 1,
        style: BorderStyle.SINGLE,
        size: 6,
      },
    },
    spacing: paragraphSpacing({ spacingTop: 24, spacingBottom: 24 }),
  });
}

function inlineNodesToRuns(
  nodes: DocumentTemplateRichTextNode[] | undefined,
  fields: ResolvedDocumentTemplateFields,
  options: {
    defaultFontSizePx: number;
    defaultColor: string;
    bold?: boolean;
  }
): TextRun[] {
  return (
    nodes?.flatMap((node) => {
      if (node.type === 'text') {
        const fontSize = getMarkAttr(node.marks, 'textStyle', 'fontSize');
        const color = getMarkAttr(node.marks, 'textStyle', 'color');
        const parsedFontSize =
          typeof fontSize === 'string'
            ? Number(fontSize.replace('px', ''))
            : undefined;
        const parsedColor =
          typeof color === 'string' ? color.replace('#', '') : undefined;
        const textParts = normalizeTemplateText(node.text ?? '').split('\t');

        return textParts.flatMap((part, partIndex) => [
          ...(partIndex > 0
            ? [run({ children: [new Tab()], ...options })]
            : []),
          ...(part
            ? [
                run({
                  text: part,
                  bold: options.bold || hasMark(node.marks, 'bold'),
                  italics: hasMark(node.marks, 'italic'),
                  underline: hasMark(node.marks, 'underline'),
                  fontSizePx: parsedFontSize || options.defaultFontSizePx,
                  color: parsedColor || options.defaultColor,
                }),
              ]
            : []),
        ]);
      }

      if (node.type === 'hardBreak') {
        return [
          new TextRun({
            text: '',
            break: 1,
            font: FONT_FAMILY,
            size: pxToHalfPoints(options.defaultFontSizePx),
            color: options.defaultColor,
          }),
        ];
      }

      if (node.type === 'dynamicField') {
        const fieldKey = node.attrs?.fieldKey;
        if (fieldKey === 'pageNumber') {
          return [
            run({
              children: [PageNumber.CURRENT],
              fontSizePx: options.defaultFontSizePx,
              color: options.defaultColor,
            }),
          ];
        }

        return [
          run({
            text:
              typeof fieldKey === 'string'
                ? (fields[fieldKey]?.formattedValue ?? missingTemplateValue())
                : missingTemplateValue(),
            fontSizePx: options.defaultFontSizePx,
            color: options.defaultColor,
          }),
        ];
      }

      return inlineNodesToRuns(node.content, fields, options);
    }) ?? []
  );
}

function paragraphFromInlineNode(
  node: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields,
  options: {
    defaultFontSizePx: number;
    defaultColor: string;
    fallbackSpacingBottomPx: number;
    bold?: boolean;
  }
) {
  return new Paragraph({
    children: inlineNodesToRuns(node.content, fields, options),
    alignment: alignmentFromNode(node),
    spacing: paragraphSpacing(node, options.fallbackSpacingBottomPx),
    indent: indentFromNode(node),
  });
}

function tableCellToChildren(
  cell: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields
): DocxChild[] {
  const children =
    cell.content?.flatMap((child) =>
      child.type === 'paragraph' || child.type === 'heading'
        ? [
            paragraphFromInlineNode(child, fields, {
              defaultFontSizePx: BODY_FONT_SIZE_PX,
              defaultColor: BODY_COLOR,
              fallbackSpacingBottomPx: 4,
              bold: child.type === 'heading',
            }),
          ]
        : []
    ) ?? [];

  return children.length > 0 ? children : [new Paragraph('')];
}

function richTableNodeToTable(
  node: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields
) {
  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    rows:
      node.content?.map(
        (row) =>
          new TableRow({
            children:
              row.content?.map(
                (cell) =>
                  new TableCell({
                    shading:
                      cell.type === 'tableHeader'
                        ? { fill: INFO_BOX_FILL, type: ShadingType.CLEAR }
                        : undefined,
                    margins: {
                      top: 120,
                      bottom: 120,
                      left: 120,
                      right: 120,
                    },
                    children: tableCellToChildren(cell, fields),
                  })
              ) ?? [],
          })
      ) ?? [],
  });
}

async function richTextDocToDocxChildren(
  document: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields,
  options: {
    defaultFontSizePx: number;
    defaultColor: string;
    fallbackSpacingBottomPx: number;
  } = {
    defaultFontSizePx: BODY_FONT_SIZE_PX,
    defaultColor: BODY_COLOR,
    fallbackSpacingBottomPx: DEFAULT_PARAGRAPH_SPACING_BOTTOM_PX,
  }
): Promise<DocxChild[]> {
  const children: DocxChild[] = [];

  for (const node of document.content ?? []) {
    if (node.type === 'templateImage') {
      children.push(await imageNodeToParagraph(node, fields));
      continue;
    }

    if (node.type === 'heading') {
      const fontSizePx = node.attrs?.level === 2 ? 23 : 32;
      children.push(
        paragraphFromInlineNode(node, fields, {
          ...options,
          defaultFontSizePx: fontSizePx,
          fallbackSpacingBottomPx: node.attrs?.level === 2 ? 16 : 20,
          bold: true,
        })
      );
      continue;
    }

    if (node.type === 'bulletList' || node.type === 'orderedList') {
      children.push(
        ...(node.content?.flatMap(
          (item) =>
            item.content?.map(
              (paragraph) =>
                new Paragraph({
                  children: inlineNodesToRuns(
                    paragraph.content,
                    fields,
                    options
                  ),
                  bullet: node.type === 'bulletList' ? { level: 0 } : undefined,
                  numbering:
                    node.type === 'orderedList'
                      ? { reference: 'default-numbering', level: 0 }
                      : undefined,
                  spacing: paragraphSpacing(
                    paragraph,
                    options.fallbackSpacingBottomPx / 2
                  ),
                })
            ) ?? []
        ) ?? [])
      );
      continue;
    }

    if (node.type === 'horizontalRule') {
      children.push(dividerParagraph());
      continue;
    }

    if (node.type === 'pageBreak') {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (node.type === 'infoBox') {
      children.push(
        new Table({
          width: { size: 100, type: WidthType.PERCENTAGE },
          rows: [
            new TableRow({
              children: [
                new TableCell({
                  shading: { fill: INFO_BOX_FILL, type: ShadingType.CLEAR },
                  margins: {
                    top: 240,
                    bottom: 240,
                    left: 240,
                    right: 240,
                  },
                  children: node.content?.flatMap((child) =>
                    child.type === 'templateImage'
                      ? []
                      : [
                          paragraphFromInlineNode(child, fields, {
                            ...options,
                            fallbackSpacingBottomPx: 10,
                          }),
                        ]
                  ) ?? [new Paragraph('')],
                }),
              ],
            }),
          ],
        })
      );
      continue;
    }

    if (node.type === 'table') {
      children.push(richTableNodeToTable(node, fields));
      continue;
    }

    if (node.type === 'paragraph') {
      children.push(paragraphFromInlineNode(node, fields, options));
      continue;
    }

    children.push(
      new Paragraph({
        children: inlineNodesToRuns(node.content, fields, options),
        spacing: paragraphSpacing({
          spacingBottom: options.fallbackSpacingBottomPx,
        }),
      })
    );
  }

  return children;
}
