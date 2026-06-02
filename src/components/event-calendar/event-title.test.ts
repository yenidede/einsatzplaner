import { describe, expect, it } from 'vitest';
import { composeCalendarEventTitle } from './event-title';

describe('composeCalendarEventTitle', () => {
  it('hängt Kategorie-Kürzel an den Einsatztitel an', () => {
    expect(composeCalendarEventTitle('Führung', ['DA', 'VA'])).toBe(
      'Führung (DA, VA)'
    );
  });

  it('verwendet ohne Kategorien nur den Einsatztitel', () => {
    expect(composeCalendarEventTitle('Führung', [])).toBe('Führung');
  });

  it('hängt weitere Informationen als eigene Segmente an', () => {
    expect(composeCalendarEventTitle('Führung', ['DA', 'VA'], '1/2')).toBe(
      'Führung (DA, VA) (1/2)'
    );
  });

  it('bildet leere Kürzel exakt wie der In-App-Kalender ab', () => {
    expect(composeCalendarEventTitle('Führung', [''])).toBe('Führung ()');
  });
});
