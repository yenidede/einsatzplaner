import type { Dispatch, SetStateAction } from 'react';
import { getDocumentPageViewport } from '@/features/document-template/lib/document-page-geometry';

export function useDocumentTemplateZoom({
  zoom,
  setZoom,
}: {
  zoom: number;
  setZoom: Dispatch<SetStateAction<number>>;
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

  return { pageScaleStyle, pageScaleViewportStyle, setZoom, zoom };
}
