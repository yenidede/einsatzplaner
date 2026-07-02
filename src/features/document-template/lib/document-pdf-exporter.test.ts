import { describe, expect, it } from 'vitest';
import {
  documentFontFamilyToPdfFont,
  millimetersToPdfPoints,
  pixelsToPdfPoints,
} from './document-pdf-exporter';

describe('millimetersToPdfPoints', () => {
  it('rechnet Seiteneinstellungen von Millimetern in PDF-Punkte um', () => {
    expect(millimetersToPdfPoints(25.4)).toBeCloseTo(72);
    expect(millimetersToPdfPoints(20)).toBeCloseTo(56.69, 2);
    expect(millimetersToPdfPoints(18)).toBeCloseTo(51.02, 2);
  });
});

describe('pixelsToPdfPoints', () => {
  it('hält die physische Bildgröße zwischen CSS-Pixeln und PDF-Punkten konsistent', () => {
    expect(pixelsToPdfPoints(96)).toBe(72);
    expect(pixelsToPdfPoints(240)).toBe(180);
  });
});

describe('documentFontFamilyToPdfFont', () => {
  it('bildet auswählbare Schriften auf verfügbare PDF-Schriften ab', () => {
    expect(documentFontFamilyToPdfFont('Arial')).toBe('Helvetica');
    expect(documentFontFamilyToPdfFont('Times New Roman')).toBe('Times-Roman');
    expect(documentFontFamilyToPdfFont('Courier New')).toBe('Courier');
  });
});
