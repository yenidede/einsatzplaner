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

export function getDocumentPageViewport(zoom: number) {
  const scale = zoom / 100;

  return {
    scale,
    width: DOCUMENT_PAGE_WIDTH_PX * scale,
    height: DOCUMENT_PAGE_HEIGHT_PX * scale,
  };
}
