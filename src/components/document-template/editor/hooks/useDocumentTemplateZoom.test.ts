import { describe, expect, it } from 'vitest';
import { calculatePageWidthZoom } from './useDocumentTemplateZoom';

describe('Dokumentvorlagen-Zoom', () => {
  it('berechnet den Zoom aus der verfügbaren Canvas-Breite', () => {
    expect(calculatePageWidthZoom(842)).toBe(100);
    expect(calculatePageWidthZoom(1_000)).toBe(119);
  });

  it('begrenzt den Zoom auf den unterstützten Bereich', () => {
    expect(calculatePageWidthZoom(300)).toBe(50);
    expect(calculatePageWidthZoom(2_000)).toBe(150);
  });
});
