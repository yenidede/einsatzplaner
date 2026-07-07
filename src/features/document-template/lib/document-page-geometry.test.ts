import { describe, expect, it } from 'vitest';
import {
  DOCUMENT_PAGE_HEIGHT_PX,
  DOCUMENT_PAGE_WIDTH_PX,
  getAvailableContentHeightMm,
  getActivePageAreaHeights,
  getDocumentPageViewport,
  getDocumentPageLayout,
  mmToPx,
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

describe('getDocumentPageLayout', () => {
  it('zieht Ränder sowie nur aktivierte Kopf- und Fußbereiche einmal ab', () => {
    const layout = getDocumentPageLayout({
      format: 'A4',
      orientation: 'portrait',
      margins: { top: 10, right: 15, bottom: 10, left: 15 },
      header: { enabled: true, height: 18, showOn: 'allPages', blocks: [] },
      footer: { enabled: false, height: 14, showOn: 'allPages', blocks: [] },
    });

    expect(layout.contentWidth).toBe(
      DOCUMENT_PAGE_WIDTH_PX - mmToPx(15) - mmToPx(15)
    );
    expect(layout.contentHeight).toBe(mmToPx(259));
    expect(layout.footerHeight).toBe(0);
  });

  it('reserviert für deaktivierte Kopf- und Fußbereiche keinen Platz', () => {
    const page = {
      format: 'A4' as const,
      orientation: 'portrait' as const,
      margins: { top: 10, right: 15, bottom: 10, left: 15 },
      header: {
        enabled: false,
        height: 18,
        showOn: 'allPages' as const,
        blocks: [],
      },
      footer: {
        enabled: false,
        height: 14,
        showOn: 'allPages' as const,
        blocks: [],
      },
    };

    expect(getActivePageAreaHeights(page)).toEqual({
      headerHeight: 0,
      footerHeight: 0,
    });
    expect(getAvailableContentHeightMm(page)).toBe(277);
    expect(getDocumentPageLayout(page).contentHeight).toBe(mmToPx(277));
  });
});

describe('mmToPx', () => {
  it('konvertiert Millimeter zu Editor-Pixeln anhand der A4-Breite', () => {
    expect(mmToPx(210)).toBe(DOCUMENT_PAGE_WIDTH_PX);
    expect(mmToPx(42)).toBe(Math.round((42 * DOCUMENT_PAGE_WIDTH_PX) / 210));
  });
});
