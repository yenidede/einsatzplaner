import { useEffect, type RefObject } from 'react';
import {
  A4_EDITOR_HEIGHT_PX,
  A4_EDITOR_WIDTH_PX,
} from '../utils/documentTemplateLayoutUtils';

export function useDocumentTemplateDebug({
  bodyAreaHeightPx,
  leftSidebarCollapsed,
  leftSidebarWidth,
  pageContentWidthPx,
  pageStackRef,
  rightSidebarCollapsed,
  rightSidebarWidth,
  zoom,
}: {
  bodyAreaHeightPx: number;
  leftSidebarCollapsed: boolean;
  leftSidebarWidth: number;
  pageContentWidthPx: number;
  pageStackRef: RefObject<HTMLDivElement | null>;
  rightSidebarCollapsed: boolean;
  rightSidebarWidth: number;
  zoom: number;
}) {
  useEffect(() => {
    if (process.env.NODE_ENV !== 'development') return;

    let frame: number | null = null;
    const logPageLayout = () => {
      if (frame !== null) window.cancelAnimationFrame(frame);

      frame = window.requestAnimationFrame(() => {
        frame = null;
        const pageElement =
          pageStackRef.current?.querySelector<HTMLElement>('.document-page');
        const bodyElement =
          pageElement?.querySelector<HTMLElement>('.document-page-body');
        const proseMirrorElement =
          bodyElement?.querySelector<HTMLElement>('.ProseMirror');
        const headingElement =
          proseMirrorElement?.querySelector<HTMLElement>('h1, h2');

        if (!pageElement || !bodyElement || !proseMirrorElement) return;

        console.debug('[page-layout]', {
          browserZoomApprox: window.devicePixelRatio,
          viewportWidth: window.innerWidth,
          visualViewportWidth: window.visualViewport?.width ?? null,
          editorZoom: zoom,
          pageWidthPx: A4_EDITOR_WIDTH_PX,
          pageHeightPx: A4_EDITOR_HEIGHT_PX,
          bodyWidthPx: pageContentWidthPx,
          bodyHeightPx: bodyAreaHeightPx,
          pageClientWidth: pageElement.clientWidth,
          bodyClientWidth: bodyElement.clientWidth,
          proseMirrorClientWidth: proseMirrorElement.clientWidth,
          headingFontSizePx: headingElement
            ? window.getComputedStyle(headingElement).fontSize
            : null,
        });
      });
    };

    logPageLayout();
    window.addEventListener('resize', logPageLayout);
    window.visualViewport?.addEventListener('resize', logPageLayout);

    return () => {
      if (frame !== null) window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', logPageLayout);
      window.visualViewport?.removeEventListener('resize', logPageLayout);
    };
  }, [
    bodyAreaHeightPx,
    leftSidebarCollapsed,
    leftSidebarWidth,
    pageContentWidthPx,
    pageStackRef,
    rightSidebarCollapsed,
    rightSidebarWidth,
    zoom,
  ]);
}
