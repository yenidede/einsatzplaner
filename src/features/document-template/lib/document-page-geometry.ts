import type { DocumentTemplatePageSettings } from '../types';

export const DOCUMENT_PAGE_WIDTH_PX = 794;
export const DOCUMENT_PAGE_HEIGHT_PX = 1123;
export const MM_TO_EDITOR_PX = DOCUMENT_PAGE_WIDTH_PX / 210;

export function mmToPx(value: number): number {
  return Math.round(value * MM_TO_EDITOR_PX);
}

export function millimetersToPdfPoints(value: number): number {
  return (value * 72) / 25.4;
}

export function pixelsToPdfPoints(value: number): number {
  return (value * 72) / 96;
}

export function getActivePageAreaHeights(page: DocumentTemplatePageSettings) {
  return {
    headerHeight: page.header.enabled ? page.header.height : 0,
    footerHeight: page.footer.enabled ? page.footer.height : 0,
  };
}

export function getAvailableContentHeightMm(
  page: DocumentTemplatePageSettings
): number {
  const { headerHeight, footerHeight } = getActivePageAreaHeights(page);
  return Math.max(
    0,
    297 -
      page.margins.top -
      page.margins.bottom -
      headerHeight -
      footerHeight
  );
}

export function getDocumentPageLayout(page: DocumentTemplatePageSettings) {
  const activeAreas = getActivePageAreaHeights(page);
  const marginTop = mmToPx(page.margins.top);
  const marginRight = mmToPx(page.margins.right);
  const marginBottom = mmToPx(page.margins.bottom);
  const marginLeft = mmToPx(page.margins.left);
  const headerHeight = mmToPx(activeAreas.headerHeight);
  const footerHeight = mmToPx(activeAreas.footerHeight);

  return {
    marginTop,
    marginRight,
    marginBottom,
    marginLeft,
    headerHeight,
    footerHeight,
    contentWidth: Math.max(0, DOCUMENT_PAGE_WIDTH_PX - marginLeft - marginRight),
    contentHeight: mmToPx(getAvailableContentHeightMm(page)),
  };
}

export function getDocumentPageViewport(zoom: number) {
  const scale = zoom / 100;

  return {
    scale,
    width: DOCUMENT_PAGE_WIDTH_PX * scale,
    height: DOCUMENT_PAGE_HEIGHT_PX * scale,
  };
}
