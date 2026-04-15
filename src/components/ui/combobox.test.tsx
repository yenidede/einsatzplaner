/**
 * @vitest-environment jsdom
 */

import { afterEach, describe, expect, it } from 'vitest';
import { render, within } from '@testing-library/react';
import {
  Combobox,
  ComboboxContent,
  ComboboxItem,
  ComboboxList,
} from './combobox';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('Combobox', () => {
  it('rendert das Popup in den angegebenen Container', () => {
    const portalContainer = document.createElement('div');
    document.body.appendChild(portalContainer);

    render(
      <Combobox items={['Status']} open onOpenChange={() => undefined}>
        <ComboboxContent container={portalContainer}>
          <ComboboxList>
            {(item) => <ComboboxItem value={item}>{item}</ComboboxItem>}
          </ComboboxList>
        </ComboboxContent>
      </Combobox>
    );

    expect(within(portalContainer).getByText('Status')).toBeTruthy();
  });
});
