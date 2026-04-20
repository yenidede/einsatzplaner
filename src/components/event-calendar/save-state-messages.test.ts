import { describe, expect, it } from 'vitest';
import {
  getSavingToastMessage,
  getSavingTooltipText,
} from './save-state-messages';

describe('save-state-messages', () => {
  it('trimmt den Label-Namen und fällt bei Leerwerten auf Einsatz zurück', () => {
    expect(getSavingToastMessage('  Schicht  ')).toBe(
      'Schicht wird gerade gespeichert. Bitte warten Sie einen Moment, bevor der Eintrag geöffnet wird.'
    );
    expect(getSavingTooltipText('   ')).toBe('Einsatz wird gespeichert. Bitte warten Sie.');
  });
});
