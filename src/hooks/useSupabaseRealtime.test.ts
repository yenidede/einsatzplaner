import { describe, expect, it } from 'vitest';

import {
  composeRealtimeEventTitle,
  parseSupabaseRealtimeTimestamp,
} from './useSupabaseRealtime.utils';

describe('composeRealtimeEventTitle', () => {
  it('keeps the existing title when no new base title is provided', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC)',
      })
    ).toBe('Alt (ABC)');
  });

  it('rebuilds title with category abbreviations when available', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC)',
        nextBaseTitle: 'Neu',
        categoryAbbreviations: ['ABC', 'DEF'],
      })
    ).toBe('Neu (ABC, DEF)');
  });

  it('verwendet bei vorhandener Suffix-Basis nicht doppelt die Kategorien', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC)',
        nextBaseTitle: 'Alt (ABC)',
        categoryAbbreviations: ['ABC'],
      })
    ).toBe('Alt (ABC)');
  });

  it('preserves trailing suffix from existing title when categories are not loaded', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC, DEF)',
        nextBaseTitle: 'Neu',
      })
    ).toBe('Neu (ABC, DEF)');
  });

  it('verwendet bei explizit leerer Kategorienliste nur den neuen Basis-Titel', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC, DEF)',
        nextBaseTitle: 'Neu',
        categoryAbbreviations: [],
      })
    ).toBe('Neu');
  });

  it('verwendet bei nur leerzeichenhaltigen Kategorien ebenfalls nur den Basis-Titel', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC, DEF)',
        nextBaseTitle: 'Neu',
        categoryAbbreviations: ['   '],
      })
    ).toBe('Neu');
  });

  it('liefert einen leeren String, wenn der neue Basis-Titel leer ist', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC)',
        nextBaseTitle: '',
      })
    ).toBe('');
  });

  it('uses only the base title when no category suffix exists', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt',
        nextBaseTitle: 'Neu',
      })
    ).toBe('Neu');
  });
});

describe('parseSupabaseRealtimeTimestamp', () => {
  it('interpretiert Zeitstempel ohne Zeitzone als lokale Wandzeit', () => {
    const parsed = parseSupabaseRealtimeTimestamp('2026-05-08 13:00:00');

    expect(parsed).toBeDefined();
    expect(parsed?.getFullYear()).toBe(2026);
    expect(parsed?.getMonth()).toBe(4);
    expect(parsed?.getDate()).toBe(8);
    expect(parsed?.getHours()).toBe(13);
    expect(parsed?.getMinutes()).toBe(0);
    expect(parsed?.getSeconds()).toBe(0);
  });

  it('interpretiert Zeitstempel mit Mikrosekunden ohne Zeitzone als lokale Wandzeit', () => {
    const parsed = parseSupabaseRealtimeTimestamp(
      '2026-05-08 13:00:00.123456'
    );

    expect(parsed).toBeDefined();
    expect(parsed?.getHours()).toBe(13);
    expect(parsed?.getMinutes()).toBe(0);
    expect(parsed?.getSeconds()).toBe(0);
    expect(parsed?.getMilliseconds()).toBe(123);
  });

  it('ignoriert ein Z-Suffix und behält die Wandzeit', () => {
    const parsed = parseSupabaseRealtimeTimestamp('2026-05-08T13:00:00.000Z');

    expect(parsed).toBeDefined();
    expect(parsed?.getHours()).toBe(13);
    expect(parsed?.getMinutes()).toBe(0);
  });

  it('ignoriert ein Offset-Suffix und behält die Wandzeit', () => {
    const parsed = parseSupabaseRealtimeTimestamp('2026-05-08T13:00:00+02:00');

    expect(parsed).toBeDefined();
    expect(parsed?.getHours()).toBe(13);
    expect(parsed?.getMinutes()).toBe(0);
  });
});
