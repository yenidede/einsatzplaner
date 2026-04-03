import type { DragEvent } from 'react';
import type { Template } from '@pdfme/common';
import {
  applyFooterToTemplate,
  stripFooterSchemas,
} from '@/features/pdf-template/lib/pdf-template-footer';
import {
  isLegacyPdfTemplateBlankBasePdf,
  PDF_TEMPLATE_BLANK_BASE_PDF,
} from '@/features/pdf-template/lib/pdf-template-defaults';
import type { PdfTemplateInput } from '@/features/pdf-template/types';

export type Alignment = 'left' | 'center' | 'right';
export type ActiveOverlay = 'element' | 'footer' | null;
export type TemplateSchema = Template['schemas'][number][number];

export interface OverlayAnchor {
  pageIndex: number;
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface FloatingOverlayRect {
  top: number;
  left: number;
  width: number;
  maxHeight: number;
}

export type OverlayPlacementMode = 'anchored' | 'manual';

export interface OverlayPanelLayout {
  mode: OverlayPlacementMode;
  rect: FloatingOverlayRect;
}

export interface SelectedElementState {
  key: string;
  label: string;
  schemaName: string;
  type: string;
  content: string;
  boundFieldKey: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate: number;
  opacity: number;
  isEditable: boolean;
  fontSize: number;
  fontColor: string;
  letterSpacing: number;
  isBold: boolean;
  align: Alignment;
  formatHint: string | null;
}

export interface CanvasSchemaHotspot {
  key: string;
  pageIndex: number;
  label: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export const COLLAPSED_PANEL_WIDTH = 64;
export const RESIZE_HANDLE_WIDTH = 10;
export const MIN_LEFT_PANEL_WIDTH = 252;
export const MIN_RIGHT_PANEL_WIDTH = 320;
export const MIN_EDITOR_WIDTH = 840;
export const DEFAULT_GRID_SIZE = 5;
export const MIN_GRID_SIZE = 1;
export const MAX_GRID_SIZE = 40;
export const PDF_PAGE_WIDTH_MM = 210;
export const PDF_PAGE_HEIGHT_MM = 297;
export const LEFT_CANVAS_MARGIN_MM = 20;
export const RIGHT_CANVAS_MARGIN_MM = 20;
export const OVERLAY_VIEWPORT_MARGIN_PX = 16;
export const OVERLAY_ANCHOR_GAP_PX = 12;
export const FOOTER_OVERLAY_MIN_WIDTH_PX = 480;
export const FOOTER_OVERLAY_MAX_WIDTH_PX = 760;
export const FOOTER_OVERLAY_MIN_HEIGHT_PX = 360;
export const ELEMENT_OVERLAY_MIN_WIDTH_PX = 320;
export const ELEMENT_OVERLAY_MAX_WIDTH_PX = 520;
export const ELEMENT_OVERLAY_MIN_HEIGHT_PX = 260;
export const EMPTY_PREVIEW_INPUT: PdfTemplateInput = {};
export const WORKSPACE_BOTTOM_GAP_PX = 1;
export const WORKSPACE_MIN_RESERVED_VIEWPORT_PX = 50;
export const FOOTER_HIGHLIGHT_PADDING_X_MM = 2.5;
export const FOOTER_HIGHLIGHT_PADDING_Y_MM = 1.5;

export function getDefaultOverlayLayout(
  kind: Exclude<ActiveOverlay, null>
): OverlayPanelLayout {
  if (kind === 'footer') {
    return {
      mode: 'anchored',
      rect: {
        top: OVERLAY_VIEWPORT_MARGIN_PX,
        left: OVERLAY_VIEWPORT_MARGIN_PX,
        width: 640,
        maxHeight: 640,
      },
    };
  }

  return {
    mode: 'anchored',
    rect: {
      top: OVERLAY_VIEWPORT_MARGIN_PX,
      left: OVERLAY_VIEWPORT_MARGIN_PX,
      width: 400,
      maxHeight: 420,
    },
  };
}

export function getDockedEditorMinWidth(viewportWidth: number): number {
  if (viewportWidth >= 1680) {
    return MIN_EDITOR_WIDTH;
  }

  if (viewportWidth >= 1440) {
    return 720;
  }

  if (viewportWidth >= 1200) {
    return 600;
  }

  return 460;
}

export function getDesignerPageElementForIndex(
  container: HTMLDivElement | null,
  pageIndex: number
): HTMLDivElement | null {
  return getDesignerPageElements(container)[pageIndex] ?? null;
}

export function getDesignerPageElements(
  container: HTMLDivElement | null
): HTMLDivElement[] {
  return container
    ? Array.from(
        container.querySelectorAll<HTMLDivElement>(
          'div[style*="background-size"][style*="position: relative"]'
        )
      )
    : [];
}

export function buildAnchorViewportRect(
  canvas: HTMLDivElement,
  anchor: OverlayAnchor
): {
  top: number;
  left: number;
  right: number;
  bottom: number;
  width: number;
  height: number;
} {
  const canvasRect = canvas.getBoundingClientRect();
  const top = canvasRect.top + anchor.y;
  const left = canvasRect.left + anchor.x;
  const width = anchor.width;
  const height = anchor.height;

  return {
    top,
    left,
    right: left + width,
    bottom: top + height,
    width,
    height,
  };
}

export function intersectsViewport(
  rect: {
    top: number;
    left: number;
    right: number;
    bottom: number;
  },
  margin: number
): boolean {
  return (
    rect.right > margin &&
    rect.bottom > margin &&
    rect.left < window.innerWidth - margin &&
    rect.top < window.innerHeight - margin
  );
}

export function getHotspotAtPoint(
  hotspots: CanvasSchemaHotspot[],
  clientX: number,
  clientY: number
): CanvasSchemaHotspot | null {
  for (let index = hotspots.length - 1; index >= 0; index -= 1) {
    const hotspot = hotspots[index];
    const right = hotspot.x + hotspot.width;
    const bottom = hotspot.y + hotspot.height;

    if (
      clientX >= hotspot.x &&
      clientX <= right &&
      clientY >= hotspot.y &&
      clientY <= bottom
    ) {
      return hotspot;
    }
  }

  return null;
}

export function estimateFooterContentWidthMm(
  text: string,
  fontSize: number,
  maxWidth: number
): number {
  const longestLineLength = text
    .split('\n')
    .reduce((maxLength, line) => Math.max(maxLength, line.trim().length), 0);

  return Math.max(12, Math.min(maxWidth, longestLineLength * fontSize * 0.23));
}

export function getDraggedFieldKey(
  event: DragEvent<HTMLDivElement>
): string | null {
  const customFieldKey = event.dataTransfer.getData(
    'application/pdf-template-field'
  );

  if (customFieldKey) {
    return customFieldKey;
  }

  const plainFieldKey = event.dataTransfer.getData('text/plain');
  return plainFieldKey || null;
}

export function getSchemaKey(
  schema: TemplateSchema,
  pageIndex: number,
  schemaIndex: number
): string {
  return typeof schema.id === 'string'
    ? schema.id
    : `${pageIndex}:${schemaIndex}:${schema.name}`;
}

export function getElementLabel(
  schema: TemplateSchema,
  schemaIndex: number
): string {
  const content =
    typeof schema.content === 'string'
      ? schema.content.replace(/[{}]/g, '')
      : '';

  return content || schema.name || `Element ${schemaIndex + 1}`;
}

export function parseBoundFieldKey(schema: TemplateSchema): string | null {
  const content = typeof schema.content === 'string' ? schema.content : '';
  const match = content.match(/^\{(.+)\}$/);
  return match ? match[1] : null;
}

export function detectFormatHint(boundFieldKey: string | null): string | null {
  if (!boundFieldKey) {
    return null;
  }

  if (boundFieldKey.includes('datum') || boundFieldKey.includes('zeit')) {
    return 'Datumsformat (automatisch)';
  }

  if (boundFieldKey.includes('preis') || boundFieldKey.includes('betrag')) {
    return 'Währungsformat (automatisch)';
  }

  return 'Standardformat';
}

export function getSchemaAlignment(schema: TemplateSchema): Alignment {
  const centeredX = (PDF_PAGE_WIDTH_MM - schema.width) / 2;
  const rightX = PDF_PAGE_WIDTH_MM - RIGHT_CANVAS_MARGIN_MM - schema.width;

  if (Math.abs(schema.position.x - centeredX) <= 2) {
    return 'center';
  }

  if (Math.abs(schema.position.x - rightX) <= 2) {
    return 'right';
  }

  return 'left';
}

export function buildSelectedElementState(
  template: Template,
  selectedElementKey: string | null
): SelectedElementState | null {
  if (!selectedElementKey) {
    return null;
  }

  for (const [pageIndex, page] of template.schemas.entries()) {
    for (const [schemaIndex, schema] of page.entries()) {
      if (getSchemaKey(schema, pageIndex, schemaIndex) !== selectedElementKey) {
        continue;
      }

      return {
        key: selectedElementKey,
        label: getElementLabel(schema, schemaIndex),
        schemaName: schema.name,
        type: schema.type,
        content: typeof schema.content === 'string' ? schema.content : '',
        boundFieldKey: parseBoundFieldKey(schema),
        x: schema.position.x,
        y: schema.position.y,
        width: schema.width,
        height: schema.height,
        rotate: typeof schema.rotate === 'number' ? schema.rotate : 0,
        opacity: typeof schema.opacity === 'number' ? schema.opacity : 1,
        isEditable: schema.readOnly !== true,
        fontSize: typeof schema.fontSize === 'number' ? schema.fontSize : 11,
        fontColor:
          typeof schema.fontColor === 'string' ? schema.fontColor : '#0f172a',
        letterSpacing:
          typeof schema.lineHeight === 'number' ? schema.lineHeight : 0,
        isBold:
          typeof schema.fontName === 'string'
            ? schema.fontName.toLowerCase().includes('bold')
            : false,
        align: getSchemaAlignment(schema),
        formatHint: detectFormatHint(parseBoundFieldKey(schema)),
      };
    }
  }

  return null;
}

export function getSelectedElementPageIndex(
  template: Template,
  selectedElementKey: string | null
): number | null {
  if (!selectedElementKey) {
    return null;
  }

  for (const [pageIndex, page] of template.schemas.entries()) {
    for (const [schemaIndex, schema] of page.entries()) {
      if (getSchemaKey(schema, pageIndex, schemaIndex) === selectedElementKey) {
        return pageIndex;
      }
    }
  }

  return null;
}

export function compareTemplates(left: Template, right: Template): boolean {
  return JSON.stringify(left) === JSON.stringify(right);
}

export function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function createClientId(prefix: string): string {
  if (
    typeof crypto !== 'undefined' &&
    typeof crypto.randomUUID === 'function'
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

export function normalizeBlankBasePdf(template: Template): Template {
  return isLegacyPdfTemplateBlankBasePdf(template.basePdf)
    ? {
        ...template,
        basePdf: PDF_TEMPLATE_BLANK_BASE_PDF,
      }
    : template;
}

export function sanitizeBaseTemplate(template: Template): Template {
  return stripFooterSchemas(
    applyFooterToTemplate({
      template: normalizeBlankBasePdf(template),
      footer: null,
    })
  );
}
