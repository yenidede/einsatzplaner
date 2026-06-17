import {
  AlignmentType,
  BorderStyle,
  Document,
  Footer,
  HeadingLevel,
  Header,
  ImageRun,
  Packer,
  PageNumber,
  PageOrientation,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
  convertMillimetersToTwip,
} from 'docx';
import type {
  DocumentTemplateBlock,
  DocumentTemplateContent,
  DocumentTemplateHorizontalAlignment,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import {
  blockToPlainText,
  resolveTemplateText,
} from './document-template-renderer';
import { getMarkAttr, hasMark } from './document-rich-text';

function textParagraph(text: string) {
  const lines = text.split('\n');
  return new Paragraph({
    children: lines.flatMap((line, index) => [
      ...(index > 0 ? [new TextRun({ text: '', break: 1 })] : []),
      new TextRun(line),
    ]),
  });
}

function docxAlignment(align: DocumentTemplateHorizontalAlignment | undefined) {
  if (align === 'center') return AlignmentType.CENTER;
  if (align === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function dataUrlToImage(value: string): {
  data: Uint8Array;
  type: 'png' | 'jpg' | 'gif' | 'bmp';
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

function imageTypeFromContentType(
  value: string | null
): 'png' | 'jpg' | 'gif' | 'bmp' | null {
  if (!value) {
    return null;
  }

  if (value.includes('png')) return 'png';
  if (value.includes('jpeg') || value.includes('jpg')) return 'jpg';
  if (value.includes('gif')) return 'gif';
  if (value.includes('bmp')) return 'bmp';
  return null;
}

function imageTypeFromUrl(value: string): 'png' | 'jpg' | 'gif' | 'bmp' | null {
  const lowerValue = value.toLowerCase();
  if (lowerValue.includes('.png')) return 'png';
  if (lowerValue.includes('.jpeg') || lowerValue.includes('.jpg')) return 'jpg';
  if (lowerValue.includes('.gif')) return 'gif';
  if (lowerValue.includes('.bmp')) return 'bmp';
  return null;
}

async function resolveImageData(value: string): Promise<{
  data: Uint8Array;
  type: 'png' | 'jpg' | 'gif' | 'bmp';
} | null> {
  const dataUrlImage = dataUrlToImage(value);
  if (dataUrlImage) {
    return dataUrlImage;
  }

  if (!value.startsWith('http://') && !value.startsWith('https://')) {
    return null;
  }

  try {
    const response = await fetch(value);
    if (!response.ok) {
      return null;
    }

    const type =
      imageTypeFromContentType(response.headers.get('content-type')) ??
      imageTypeFromUrl(value);

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
    return new Paragraph('');
  }

  return new Paragraph({
    alignment: docxAlignment(align),
    children: [
      new ImageRun({
        data: image.data,
        type: image.type,
        transformation: {
          width: typeof node.attrs?.width === 'number' ? node.attrs.width : 160,
          height:
            typeof node.attrs?.height === 'number' ? node.attrs.height : 80,
        },
      }),
    ],
  });
}

async function fixedAreaBlockToChildren(
  block: DocumentTemplateBlock,
  fields: ResolvedDocumentTemplateFields
): Promise<Array<Paragraph | Table>> {
  if (block.richText) {
    return richTextDocToDocxChildren(block.richText, fields);
  }

  if (block.type === 'image') {
    const imageUrl = resolveTemplateText(block.imageUrl, fields);
    const image = await resolveImageData(imageUrl);

    if (image) {
      return [
        new Paragraph({
          alignment: docxAlignment(block.align),
          children: [
            new ImageRun({
              data: image.data,
              type: image.type,
              transformation: {
                width: Math.round((block.width ?? 42) * 3.78),
                height: Math.round((block.height ?? 18) * 3.78),
              },
            }),
          ],
        }),
      ];
    }
  }

  return [
    new Paragraph({
      alignment: docxAlignment(block.align),
      children: [
        new TextRun(blockToPlainText(block, fields)),
        ...(block.showPageNumber
          ? [
              new TextRun(' · Seite '),
              new TextRun({ children: [PageNumber.CURRENT] }),
            ]
          : []),
      ],
      border: block.showDivider
        ? {
            top: {
              color: 'A1A1AA',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          }
        : undefined,
    }),
  ];
}

function createHeader(
  content: DocumentTemplateContent,
  fields: ResolvedDocumentTemplateFields
): Promise<Header | undefined> {
  if (!content.page.header.enabled) {
    return Promise.resolve(undefined);
  }

  return Promise.all(
    content.page.header.blocks.map((block) =>
      fixedAreaBlockToChildren(block, fields)
    )
  ).then((children) => new Header({ children: children.flat() }));
}

function createFooter(
  content: DocumentTemplateContent,
  fields: ResolvedDocumentTemplateFields
): Promise<Footer | undefined> {
  if (!content.page.footer.enabled) {
    return Promise.resolve(undefined);
  }

  return Promise.all(
    content.page.footer.blocks.map((block) =>
      fixedAreaBlockToChildren(block, fields)
    )
  ).then((children) => new Footer({ children: children.flat() }));
}

export async function renderDocumentTemplateDocx(args: {
  templateName: string;
  content: DocumentTemplateContent;
  fields: ResolvedDocumentTemplateFields;
}): Promise<Buffer> {
  const children = args.content.document
    ? await richTextDocToDocxChildren(args.content.document, args.fields)
    : args.content.blocks.flatMap((block) => {
        switch (block.type) {
          case 'heading':
            return [
              new Paragraph({
                text: blockToPlainText(block, args.fields),
                heading: HeadingLevel.HEADING_1,
              }),
            ];
          case 'infoBox':
            return [
              new Paragraph({
                text: block.title ?? 'Information',
                heading: HeadingLevel.HEADING_3,
              }),
              textParagraph(blockToPlainText(block, args.fields)),
            ];
          case 'dataTable':
            return [
              new Table({
                width: {
                  size: 100,
                  type: WidthType.PERCENTAGE,
                },
                rows:
                  block.rows?.map(
                    (row) =>
                      new TableRow({
                        children: [
                          new TableCell({
                            children: [new Paragraph(row.label)],
                          }),
                          new TableCell({
                            children: [
                              new Paragraph(
                                blockToPlainText(
                                  {
                                    id: row.id,
                                    type: 'paragraph',
                                    text: row.value,
                                  },
                                  args.fields
                                )
                              ),
                            ],
                          }),
                        ],
                      })
                  ) ?? [],
              }),
            ];
          case 'divider':
            return [
              new Paragraph({
                border: {
                  bottom: {
                    color: 'A1A1AA',
                    space: 1,
                    style: BorderStyle.SINGLE,
                    size: 6,
                  },
                },
              }),
            ];
          case 'signature':
            return [
              new Paragraph({
                children: [
                  new TextRun({ text: blockToPlainText(block, args.fields) }),
                ],
                spacing: { before: 360 },
              }),
            ];
          case 'pageBreak':
            return [new Paragraph({ children: [new PageBreak()] })];
          case 'field':
          case 'paragraph':
          case 'header':
          case 'footer':
          case 'image':
          default:
            return [textParagraph(blockToPlainText(block, args.fields))];
        }
      });

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
    title: args.templateName,
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
        children: [
          new Paragraph({
            text: args.templateName,
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.LEFT,
          }),
          ...children,
        ],
      },
    ],
  });

  return Packer.toBuffer(document);
}

function inlineNodesToRuns(
  nodes: DocumentTemplateRichTextNode[] | undefined,
  fields: ResolvedDocumentTemplateFields
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

        return [
          new TextRun({
            text: node.text ?? '',
            bold: hasMark(node.marks, 'bold'),
            italics: hasMark(node.marks, 'italic'),
            underline: hasMark(node.marks, 'underline') ? {} : undefined,
            size: parsedFontSize ? parsedFontSize * 2 : undefined,
            color: parsedColor,
          }),
        ];
      }

      if (node.type === 'hardBreak') {
        return [new TextRun({ text: '', break: 1 })];
      }

      if (node.type === 'dynamicField') {
        const fieldKey = node.attrs?.fieldKey;
        if (fieldKey === 'pageNumber') {
          return [new TextRun({ children: [PageNumber.CURRENT] })];
        }

        return [
          new TextRun({
            text:
              typeof fieldKey === 'string'
                ? (fields[fieldKey]?.formattedValue ?? '—')
                : '—',
          }),
        ];
      }

      return inlineNodesToRuns(node.content, fields);
    }) ?? []
  );
}

function alignmentFromNode(node: DocumentTemplateRichTextNode) {
  const textAlign = node.attrs?.textAlign;
  if (textAlign === 'center') return AlignmentType.CENTER;
  if (textAlign === 'right') return AlignmentType.RIGHT;
  return AlignmentType.LEFT;
}

function spacingFromNode(node: DocumentTemplateRichTextNode) {
  const before =
    typeof node.attrs?.spacingTop === 'number'
      ? Math.round(node.attrs.spacingTop * 15)
      : undefined;
  const after =
    typeof node.attrs?.spacingBottom === 'number'
      ? Math.round(node.attrs.spacingBottom * 15)
      : undefined;

  return before || after ? { before, after } : undefined;
}

async function richTextDocToDocxChildren(
  document: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields
): Promise<Array<Paragraph | Table>> {
  const children: Array<Paragraph | Table> = [];

  for (const node of document.content ?? []) {
    if (node.type === 'templateImage') {
      children.push(await imageNodeToParagraph(node, fields));
      continue;
    }

    if (node.type === 'heading') {
      const level =
        node.attrs?.level === 2
          ? HeadingLevel.HEADING_2
          : HeadingLevel.HEADING_1;
      children.push(
        new Paragraph({
          children: inlineNodesToRuns(node.content, fields),
          heading: level,
          alignment: alignmentFromNode(node),
          spacing: spacingFromNode(node),
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
                  children: inlineNodesToRuns(paragraph.content, fields),
                  bullet: node.type === 'bulletList' ? { level: 0 } : undefined,
                  numbering:
                    node.type === 'orderedList'
                      ? { reference: 'default-numbering', level: 0 }
                      : undefined,
                })
            ) ?? []
        ) ?? [])
      );
      continue;
    }

    if (node.type === 'horizontalRule') {
      children.push(
        new Paragraph({
          border: {
            bottom: {
              color: 'A1A1AA',
              space: 1,
              style: BorderStyle.SINGLE,
              size: 6,
            },
          },
        })
      );
      continue;
    }

    if (node.type === 'pageBreak') {
      children.push(new Paragraph({ children: [new PageBreak()] }));
      continue;
    }

    if (node.type === 'infoBox') {
      children.push(
        new Paragraph({
          children: inlineNodesToRuns(node.content?.[0]?.content, fields),
          shading: { fill: 'F4F4F5' },
          spacing: spacingFromNode(node) ?? { before: 160, after: 160 },
        })
      );
      continue;
    }

    if (node.type === 'paragraph') {
      children.push(
        new Paragraph({
          children: inlineNodesToRuns(node.content, fields),
          alignment: alignmentFromNode(node),
          spacing: spacingFromNode(node),
        })
      );
      continue;
    }

    children.push(
      new Paragraph({
        children: inlineNodesToRuns(node.content, fields),
      })
    );
  }

  return children;
}
