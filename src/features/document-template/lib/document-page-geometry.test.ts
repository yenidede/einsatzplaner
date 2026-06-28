import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_PAGE_HEIGHT_PX,
  DOCUMENT_PAGE_WIDTH_PX,
  getDocumentPageViewport,
} from './document-page-geometry';

describe('getDocumentPageViewport', () => {
  it.each([
    { zoom: 75, width: 595.5, height: 842.25 },
    { zoom: 100, width: 794, height: 1123 },
    { zoom: 125, width: 992.5, height: 1403.75 },
  ])('skaliert bei $zoom Prozent nur den Viewport', (expected) => {
    expect(getDocumentPageViewport(expected.zoom)).toEqual({
      scale: expected.zoom / 100,
      width: expected.width,
      height: expected.height,
    });
    expect(DOCUMENT_PAGE_WIDTH_PX).toBe(794);
    expect(DOCUMENT_PAGE_HEIGHT_PX).toBe(1123);
  });
});
