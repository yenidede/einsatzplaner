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
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';

const A4_WIDTH_PX = 794;
const A4_HEIGHT_PX = 1123;
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
        <h2 className="text-2xl font-semibold">
          <InlineText text={block.text} fields={fields} />
        </h2>
      );
    case 'infoBox':
      return (
        <div className="bg-muted/30 rounded-md border p-4">
          <p className="mb-2 text-sm font-medium">
            {block.title ?? 'Information'}
          </p>
          <p className="text-sm leading-6">
            <InlineText text={block.text} fields={fields} />
          </p>
        </div>
      );
    case 'dataTable':
      return (
        <div className="overflow-hidden rounded-md border">
          {block.title ? (
            <div className="bg-muted/40 border-b px-3 py-2 text-sm font-medium">
              {block.title}
            </div>
          ) : null}
          {block.rows?.map((row) => (
            <div
              key={row.id}
              className="grid grid-cols-[180px_1fr] border-b last:border-b-0"
            >
              <div className="bg-muted/30 px-3 py-2 text-sm font-medium">
                {row.label}
              </div>
              <div className="px-3 py-2 text-sm">
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
        <p className="pt-4 text-sm leading-6">
          <InlineText text={block.text} fields={fields} />
        </p>
      );
    case 'pageBreak':
      return (
        <div className="text-muted-foreground flex items-center gap-3 text-xs">
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
    case 'image':
      {
        const imageUrl = resolveTemplateText(block.imageUrl, fields);
        const showImage = imageUrl && imageUrl !== '—';
        return (
          <div
            className={cn('flex flex-col gap-1', alignmentClass(block.align))}
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
                className="text-muted-foreground rounded-md border border-dashed px-3 py-2 text-xs"
                style={{
                  width: mm(block.width ?? 42),
                  height: mm(block.height ?? 18),
                }}
              >
                Logo
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
            'text-sm leading-6',
            block.type === 'header' && 'text-muted-foreground border-b pb-2',
            block.type === 'footer' && 'text-muted-foreground border-t pt-2'
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

    if (!src || src === '—') {
      return null;
    }

    return (
      <div
        className={cn(
          'my-2 flex',
          align === 'center' && 'justify-center',
          align === 'right' && 'justify-end'
        )}
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
    const level = node.attrs?.level === 2 ? 'text-xl' : 'text-2xl';
    return (
      <h2 className={`mb-5 font-semibold ${level}`} style={richNodeStyle(node)}>
        <InlineRichText nodes={node.content} fields={fields} />
      </h2>
    );
  }

  if (node.type === 'horizontalRule') {
    return <Separator className="my-6" />;
  }

  if (node.type === 'pageBreak') {
    return (
      <div className="text-muted-foreground my-8 flex items-center gap-3 text-xs">
        <Separator className="flex-1" />
        Seitenumbruch
        <Separator className="flex-1" />
      </div>
    );
  }

  if (node.type === 'infoBox') {
    return (
      <div
        className="bg-muted/50 mb-5 rounded-md p-4"
        style={richNodeStyle(node)}
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
      <ListTag className="mb-4 ml-6 list-outside">
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
      <table className="mb-5 w-full border-collapse text-sm">
        <tbody>
          {node.content?.map((row, rowIndex) => (
            <tr key={rowIndex}>
              {row.content?.map((cell, cellIndex) => (
                <td key={cellIndex} className="border px-3 py-2">
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
    <p className="mb-4 leading-7" style={richNodeStyle(node)}>
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
  return (
    <div
      className="bg-background mx-auto grid max-w-full shadow-[0_18px_50px_rgba(15,23,42,0.18)] ring-1 ring-black/5"
      style={{
        width: A4_WIDTH_PX,
        minHeight: A4_HEIGHT_PX,
        paddingTop: mm(page.margins.top),
        paddingRight: mm(page.margins.right),
        paddingBottom: mm(page.margins.bottom),
        paddingLeft: mm(page.margins.left),
        gridTemplateRows: `${page.header.enabled ? mm(page.header.height) : 0}px minmax(${Math.max(
          520,
          A4_HEIGHT_PX -
            mm(
              page.margins.top +
                page.margins.bottom +
                (page.header.enabled ? page.header.height : 0) +
                (page.footer.enabled ? page.footer.height : 0)
            )
        )}px, auto) ${page.footer.enabled ? mm(page.footer.height) : 0}px`,
      }}
    >
      {page.header.enabled ? (
        <div
          className={cn(
            'relative flex flex-col justify-center gap-1',
            showAreaLabels && 'bg-muted/20 outline outline-1 outline-dashed outline-border'
          )}
        >
          {showAreaLabels ? (
            <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
              Kopfbereich
            </span>
          ) : null}
          <div className="flex items-center justify-between gap-4">
            {page.header.blocks.map((block) => (
              <div
                key={block.id}
                className={cn('min-w-0 flex-1', alignmentClass(block.align))}
              >
                <PreviewBlock block={block} fields={fields} />
              </div>
            ))}
          </div>
          {page.header.blocks.some((block) => block.showDivider) ? (
            <Separator className="absolute right-0 bottom-0 left-0" />
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          'relative',
          showAreaLabels && 'bg-background outline outline-1 outline-dashed outline-border'
        )}
      >
        {showAreaLabels ? (
          <span className="text-muted-foreground absolute top-1 left-1 text-[10px] font-medium uppercase">
            Dokumentinhalt
          </span>
        ) : null}
        <div className={cn('flex flex-col gap-5', showAreaLabels && 'pt-5')}>
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
            'relative flex flex-col justify-center',
            showAreaLabels && 'bg-muted/20 outline outline-1 outline-dashed outline-border'
          )}
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
            <div key={block.id} className={alignmentClass(block.align)}>
              <PreviewBlock block={block} fields={fields} />
              {block.showPageNumber ? (
                <p className="text-muted-foreground mt-1 text-xs">Seite 1</p>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}
    </div>
  );
}
