import React from 'react';
import type { ReactNode } from 'react';
import {
  Document,
  Image,
  Page,
  StyleSheet,
  Text,
  View,
  renderToBuffer,
} from '@react-pdf/renderer';
import type {
  DocumentTemplateBlock,
  DocumentTemplateContent,
  DocumentTemplateHorizontalAlignment,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import { resolveTemplateImageLayout } from './document-template-image-layout';
import {
  blockToPlainText,
  resolveTemplateText,
} from './document-template-renderer';
import { getMarkAttr, hasMark } from './document-rich-text';
import {
  getActivePageAreaHeights,
  millimetersToPdfPoints,
  pixelsToPdfPoints,
} from './document-page-geometry';

export function documentFontFamilyToPdfFont(
  fontFamily: string | undefined,
  bold = false,
  italic = false
): string | undefined {
  switch (fontFamily) {
    case 'Times New Roman':
    case 'Georgia':
      return bold && italic
        ? 'Times-BoldItalic'
        : bold
          ? 'Times-Bold'
          : italic
            ? 'Times-Italic'
            : 'Times-Roman';
    case 'Courier New':
      return bold && italic
        ? 'Courier-BoldOblique'
        : bold
          ? 'Courier-Bold'
          : italic
            ? 'Courier-Oblique'
            : 'Courier';
    case 'Arial':
    case 'Calibri':
    case 'Verdana':
      return bold && italic
        ? 'Helvetica-BoldOblique'
        : bold
          ? 'Helvetica-Bold'
          : italic
            ? 'Helvetica-Oblique'
            : 'Helvetica';
    default:
      return undefined;
  }
}

const styles = StyleSheet.create({
  page: {
    fontSize: 11,
    color: '#111827',
    fontFamily: 'Helvetica',
  },
  fixedAreaText: {
    fontSize: 9,
    color: '#475569',
    lineHeight: 1.25,
  },
  fixedDivider: {
    borderBottom: '1 solid #d4d4d8',
  },
  heading: {
    fontSize: 22,
    fontWeight: 700,
    marginBottom: 18,
  },
  heading2: {
    fontSize: 16,
    fontWeight: 700,
    marginBottom: 12,
  },
  paragraph: {
    lineHeight: 1.45,
    marginBottom: 12,
  },
  infoBox: {
    border: '1 solid #d4d4d8',
    padding: 12,
    marginBottom: 14,
  },
  infoTitle: {
    fontSize: 12,
    fontWeight: 700,
    marginBottom: 6,
  },
  table: {
    border: '1 solid #d4d4d8',
    marginBottom: 14,
  },
  row: {
    flexDirection: 'row',
    borderBottom: '1 solid #e4e4e7',
  },
  cellLabel: {
    width: '36%',
    padding: 8,
    fontWeight: 700,
    backgroundColor: '#f4f4f5',
  },
  cellValue: {
    width: '64%',
    padding: 8,
  },
  divider: {
    borderBottom: '1 solid #d4d4d8',
    marginVertical: 12,
  },
  listItem: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  listBullet: {
    width: 16,
  },
  signature: {
    marginTop: 24,
    lineHeight: 1.5,
  },
});

type PdfSpacingStyle = {
  marginTop?: number;
  marginBottom?: number;
  marginLeft?: number;
  lineHeight?: number;
  textAlign?: 'center' | 'right';
};

function PdfBlock({
  block,
  fields,
}: {
  block: DocumentTemplateBlock;
  fields: ResolvedDocumentTemplateFields;
}) {
  switch (block.type) {
    case 'heading':
      return (
        <Text style={styles.heading}>{blockToPlainText(block, fields)}</Text>
      );
    case 'infoBox':
      return (
        <View style={styles.infoBox}>
          <Text style={styles.infoTitle}>{block.title ?? 'Information'}</Text>
          <Text style={styles.paragraph}>
            {blockToPlainText(block, fields)}
          </Text>
        </View>
      );
    case 'dataTable':
      return (
        <View style={styles.table}>
          {block.rows?.map((row) => (
            <View key={row.id} style={styles.row}>
              <Text style={styles.cellLabel}>{row.label}</Text>
              <Text style={styles.cellValue}>
                {blockToPlainText(
                  { id: row.id, type: 'paragraph', text: row.value },
                  fields
                )}
              </Text>
            </View>
          ))}
        </View>
      );
    case 'divider':
      return <View style={styles.divider} />;
    case 'signature':
      return (
        <Text style={styles.signature}>{blockToPlainText(block, fields)}</Text>
      );
    case 'pageBreak':
      return <Text break />;
    case 'image':
      return <FixedAreaBlock block={block} fields={fields} />;
    case 'field':
    case 'paragraph':
    case 'header':
    case 'footer':
    default:
      return (
        <Text style={styles.paragraph}>{blockToPlainText(block, fields)}</Text>
      );
  }
}

function textAlignStyle(
  align: DocumentTemplateHorizontalAlignment | undefined
): { textAlign?: 'left' | 'center' | 'right' } {
  if (align === 'center' || align === 'right') {
    return { textAlign: align };
  }

  return { textAlign: 'left' };
}

function FixedAreaBlock({
  block,
  fields,
}: {
  block: DocumentTemplateBlock;
  fields: ResolvedDocumentTemplateFields;
}) {
  if (block.richText) {
    return <>{richNodesToPdfBlocks(block.richText.content, fields)}</>;
  }

  if (block.type === 'image') {
    const imageUrl = resolveTemplateText(block.imageUrl, fields);
    if (!imageUrl || imageUrl === '—') {
      return null;
    }

    const width = millimetersToPdfPoints(block.width ?? 42);
    const height = millimetersToPdfPoints(block.height ?? 18);

    return (
      // @react-pdf/renderer Image has no alt prop; this is not a DOM image.
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image
        src={imageUrl}
        style={{
          width,
          height,
          objectFit: 'contain',
          marginLeft:
            block.align === 'center'
              ? 'auto'
              : block.align === 'right'
                ? 'auto'
                : 0,
          marginRight: block.align === 'center' ? 'auto' : 0,
        }}
      />
    );
  }

  return (
    <Text style={[styles.fixedAreaText, textAlignStyle(block.align)]}>
      {blockToPlainText(block, fields)}
      {block.showPageNumber ? (
        <Text render={({ pageNumber }) => ` · Seite ${pageNumber}`} fixed />
      ) : null}
    </Text>
  );
}

function inlineNodeToPdfText(
  node: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields,
  index: number
): ReactNode {
  if (node.type === 'text') {
    const fontSize = getMarkAttr(node.marks, 'textStyle', 'fontSize');
    const color = getMarkAttr(node.marks, 'textStyle', 'color');
    const fontFamily = getMarkAttr(node.marks, 'textStyle', 'fontFamily');
    const parsedFontSize =
      typeof fontSize === 'string'
        ? Number(fontSize.replace('px', ''))
        : undefined;
    const bold = hasMark(node.marks, 'bold');
    const italic = hasMark(node.marks, 'italic');
    const resolvedFontFamily = documentFontFamilyToPdfFont(
      typeof fontFamily === 'string' ? fontFamily : undefined,
      bold,
      italic
    );
    const resolvedFontStyle: 'normal' | 'italic' = resolvedFontFamily
      ? 'normal'
      : italic
        ? 'italic'
        : 'normal';
    const textDecoration: 'underline' | 'none' = hasMark(
      node.marks,
      'underline'
    )
      ? 'underline'
      : 'none';

    return (
      <Text
        key={index}
        style={{
          fontWeight: resolvedFontFamily ? 400 : bold ? 700 : 400,
          fontStyle: resolvedFontStyle,
          textDecoration,
          fontSize: parsedFontSize,
          color: typeof color === 'string' ? color : undefined,
          fontFamily: resolvedFontFamily,
        }}
      >
        {(node.text ?? '').replaceAll('\t', '    ')}
      </Text>
    );
  }

  if (node.type === 'hardBreak') {
    return <Text key={index}>{'\n'}</Text>;
  }

  if (node.type === 'dynamicField') {
    const fieldKey = node.attrs?.fieldKey;
    const fontSize = getMarkAttr(node.marks, 'textStyle', 'fontSize');
    const color = getMarkAttr(node.marks, 'textStyle', 'color');
    const fontFamily = getMarkAttr(node.marks, 'textStyle', 'fontFamily');
    const parsedFontSize =
      typeof fontSize === 'string'
        ? Number(fontSize.replace('px', ''))
        : undefined;
    const bold = hasMark(node.marks, 'bold');
    const italic = hasMark(node.marks, 'italic');
    const resolvedFontFamily = documentFontFamilyToPdfFont(
      typeof fontFamily === 'string' ? fontFamily : undefined,
      bold,
      italic
    );
    const resolvedFontStyle: 'normal' | 'italic' = resolvedFontFamily
      ? 'normal'
      : italic
        ? 'italic'
        : 'normal';
    const textDecoration: 'underline' | 'none' = hasMark(
      node.marks,
      'underline'
    )
      ? 'underline'
      : 'none';
    const style = {
      fontSize: parsedFontSize,
      color: typeof color === 'string' ? color : undefined,
      fontFamily: resolvedFontFamily,
      fontWeight: resolvedFontFamily ? 400 : bold ? 700 : 400,
      fontStyle: resolvedFontStyle,
      textDecoration,
    };
    if (fieldKey === 'pageNumber') {
      return (
        <Text
          key={index}
          style={style}
          render={({ pageNumber }) => String(pageNumber)}
        />
      );
    }

    return (
      <Text key={index} style={style}>
        {typeof fieldKey === 'string'
          ? (fields[fieldKey]?.formattedValue ?? '—')
          : '—'}
      </Text>
    );
  }

  return node.content?.map((child, childIndex) =>
    inlineNodeToPdfText(child, fields, childIndex)
  );
}

function imageNodeToPdfBlock(
  node: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields,
  index: number
): ReactNode {
  const src =
    typeof node.attrs?.src === 'string'
      ? resolveTemplateText(node.attrs.src, fields)
      : '';
  const layout = resolveTemplateImageLayout(node.attrs);
  const align =
    layout === 'center'
      ? 'center'
      : layout === 'float-right'
        ? 'right'
        : 'left';

  if (!src || src === '—') {
    return null;
  }

  const width = pixelsToPdfPoints(
    typeof node.attrs?.width === 'number' ? node.attrs.width : 160
  );
  const height = pixelsToPdfPoints(
    typeof node.attrs?.height === 'number' ? node.attrs.height : 80
  );

  return (
    <View
      key={index}
      style={{
        position: layout === 'absolute' ? 'absolute' : undefined,
        left:
          layout === 'absolute' && typeof node.attrs?.x === 'number'
            ? pixelsToPdfPoints(node.attrs.x)
            : undefined,
        top:
          layout === 'absolute' && typeof node.attrs?.y === 'number'
            ? pixelsToPdfPoints(node.attrs.y)
            : undefined,
        alignItems:
          align === 'center'
            ? 'center'
            : align === 'right'
              ? 'flex-end'
              : 'flex-start',
        marginBottom: layout === 'absolute' ? 0 : 8,
        width,
        height,
      }}
    >
      {/* @react-pdf/renderer Image has no alt prop; this is not a DOM image. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image
        src={src}
        style={{
          width,
          height,
          objectFit: 'contain',
        }}
      />
    </View>
  );
}

function spacingStyleFromNode(
  node: DocumentTemplateRichTextNode
): PdfSpacingStyle {
  const textAlign =
    node.attrs?.textAlign === 'center' || node.attrs?.textAlign === 'right'
      ? node.attrs.textAlign
      : undefined;

  return {
    marginTop:
      typeof node.attrs?.spacingTop === 'number'
        ? node.attrs.spacingTop
        : undefined,
    marginBottom:
      typeof node.attrs?.spacingBottom === 'number'
        ? node.attrs.spacingBottom
        : undefined,
    marginLeft:
      typeof node.attrs?.indent === 'number' ? node.attrs.indent : undefined,
    lineHeight:
      typeof node.attrs?.lineHeight === 'number'
        ? node.attrs.lineHeight
        : undefined,
    textAlign,
  };
}

function richNodeToPdfBlock(
  node: DocumentTemplateRichTextNode,
  fields: ResolvedDocumentTemplateFields,
  index: number
): ReactNode {
  if (node.type === 'templateImage') {
    return imageNodeToPdfBlock(node, fields, index);
  }

  if (node.type === 'heading') {
    const headingStyle =
      node.attrs?.level === 2 ? styles.heading2 : styles.heading;
    return (
      <Text key={index} style={[headingStyle, spacingStyleFromNode(node)]}>
        {node.content?.map((child, childIndex) =>
          inlineNodeToPdfText(child, fields, childIndex)
        )}
      </Text>
    );
  }

  if (node.type === 'horizontalRule') {
    return <View key={index} style={styles.divider} />;
  }

  if (node.type === 'pageBreak') {
    return <Text key={index} break />;
  }

  if (node.type === 'infoBox') {
    return (
      <View key={index} style={[styles.infoBox, spacingStyleFromNode(node)]}>
        {node.content?.map((child, childIndex) =>
          richNodeToPdfBlock(child, fields, childIndex)
        )}
      </View>
    );
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    return (
      <View key={index}>
        {node.content?.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.listItem}>
            <Text style={styles.listBullet}>
              {node.type === 'orderedList' ? `${itemIndex + 1}.` : '•'}
            </Text>
            <Text style={styles.paragraph}>
              {item.content?.flatMap((paragraph) =>
                paragraph.content?.map((child, childIndex) =>
                  inlineNodeToPdfText(child, fields, childIndex)
                )
              )}
            </Text>
          </View>
        ))}
      </View>
    );
  }

  return (
    <Text key={index} style={[styles.paragraph, spacingStyleFromNode(node)]}>
      {node.content?.map((child, childIndex) =>
        inlineNodeToPdfText(child, fields, childIndex)
      )}
    </Text>
  );
}

function richNodesToPdfBlocks(
  nodes: DocumentTemplateRichTextNode[] | undefined,
  fields: ResolvedDocumentTemplateFields
): ReactNode[] {
  const rendered: ReactNode[] = [];

  for (let index = 0; index < (nodes?.length ?? 0); index += 1) {
    const node = nodes?.[index];
    if (!node) continue;
    const layout =
      node.type === 'templateImage'
        ? resolveTemplateImageLayout(node.attrs)
        : null;
    const followingNode = nodes?.[index + 1];

    if (
      (layout === 'float-left' || layout === 'float-right') &&
      followingNode &&
      followingNode.type !== 'templateImage' &&
      followingNode.type !== 'pageBreak'
    ) {
      const image = imageNodeToPdfBlock(node, fields, index);
      const text = richNodeToPdfBlock(followingNode, fields, index + 1);
      rendered.push(
        <View
          key={`float-${index}`}
          style={{
            flexDirection: layout === 'float-left' ? 'row' : 'row-reverse',
            gap: pixelsToPdfPoints(12),
            alignItems: 'flex-start',
            marginBottom: 8,
          }}
        >
          {image}
          <View style={{ flexGrow: 1, flexBasis: 0 }}>{text}</View>
        </View>
      );
      index += 1;
      continue;
    }

    rendered.push(richNodeToPdfBlock(node, fields, index));
  }

  return rendered;
}

export async function renderDocumentTemplatePdf(args: {
  content: DocumentTemplateContent;
  fields: ResolvedDocumentTemplateFields;
}): Promise<Buffer> {
  const { page } = args.content;
  const activeAreas = getActivePageAreaHeights(page);
  const pageSize = page.orientation === 'landscape' ? 'A4' : 'A4';
  const bodyPaddingTop = millimetersToPdfPoints(
    page.margins.top + activeAreas.headerHeight
  );
  const bodyPaddingBottom = millimetersToPdfPoints(
    page.margins.bottom + activeAreas.footerHeight
  );
  const pageMarginLeft = millimetersToPdfPoints(page.margins.left);
  const pageMarginRight = millimetersToPdfPoints(page.margins.right);

  return renderToBuffer(
    <Document>
      <Page
        size={pageSize}
        orientation={page.orientation}
        style={[
          styles.page,
          {
            paddingTop: bodyPaddingTop,
            paddingRight: pageMarginRight,
            paddingBottom: bodyPaddingBottom,
            paddingLeft: pageMarginLeft,
          },
        ]}
      >
        {page.header.enabled ? (
          <View
            fixed={page.header.showOn === 'allPages'}
            style={{
              position: 'absolute',
              top: millimetersToPdfPoints(page.margins.top),
              left: pageMarginLeft,
              right: pageMarginRight,
              height: millimetersToPdfPoints(page.header.height),
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
              {page.header.blocks.map((block) => (
                <View key={block.id} style={{ flex: 1 }}>
                  <FixedAreaBlock block={block} fields={args.fields} />
                </View>
              ))}
            </View>
          </View>
        ) : null}

        {args.content.document
          ? richNodesToPdfBlocks(args.content.document.content, args.fields)
          : args.content.blocks.map((block) => (
              <PdfBlock key={block.id} block={block} fields={args.fields} />
            ))}

        {page.footer.enabled ? (
          <View
            fixed={page.footer.showOn === 'allPages'}
            style={{
              position: 'absolute',
              right: pageMarginRight,
              bottom: millimetersToPdfPoints(page.margins.bottom),
              left: pageMarginLeft,
              height: millimetersToPdfPoints(page.footer.height),
              justifyContent: 'center',
              overflow: 'hidden',
            }}
          >
            {page.footer.blocks.some((block) => block.showDivider) ? (
              <View style={[styles.fixedDivider, { marginBottom: 4 }]} />
            ) : null}
            {page.footer.blocks.map((block) => (
              <FixedAreaBlock
                key={block.id}
                block={block}
                fields={args.fields}
              />
            ))}
          </View>
        ) : null}
      </Page>
    </Document>
  );
}
