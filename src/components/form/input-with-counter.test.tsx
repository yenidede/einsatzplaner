/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { InputWithCounter } from './input-with-counter';

describe('InputWithCounter', () => {
  it('zeigt die aktuelle Zeichenanzahl rechts im Eingabefeld an', () => {
    render(
      <InputWithCounter
        currentLength={12}
        maxLength={20}
        placeholder="Beschreibung"
      />
    );

    expect(screen.getByText('12/20')).toBeTruthy();
  });

  it('zeigt den Fehlerzustand und die Fehlermeldung an', () => {
    render(
      <InputWithCounter
        currentLength={20}
        maxLength={20}
        errorMessage="Die Beschreibung darf höchstens 20 Zeichen lang sein."
      />
    );

    expect(screen.getByText('Die Beschreibung darf höchstens 20 Zeichen lang sein.')).toBeTruthy();
  });
});
