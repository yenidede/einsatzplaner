/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it } from 'vitest';
import { MultiStepFormProvider, useMultiStepForm } from './useMultiStepForm';

function NextStepButton() {
  const { goToNext } = useMultiStepForm();

  return (
    <button
      type="button"
      onClick={() => {
        void goToNext();
      }}
    >
      Weiter
    </button>
  );
}

function StepContent() {
  const { currentStepData } = useMultiStepForm();

  return <div>{currentStepData.component}</div>;
}

describe('MultiStepFormProvider', () => {
  it('aktualisiert Step-Komponenten bei Parent-Re-Renders', () => {
    function Wrapper() {
      const [code, setCode] = useState('');

      return (
        <>
          <button
            type="button"
            onClick={() => {
              setCode('123');
            }}
          >
            Code setzen
          </button>
          <MultiStepFormProvider
            stepsFields={[
              {
                fields: [],
                component: <div>Schritt 1</div>,
              },
              {
                fields: [],
                component: <div>Code: {code}</div>,
              },
            ]}
          >
            <NextStepButton />
            <StepContent />
          </MultiStepFormProvider>
        </>
      );
    }

    render(<Wrapper />);

    fireEvent.click(screen.getByRole('button', { name: 'Weiter' }));
    expect(screen.getByText('Code:')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Code setzen' }));
    expect(screen.getByText('Code: 123')).toBeTruthy();
  });
});
