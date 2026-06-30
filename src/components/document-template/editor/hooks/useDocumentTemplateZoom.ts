import type { Dispatch, RefObject, SetStateAction } from 'react';
import {
  DOCUMENT_PAGE_WIDTH_PX,
  getDocumentPageViewport,
} from '@/features/document-template/lib/document-page-geometry';

const CANVAS_HORIZONTAL_PADDING_PX = 48;
const MIN_ZOOM = 50;
const MAX_ZOOM = 150;

export function calculatePageWidthZoom(viewportWidth: number): number {
  const availableWidth = Math.max(
    0,
    viewportWidth - CANVAS_HORIZONTAL_PADDING_PX
  );
  const zoom = Math.floor((availableWidth / DOCUMENT_PAGE_WIDTH_PX) * 100);
  return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));
}

export function useDocumentTemplateZoom({
  zoom,
  setZoom,
  canvasViewportRef,
}: {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
  canvasViewportRef: RefObject<HTMLElement | null>;
}) {
  function pageScaleStyle() {
    return {
      transform: `scale(${zoom / 100})`,
      transformOrigin: 'top left',
    };
  }

  function pageScaleViewportStyle() {
    const viewport = getDocumentPageViewport(zoom);
    return {
      width: viewport.width,
      minWidth: viewport.width,
      maxWidth: viewport.width,
      height: viewport.height,
      minHeight: viewport.height,
      maxHeight: viewport.height,
    };
  }

  function fitPageWidth() {
    const viewportWidth = canvasViewportRef.current?.clientWidth;
    if (!viewportWidth) return;

    setZoom(calculatePageWidthZoom(viewportWidth));
  }

  return {
    fitPageWidth,
    pageScaleStyle,
    pageScaleViewportStyle,
    setZoom,
    zoom,
  };
}
