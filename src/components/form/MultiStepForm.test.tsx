/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { FormHeader, MultiStepFormProvider } from './MultiStepForm';

describe('FormHeader', () => {
  it('blendet Step-Texte nur auf sehr kleinen Mobile-Screens aus', () => {
    render(
      <MultiStepFormProvider
        stepsFields={[
          {
            fields: [],
            component: <div>Schritt 1</div>,
            title: 'Ihre Angaben',
          },
          {
            fields: [],
            component: <div>Schritt 2</div>,
            title: 'Verifizierung',
          },
        ]}
      >
        <FormHeader />
      </MultiStepFormProvider>
    );

    const activeLabel = screen.getByText('Ihre Angaben').closest('div');
    const inactiveLabel = screen
      .getByText('Verifizierung')
      .closest('div');

    expect(activeLabel?.className).toContain('flex');
    expect(activeLabel?.className).toContain('max-[479px]:hidden');

    expect(inactiveLabel?.className).toContain('flex');
    expect(inactiveLabel?.className).toContain('max-[479px]:hidden');
  });
});
