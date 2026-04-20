/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import Link from 'next/link';
import { MultiSelect } from './multi-select';

class ResizeObserverMock {
  observe() {}
  unobserve() {}
  disconnect() {}
}

Object.defineProperty(globalThis, 'ResizeObserver', {
  value: ResizeObserverMock,
});

Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
  value: () => undefined,
});

describe('MultiSelect', () => {
  it('zeigt bei fehlenden Optionen einen benutzerdefinierten Empty-State', () => {
    render(
      <MultiSelect
        options={[]}
        value={[]}
        onValueChange={() => undefined}
        placeholder="Kategorien auswählen"
        emptyState={
          <div>
            <p>Keine Kategorien vorhanden.</p>
            <Link href="/settings/org/test-org#standardfelder">
              Standardfelder öffnen
            </Link>
          </div>
        }
      />
    );

    fireEvent.click(
      screen.getByRole('button', { name: 'Kategorien auswählen' })
    );

    expect(screen.getByText('Keine Kategorien vorhanden.')).toBeTruthy();
    expect(
      screen.getByRole('link', { name: 'Standardfelder öffnen' }).getAttribute(
        'href'
      )
    ).toBe('/settings/org/test-org#standardfelder');
    expect(screen.queryByText('Alle auswählen')).toBeNull();
  });
});
