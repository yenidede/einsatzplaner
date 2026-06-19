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
import {
  blockToPlainText,
  resolveTemplateText,
} from './document-template-renderer';
import { getMarkAttr, hasMark } from './document-rich-text';

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
    case 'field':
    case 'paragraph':
    case 'header':
    case 'footer':
    case 'image':
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
    return (
      <>
        {block.richText.content?.map((node, index) =>
          richNodeToPdfBlock(node, fields, index)
        )}
      </>
    );
  }

  if (block.type === 'image') {
    const imageUrl = resolveTemplateText(block.imageUrl, fields);
    if (!imageUrl || imageUrl === '—') {
      return null;
    }

    return (
      // @react-pdf/renderer Image has no alt prop; this is not a DOM image.
      // eslint-disable-next-line jsx-a11y/alt-text
      <Image
        src={imageUrl}
        style={{
          width: block.width ?? 42,
          height: block.height ?? 18,
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
    const parsedFontSize =
      typeof fontSize === 'string'
        ? Number(fontSize.replace('px', ''))
        : undefined;

    return (
      <Text
        key={index}
        style={{
          fontWeight: hasMark(node.marks, 'bold') ? 700 : 400,
          fontStyle: hasMark(node.marks, 'italic') ? 'italic' : 'normal',
          textDecoration: hasMark(node.marks, 'underline')
            ? 'underline'
            : 'none',
          fontSize: parsedFontSize,
          color: typeof color === 'string' ? color : undefined,
        }}
      >
        {node.text ?? ''}
      </Text>
    );
  }

  if (node.type === 'hardBreak') {
    return <Text key={index}>{'\n'}</Text>;
  }

  if (node.type === 'dynamicField') {
    const fieldKey = node.attrs?.fieldKey;
    if (fieldKey === 'pageNumber') {
      return (
        <Text key={index} render={({ pageNumber }) => String(pageNumber)} />
      );
    }

    return (
      <Text key={index}>
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
  const align =
    node.attrs?.align === 'center' || node.attrs?.align === 'right'
      ? node.attrs.align
      : 'left';

  if (!src || src === '—') {
    return null;
  }

  return (
    <View
      key={index}
      style={{
        alignItems:
          align === 'center'
            ? 'center'
            : align === 'right'
              ? 'flex-end'
              : 'flex-start',
        marginBottom: 8,
      }}
    >
      {/* @react-pdf/renderer Image has no alt prop; this is not a DOM image. */}
      {/* eslint-disable-next-line jsx-a11y/alt-text */}
      <Image
        src={src}
        style={{
          width: typeof node.attrs?.width === 'number' ? node.attrs.width : 160,
          height:
            typeof node.attrs?.height === 'number' ? node.attrs.height : 80,
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

export async function renderDocumentTemplatePdf(args: {
  content: DocumentTemplateContent;
  fields: ResolvedDocumentTemplateFields;
}): Promise<Buffer> {
  const { page } = args.content;
  const pageSize = page.orientation === 'landscape' ? 'A4' : 'A4';
  const bodyPaddingTop =
    page.margins.top + (page.header.enabled ? page.header.height : 0);
  const bodyPaddingBottom =
    page.margins.bottom + (page.footer.enabled ? page.footer.height : 0);

  return renderToBuffer(
    <Document>
      <Page
        size={pageSize}
        orientation={page.orientation}
        style={[
          styles.page,
          {
            paddingTop: bodyPaddingTop,
            paddingRight: page.margins.right,
            paddingBottom: bodyPaddingBottom,
            paddingLeft: page.margins.left,
          },
        ]}
      >
        {page.header.enabled ? (
          <View
            fixed={page.header.showOn === 'allPages'}
            style={{
              position: 'absolute',
              top: page.margins.top,
              left: page.margins.left,
              right: page.margins.right,
              height: page.header.height,
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
            {page.header.blocks.some((block) => block.showDivider) ? (
              <View style={[styles.fixedDivider, { marginTop: 4 }]} />
            ) : null}
          </View>
        ) : null}

        {args.content.document
          ? args.content.document.content?.map((node, index) =>
              richNodeToPdfBlock(node, args.fields, index)
            )
          : args.content.blocks.map((block) => (
              <PdfBlock key={block.id} block={block} fields={args.fields} />
            ))}

        {page.footer.enabled ? (
          <View
            fixed={page.footer.showOn === 'allPages'}
            style={{
              position: 'absolute',
              right: page.margins.right,
              bottom: page.margins.bottom,
              left: page.margins.left,
              height: page.footer.height,
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
