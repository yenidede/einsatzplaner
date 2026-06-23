/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SignupPage from './page';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}));

vi.mock('@/features/auth/self-signup/SelfSignupForm', () => ({
  SelfSignupForm: () => <div>Dynamisches Anmeldeformular</div>,
}));

describe('SignupPage', () => {
  it('zeigt das neue Self-Signup-Layout mit Bild und Formular', () => {
    render(<SignupPage />);

    expect(screen.getByText('Dynamisches Anmeldeformular')).toBeTruthy();
    expect(
      screen.getByAltText('Sehr schönes Museum mit altem Gemälde')
    ).toBeTruthy();
  });
});
