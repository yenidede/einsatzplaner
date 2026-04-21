import { describe, expect, it } from 'vitest';

import { collectLockedEventIds } from './locked-event-ids';

describe('collectLockedEventIds', () => {
  it('sammelt gesperrte IDs aus Detail- und Kalenderdaten ohne Duplikate', () => {
    expect(
      collectLockedEventIds({
        detailedEinsaetze: [
          { id: 'einsatz-1', isLocked: true },
          { id: 'einsatz-2', isLocked: false },
        ],
        events: [
          { id: 'einsatz-2', isLocked: true },
          { id: 'einsatz-3', isLocked: true },
        ],
      })
    ).toEqual(['einsatz-1', 'einsatz-2', 'einsatz-3']);
  });

  it('liefert ein leeres Array ohne gesperrte Einträge', () => {
    expect(collectLockedEventIds({ detailedEinsaetze: [], events: [] })).toEqual(
      []
    );
  });
});
