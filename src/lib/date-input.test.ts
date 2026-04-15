import { describe, expect, it } from 'vitest';

import {
  formatDateInputDisplay,
  formatDateInputValue,
  parseDateInputText,
  parseDateRangeInputText,
} from './date-input';

describe('date-input utils', () => {
  it('parst kurze und kompakte Datumsangaben', () => {
    const shortDate = parseDateInputText('1.4.26');
    const compactDate = parseDateInputText('01042026');
    const shortNoYearDate = parseDateInputText('1202');
    const currentYear = new Date().getFullYear();

    expect(shortDate).toBeDefined();
    expect(shortDate?.getFullYear()).toBe(2026);
    expect(shortDate?.getMonth()).toBe(3);
    expect(shortDate?.getDate()).toBe(1);

    expect(compactDate).toBeDefined();
    expect(compactDate?.getFullYear()).toBe(2026);
    expect(compactDate?.getMonth()).toBe(3);
    expect(compactDate?.getDate()).toBe(1);

    expect(shortNoYearDate).toBeDefined();
    expect(shortNoYearDate?.getFullYear()).toBe(currentYear);
    expect(shortNoYearDate?.getMonth()).toBe(1);
    expect(shortNoYearDate?.getDate()).toBe(12);
  });

  it('parst deutsches Langformat', () => {
    const parsed = parseDateInputText('1. April 2026');

    expect(parsed).toBeDefined();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(3);
    expect(parsed?.getDate()).toBe(1);
  });

  it('parst Bereiche und einzelne Werte im Range-Modus', () => {
    const parsedRange = parseDateRangeInputText('1.4.26 - 5.4.26');
    const parsedSingle = parseDateRangeInputText('01042026');
    const parsedShortRange = parseDateRangeInputText('1202-2002');
    const currentYear = new Date().getFullYear();

    expect(parsedRange).toBeDefined();
    expect(parsedRange?.from.getDate()).toBe(1);
    expect(parsedRange?.to.getDate()).toBe(5);

    expect(parsedSingle).toBeDefined();
    expect(parsedSingle?.from.getDate()).toBe(1);
    expect(parsedSingle?.to.getDate()).toBe(1);

    expect(parsedShortRange).toBeDefined();
    expect(parsedShortRange?.from.getFullYear()).toBe(currentYear);
    expect(parsedShortRange?.from.getMonth()).toBe(1);
    expect(parsedShortRange?.from.getDate()).toBe(12);
    expect(parsedShortRange?.to.getFullYear()).toBe(currentYear);
    expect(parsedShortRange?.to.getMonth()).toBe(1);
    expect(parsedShortRange?.to.getDate()).toBe(20);
  });

  it('formatiert als deutsches Langformat und ISO-Wert', () => {
    const date = new Date(2026, 3, 1);

    expect(formatDateInputDisplay(date)).toBe('1. April 2026');
    expect(formatDateInputValue(date)).toBe('2026-04-01');
  });
});
