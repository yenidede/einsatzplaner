/**
 * @vitest-environment jsdom
 */

import { render, screen } from '@testing-library/react';
import type { ImgHTMLAttributes, ReactNode } from 'react';
import { describe, expect, it, vi } from 'vitest';
import SignupPage from './page';

vi.mock('next/image', () => ({
  default: (props: ImgHTMLAttributes<HTMLImageElement>) => (
    <img {...props} alt={props.alt ?? ''} />
  ),
}));

vi.mock('next/link', () => ({
  default: ({
    children,
    href,
  }: {
    children: ReactNode;
    href: string;
  }) => <a href={href}>{children}</a>,
}));

describe('SignupPage', () => {
  it('zeigt keine Self-Serve-Signup-Implementierung mehr an', () => {
    render(<SignupPage />);

    const heading = screen.getByRole('heading', {
      name: 'Die Selbstregistrierung ist derzeit nicht verfuegbar',
    });
    const link = screen.getByRole('link', {
      name: 'Zur Anmeldung',
    });

    expect(heading).toBeTruthy();
    expect(link.getAttribute('href')).toBe('/signin');
    expect(screen.queryByText('Organisation anlegen')).toBeNull();
  });
});
