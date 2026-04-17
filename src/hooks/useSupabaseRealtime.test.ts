import { describe, expect, it } from 'vitest';

import { composeRealtimeEventTitle } from './useSupabaseRealtime.utils';

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

  it('preserves trailing suffix from existing title when categories are not loaded', () => {
    expect(
      composeRealtimeEventTitle({
        existingTitle: 'Alt (ABC, DEF)',
        nextBaseTitle: 'Neu',
      })
    ).toBe('Neu (ABC, DEF)');
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
