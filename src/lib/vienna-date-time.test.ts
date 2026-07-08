import { describe, expect, it } from 'vitest';
import {
  viennaDocumentDateFormatter,
  viennaDocumentTimeFormatter,
} from './vienna-date-time';

describe('Dokumentzeiten in Europe/Vienna', () => {
  it('formatiert Sommerzeit mit UTC+2', () => {
    const start = new Date('2026-07-08T07:00:00.000Z');

    expect(viennaDocumentDateFormatter.format(start)).toBe('08.07.2026');
    expect(viennaDocumentTimeFormatter.format(start)).toBe('09:00');
  });

  it('formatiert Winterzeit mit UTC+1', () => {
    const start = new Date('2026-01-08T08:00:00.000Z');

    expect(viennaDocumentDateFormatter.format(start)).toBe('08.01.2026');
    expect(viennaDocumentTimeFormatter.format(start)).toBe('09:00');
  });
});
