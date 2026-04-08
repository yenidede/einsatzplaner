/**
 * @vitest-environment jsdom
 */

import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { OTPCustom } from '@/components/OTPCustom';

describe('OTPCustom', () => {
  it('übernimmt manuelle Zifferneingaben feldweise', () => {
    const handleChange = vi.fn();

    render(<OTPCustom value="" onChange={handleChange} />);

    const inputs = screen.getAllByRole('textbox');

    fireEvent.change(inputs[0]!, { target: { value: '1' } });
    fireEvent.change(inputs[1]!, { target: { value: '2' } });

    expect(handleChange).toHaveBeenNthCalledWith(1, '1');
    expect(handleChange).toHaveBeenNthCalledWith(2, '2');
  });

  it('übernimmt eingefügten Code auf mehrere Felder', () => {
    const handleChange = vi.fn();

    render(<OTPCustom value="" onChange={handleChange} />);

    const inputs = screen.getAllByRole('textbox');

    fireEvent.paste(inputs[0]!, {
      clipboardData: {
        getData: () => '123456',
      },
    });

    expect(handleChange).toHaveBeenCalledWith('123456');
  });

  it('zeigt manuell eingegebene Ziffern sichtbar in den Slots an', () => {
    function Wrapper() {
      const [value, setValue] = useState('');

      return <OTPCustom value={value} onChange={setValue} />;
    }

    render(<Wrapper />);

    const inputs = screen.getAllByRole('textbox');

    fireEvent.change(inputs[0]!, { target: { value: '1' } });
    fireEvent.change(inputs[1]!, { target: { value: '2' } });

    expect((inputs[0] as HTMLInputElement).value).toBe('1');
    expect((inputs[1] as HTMLInputElement).value).toBe('2');
  });
});
