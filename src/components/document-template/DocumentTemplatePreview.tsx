'use client';

import type { CSSProperties } from 'react';
import Image from 'next/image';
import type {
  DocumentTemplateBlock,
  DocumentTemplateContent,
  DocumentTemplateHorizontalAlignment,
  DocumentTemplateRichTextNode,
  ResolvedDocumentTemplateFields,
} from '@/features/document-template/types';
import {
  getMarkAttr,
  hasMark,
} from '@/features/document-template/lib/document-rich-text';
import {
  extractTemplateTextParts,
  resolveTemplateText,
} from '@/features/document-template/lib/document-template-renderer';
import {
  DOCUMENT_PAGE_HEIGHT_PX,
  DOCUMENT_PAGE_WIDTH_PX,
} from '@/features/document-template/lib/document-page-geometry';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const A4_WIDTH_PX = DOCUMENT_PAGE_WIDTH_PX;
const A4_HEIGHT_PX = DOCUMENT_PAGE_HEIGHT_PX;
const MM_TO_PX = A4_WIDTH_PX / 210;

function mm(value: number): number {
  return Math.round(value * MM_TO_PX);
}

function alignmentClass(
  align: DocumentTemplateHorizontalAlignment | undefined
): string {
  if (align === 'center') return 'text-center items-center';
  if (align === 'right') return 'text-right items-end';
  return 'text-left items-start';
}

function numericAttr(
  node: DocumentTemplateRichTextNode,
  attribute: string
): number | undefined {
  const value = node.attrs?.[attribute];
  return typeof value === 'number' ? value : undefined;
}

function richNodeStyle(node: DocumentTemplateRichTextNode): CSSProperties {
  return {
    marginTop: numericAttr(node, 'spacingTop'),
    marginBottom: numericAttr(node, 'spacingBottom'),
    marginLeft: numericAttr(node, 'indent'),
    textAlign:
      node.attrs?.textAlign === 'center' || node.attrs?.textAlign === 'right'
        ? node.attrs.textAlign
        : undefined,
  };
}

function InlineText({
  text,
  fields,
}: {
  text: string | null | undefined;
  fields: ResolvedDocumentTemplateFields;
}) {
  const parts = extractTemplateTextParts(text, fields);

  return (
    <>
      {parts.map((part, index) =>
        part.kind === 'field' ? (
          <span key={`${part.value}-${index}`}>{part.value || '—'}</span>
        ) : (
          <span key={`${part.value}-${index}`} className="whitespace-pre-wrap">
            {part.value}
          </span>
        )
      )}
    </>
  );
}

function PreviewBlock({
  block,
  fields,
}: {
  block: DocumentTemplateBlock;
  fields: ResolvedDocumentTemplateFields;
}) {
  if (block.richText) {
    return (
      <>
        {block.richText.content?.map((node, index) => (
          <RichTextPreviewNode key={index} node={node} fields={fields} />
        ))}
      </>
    );
  }

  switch (block.type) {
    case 'heading':
      return (
        <h2 className="text-[24px] font-semibold">
          <InlineText text={block.text} fields={fields} />
        </h2>
      );
    case 'infoBox':
      return (
        <div className="bg-muted/30 rounded-[6px] border p-[16px]">
          <p className="mb-[8px] text-[14px] font-medium">
            {block.title ?? 'Information'}
          </p>
          <p className="text-[14px] leading-[24px]">
            <InlineText text={block.text} fields={fields} />
          </p>
        </div>
      );
    case 'dataTable':
      return (
        <div className="overflow-hidden rounded-[6px] border">
          {block.title ? (
            <div className="bg-muted/40 border-b px-[12px] py-[8px] text-[14px] font-medium">
              {block.title}
            </div>
          ) : null}
          {block.rows?.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[180px_1fr] border-b last:border-b-0"
            >
              <div className="bg-muted/30 px-[12px] py-[8px] text-[14px] font-medium">
                {row.label}
              </div>
              <div className="px-[12px] py-[8px] text-[14px]">
                {resolveTemplateText(row.value, fields)}
              </div>
            </div>
          ))}
        </div>
      );
    case 'divider':
      return <Separator />;
    case 'signature':
      return (
        <p className="pt-[16px] text-[14px] leading-[24px]">
          <InlineText text={block.text} fields={fields} />
        </p>
      );
    case 'pageBreak':
      return (
        <div className="text-muted-foreground flex items-center gap-[12px] text-[12px]">
          <Separator className="flex-1" />
          Seitenumbruch
          <Separator className="flex-1" />
        </div>
      );
    case 'field':
      return (
        <Badge variant="secondary">
          {block.fieldKey
            ? (fields[block.fieldKey]?.formattedValue ?? '—')
            : '—'}
        </Badge>
      );
    case 'image': {
      const imageUrl = resolveTemplateText(block.imageUrl, fields);
      const showImage = imageUrl && imageUrl !== '—';
      return (
        <div
          className={cn('flex flex-col gap-[4px]', alignmentClass(block.align))}
        >
          {showImage ? (
            <Image
              src={imageUrl}
              alt={block.title ?? 'Logo'}
              width={mm(block.width ?? 42)}
              height={mm(block.height ?? 18)}
              unoptimized
              className="object-contain"
              style={{
                width: mm(block.width ?? 42),
                height: mm(block.height ?? 18),
              }}
            />
          ) : (
            <div
              className="text-muted-foreground rounded-[6px] border border-dashed px-[12px] py-[8px] text-[12px]"
              style={{
                width: mm(block.width ?? 42),
                height: mm(block.height ?? 18),
              }}
            >
              {block.imageUrl === '{{organizationLogoUrl}}'
                ? 'Kein Organisationslogo hinterlegt.'
                : 'Bild nicht verfügbar'}
            </div>
          )}
        </div>
      );
    }
    case 'header':
    case 'footer':
    case 'paragraph':
    default:
      return (
        <p
          className={cn(
            'text-[14px] leading-[24px]',
            block.type === 'header' &&
              'text-muted-foreground border-b pb-[8px]',
            block.type === 'footer' && 'text-muted-foreground border-t pt-[8px]'
          )}
        >
          <InlineText text={block.text} fields={fields} />
        </p>
      );
  }
}

function InlineRichText({
  nodes,
  fields,
}: {
  nodes: DocumentTemplateRichTextNode[] | undefined;
  fields: ResolvedDocumentTemplateFields;
}) {
  return (
    <>
      {nodes?.map((node, index) => {
        if (node.type === 'text') {
          const fontSize = getMarkAttr(node.marks, 'textStyle', 'fontSize');
          return (
            <span
              key={index}
              style={{
                fontWeight: hasMark(node.marks, 'bold') ? 700 : undefined,
                fontStyle: hasMark(node.marks, 'italic') ? 'italic' : undefined,
                textDecoration: hasMark(node.marks, 'underline')
                  ? 'underline'
                  : undefined,
                fontSize: typeof fontSize === 'string' ? fontSize : undefined,
                tabSize: 4,
                whiteSpace: 'pre-wrap',
              }}
            >
              {node.text}
            </span>
          );
        }

        if (node.type === 'hardBreak') {
          return <br key={index} />;
        }

        if (node.type === 'dynamicField') {
          const fieldKey = node.attrs?.fieldKey;
          return (
            <span key={index}>
              {typeof fieldKey === 'string'
                ? (fields[fieldKey]?.formattedValue ?? '—')
                : '—'}
            </span>
          );
        }

        return (
          <InlineRichText key={index} nodes={node.content} fields={fields} />
        );
      })}
    </>
  );
}

function RichTextPreviewNode({
  node,
  fields,
}: {
  node: DocumentTemplateRichTextNode;
  fields: ResolvedDocumentTemplateFields;
}) {
  if (node.type === 'templateImage') {
    const src =
      typeof node.attrs?.src === 'string'
        ? resolveTemplateText(node.attrs.src, fields)
        : '';
    const align =
      node.attrs?.align === 'center' || node.attrs?.align === 'right'
        ? node.attrs.align
        : 'left';
    const width =
      typeof node.attrs?.width === 'number' ? node.attrs.width : 160;
    const height =
      typeof node.attrs?.height === 'number' ? node.attrs.height : 80;
    const mode = node.attrs?.mode === 'free' ? 'free' : 'inline';
    const x = typeof node.attrs?.x === 'number' ? node.attrs.x : 0;
    const y = typeof node.attrs?.y === 'number' ? node.attrs.y : 0;

    if (!src || src === '—') {
      return (
        <div
          className={cn(
            'text-muted-foreground inline-flex rounded-[6px] border border-dashed px-[12px] py-[8px] text-[12px]',
            mode === 'inline' && 'my-[8px]'
          )}
          style={
            mode === 'free'
              ? {
                  position: 'absolute',
                  left: x,
                  top: y,
                  width,
                  minHeight: Math.min(height, 80),
                }
              : undefined
          }
        >
          {node.attrs?.src === '{{organizationLogoUrl}}'
            ? 'Kein Organisationslogo hinterlegt.'
            : 'Bild nicht verfügbar'}
        </div>
      );
    }

    return (
      <div
        className={cn(
          mode === 'inline' && 'my-[8px] flex',
          mode === 'free' && 'absolute',
          align === 'center' && 'justify-center',
          align === 'right' && 'justify-end'
        )}
        style={
          mode === 'free'
            ? {
                left: x,
                top: y,
                width,
                height,
              }
            : undefined
        }
      >
        <Image
          src={src}
          alt={typeof node.attrs?.alt === 'string' ? node.attrs.alt : 'Bild'}
          width={width}
          height={height}
          unoptimized
          className="object-contain"
          style={{ width, height }}
        />
      </div>
    );
  }

  if (node.type === 'heading') {
    const isSecondLevel = node.attrs?.level === 2;
    return (
      <h2
        className="font-semibold"
        style={{
          ...richNodeStyle(node),
          fontSize: isSecondLevel ? 23.2 : 32,
          lineHeight: isSecondLevel ? 1.25 : 1.2,
          marginBottom: numericAttr(node, 'spacingBottom') ?? 20,
          overflowWrap: 'normal',
          wordBreak: 'normal',
        }}
      >
        <InlineRichText nodes={node.content} fields={fields} />
      </h2>
    );
  }

  if (node.type === 'horizontalRule') {
    return <Separator className="my-[24px]" />;
  }

  if (node.type === 'pageBreak') {
    return (
      <div className="text-muted-foreground my-[32px] flex items-center gap-[12px] text-[12px]">
        <Separator className="flex-1" />
        Seitenumbruch
        <Separator className="flex-1" />
      </div>
    );
  }

  if (node.type === 'infoBox') {
    return (
      <div
        className="bg-muted/50 rounded-[6px] p-[16px]"
        style={{
          ...richNodeStyle(node),
          marginBottom: numericAttr(node, 'spacingBottom') ?? 20,
        }}
      >
        {node.content?.map((child, index) => (
          <RichTextPreviewNode key={index} node={child} fields={fields} />
        ))}
      </div>
    );
  }

  if (node.type === 'bulletList' || node.type === 'orderedList') {
    const ListTag = node.type === 'bulletList' ? 'ul' : 'ol';
    return (
      <ListTag className="mb-[16px] ml-[24px] list-outside">
        {node.content?.map((item, index) => (
          <li key={index}>
            <InlineRichText
              nodes={item.content?.flatMap((child) => child.content ?? [])}
              fields={fields}
            />
          </li>
        ))}
      </ListTag>
    );
  }

  if (node.type === 'table') {
    return (
      <table className="mb-[20px] w-full border-collapse text-[14px]">
        <tbody>
          {node.content?.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.content?.map((cell, cellIndex) => (
                <td key={cellIndex} className="border px-[12px] py-[8px]">
                  <InlineRichText
                    nodes={cell.content?.flatMap(
                      (child) => child.content ?? []
                    )}
                    fields={fields}
                  />
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    );
  }

  return (
    <p
      className="leading-[28px]"
      style={{
        ...richNodeStyle(node),
        marginBottom: numericAttr(node, 'spacingBottom') ?? 16,
      }}
    >
      <InlineRichText nodes={node.content} fields={fields} />
    </p>
  );
}

export function DocumentTemplatePreview({
  content,
  fields,
  showAreaLabels = false,
}: {
  content: DocumentTemplateContent;
  fields: ResolvedDocumentTemplateFields;
  showAreaLabels?: boolean;
}) {
  const page = content.page;
  const headerHeightPx = page.header.enabled ? mm(page.header.height) : 0;
  const footerHeightPx = page.footer.enabled ? mm(page.footer.height) : 0;
  const pagePaddingTopPx = mm(page.margins.top);
  const pagePaddingRightPx = mm(page.margins.right);
  const pagePaddingBottomPx = mm(page.margins.bottom);
  const pagePaddingLeftPx = mm(page.margins.left);
  const pageContentWidthPx =
    A4_WIDTH_PX - pagePaddingLeftPx - pagePaddingRightPx;
  const bodyHeightPx = Math.max(
    360,
    A4_HEIGHT_PX -
      pagePaddingTopPx -
      pagePaddingBottomPx -
      headerHeightPx -
      footerHeightPx
  );

  return (
    <div
      className="bg-background mx-auto grid overflow-hidden shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
      style={{
        width: A4_WIDTH_PX,
        minWidth: A4_WIDTH_PX,
        maxWidth: A4_WIDTH_PX,
        height: A4_HEIGHT_PX,
        minHeight: A4_HEIGHT_PX,
        maxHeight: A4_HEIGHT_PX,
        paddingTop: pagePaddingTopPx,
        paddingRight: pagePaddingRightPx,
        paddingBottom: pagePaddingBottomPx,
        paddingLeft: pagePaddingLeftPx,
        gridTemplateRows: `${headerHeightPx}px ${bodyHeightPx}px ${footerHeightPx}px`,
      }}
    >
      {page.header.enabled ? (
        <div
          className={cn(
            'relative box-border flex min-w-0 flex-col justify-center gap-[4px] overflow-hidden',
            showAreaLabels &&
              'border-border bg-muted/20 border-x border-t border-dashed'
          )}
          style={{
            width: pageContentWidthPx,
            minWidth: pageContentWidthPx,
            maxWidth: pageContentWidthPx,
            height: headerHeightPx,
            minHeight: headerHeightPx,
            maxHeight: headerHeightPx,
          }}
        >
          {showAreaLabels ? (
            <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
              Kopfbereich
            </span>
          ) : null}
          <div className="flex min-w-0 items-center justify-between gap-[16px]">
            {page.header.blocks.map((block) => (
              <div
                key={block.id}
                className={cn('min-w-0 flex-1', alignmentClass(block.align))}
              >
                <PreviewBlock block={block} fields={fields} />
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div
        className={cn(
          'relative box-border min-w-0 overflow-hidden',
          showAreaLabels &&
            'border-border bg-background border-x border-dashed'
        )}
        style={{
          width: pageContentWidthPx,
          minWidth: pageContentWidthPx,
          maxWidth: pageContentWidthPx,
          height: bodyHeightPx,
          minHeight: bodyHeightPx,
          maxHeight: bodyHeightPx,
        }}
      >
        {showAreaLabels ? (
          <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
            Dokumentinhalt
          </span>
        ) : null}
        <div
          className={cn(
            'flex min-w-0 flex-col gap-[20px]',
            showAreaLabels && 'pt-[20px]'
          )}
        >
          {content.document
            ? content.document.content?.map((node, index) => (
                <RichTextPreviewNode key={index} node={node} fields={fields} />
              ))
            : content.blocks.map((block) => (
                <PreviewBlock key={block.id} block={block} fields={fields} />
              ))}
        </div>
      </div>

      {page.footer.enabled ? (
        <div
          className={cn(
            'relative box-border flex min-w-0 flex-col justify-center overflow-hidden',
            showAreaLabels &&
              'bg-muted/20 outline-border outline outline-1 outline-dashed'
          )}
          style={{
            width: pageContentWidthPx,
            minWidth: pageContentWidthPx,
            maxWidth: pageContentWidthPx,
            height: footerHeightPx,
            minHeight: footerHeightPx,
            maxHeight: footerHeightPx,
          }}
        >
          {page.footer.blocks.some((block) => block.showDivider) ? (
            <Separator className="absolute top-0 right-0 left-0" />
          ) : null}
          {showAreaLabels ? (
            <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
              Fußbereich
            </span>
          ) : null}
          {page.footer.blocks.map((block) => (
            <div
              key={block.id}
              className={cn('min-w-0', alignmentClass(block.align))}
            >
              <PreviewBlock block={block} fields={fields} />
              {block.showPageNumber ? (
                <p className="text-muted-foreground mt-[4px] text-[12px]">
                  Seite 1
                </p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
