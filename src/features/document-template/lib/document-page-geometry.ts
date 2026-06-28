export const DOCUMENT_PAGE_WIDTH_PX = 794;
export const DOCUMENT_PAGE_HEIGHT_PX = 1123;

export function getDocumentPageViewport(zoom: number) {
  const scale = zoom / 100;

  return {
    scale,
    width: DOCUMENT_PAGE_WIDTH_PX * scale,
    height: DOCUMENT_PAGE_HEIGHT_PX * scale,
  };
}
